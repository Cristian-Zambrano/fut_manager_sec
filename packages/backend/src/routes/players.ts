import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { requireRole } from '../middleware/auth'
import { logAuditAction } from '../middleware/audit'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'

const playerRoutes = new Hono<{ Bindings: Env, Variables: AuthContext }>()

// Validation schemas
const createPlayerSchema = z.object({
  name: z.string().min(2).max(50),
  surname: z.string().min(2).max(50),
  team_id: z.string().uuid(),
  position: z.string().optional(),
  jersey_number: z.number().min(1).max(99).optional()
})

const updatePlayerSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  surname: z.string().min(2).max(50).optional(),
  team_id: z.string().uuid().optional(),
  position: z.string().optional(),
  jersey_number: z.number().min(1).max(99).optional(),
  verified: z.boolean().optional()
})

// Get all players - Role-based filtering (S-04, S-05, S-06, S-07)
playerRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')
    
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    let query = supabase
      .from('players')
      .select(`
        *,
        team:teams!players_team_id_fkey(
          id,
          name,
          verified,
          owner_id,
          owner:user_profiles!teams_owner_id_fkey(full_name, email)
        ),
        sanctions:sanctions(*)
      `)

    // Apply role-based filtering (S-04, S-05)
    if (user.role === 'team_owner') {
      // Team owners can only see players from their own teams
      const { data: userTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id)
      
      if (userTeams && userTeams.length > 0) {
        const teamIds = userTeams.map(team => team.id)
        query = query.in('team_id', teamIds)
      } else {
        // No teams owned, return empty
        return c.json({ 
          players: [], 
          user_role: user.role,
          message: 'No players found - you don\'t own any teams'
        })
      }
    } else if (user.role === 'vocal') {
      // Vocals can see players from verified teams only
      query = query.eq('teams.verified', true).eq('verified', true)
    }
    // Admins can see all players (no additional filter)

    const { data: players, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching players:', error)
      return c.json({ error: 'Failed to fetch players' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'VIEW_PLAYERS', 'players', undefined, { count: players?.length || 0 })

    return c.json({ 
      players: players || [],
      user_role: user.role,
      message: 'Players retrieved successfully'
    })
  } catch (error) {
    console.error('Players fetch error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get specific player by ID
playerRoutes.get('/:id', async (c) => {
  try {
    const playerId = c.req.param('id')
    const user = c.get('user')
    
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    let query = supabase
      .from('players')
      .select(`
        *,
        team:teams!players_team_id_fkey(
          id,
          name,
          verified,
          owner_id,
          owner:user_profiles!teams_owner_id_fkey(full_name, email)
        ),
        sanctions:sanctions(*)
      `)
      .eq('id', playerId)

    // Apply role-based access control (S-04, S-17)
    if (user.role === 'team_owner') {
      // Team owners can only see players from their own teams
      const { data: userTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      
      if (userTeam) {
        query = query.eq('team_id', userTeam.id)
      } else {
        return c.json({ error: 'Player not found or access denied' }, 404)
      }
    } else if (user.role === 'vocal') {
      query = query.eq('teams.verified', true).eq('verified', true)
    }

    const { data: player, error } = await query.single()

    if (error) {
      console.error('Error fetching player:', error)
      return c.json({ error: 'Player not found or access denied' }, 404)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'VIEW_PLAYER_DETAIL', 'players', playerId)

    return c.json({ 
      player,
      message: 'Player details retrieved successfully'
    })
  } catch (error) {
    console.error('Player detail fetch error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create player - Admin only (S-06, S-07)
playerRoutes.post('/', requireRole(['admin']), async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { name, surname, team_id, position, jersey_number } = createPlayerSchema.parse(body)
    
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', team_id)
      .single()

    if (teamError || !team) {
      return c.json({ error: 'Team not found' }, 400)
    }

    // Check jersey number uniqueness within team (if provided)
    if (jersey_number) {
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('team_id', team_id)
        .eq('jersey_number', jersey_number)
        .single()

      if (existingPlayer) {
        return c.json({ error: 'Jersey number already taken in this team' }, 400)
      }
    }

    // Create the player
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        name,
        surname,
        team_id,
        position: position || '',
        jersey_number,
        verified: false // Players need admin verification
      })
      .select(`
        *,
        team:teams!players_team_id_fkey(id, name)
      `)
      .single()

    if (error) {
      console.error('Error creating player:', error)
      return c.json({ error: 'Failed to create player' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'CREATE_PLAYER', 'players', player.id, { 
      name, 
      surname, 
      team_id, 
      position, 
      jersey_number 
    })

    return c.json({
      message: 'Player created successfully. Awaiting verification.',
      player
    })
  } catch (error) {
    console.error('Player creation error:', error)
    return c.json({ error: 'Player creation failed' }, 400)
  }
})

// Update player - Admin only (S-04, S-07, S-17)
playerRoutes.put('/:id', requireRole(['admin']), async (c) => {
  try {
    const playerId = c.req.param('id')
    const body = await c.req.json()
    const updateData = updatePlayerSchema.parse(body)
    
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get player to check existence
    const { data: existingPlayer, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (fetchError || !existingPlayer) {
      return c.json({ error: 'Player not found' }, 404)
    }

    // If updating team, verify it exists
    if (updateData.team_id) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('id', updateData.team_id)
        .single()

      if (teamError || !team) {
        return c.json({ error: 'Team not found' }, 400)
      }
    }

    // Check jersey number uniqueness if updating
    if (updateData.jersey_number && updateData.team_id) {
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('team_id', updateData.team_id)
        .eq('jersey_number', updateData.jersey_number)
        .neq('id', playerId)
        .single()

      if (existingPlayer) {
        return c.json({ error: 'Jersey number already taken in this team' }, 400)
      }
    }

    // Update the player
    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', playerId)
      .select(`
        *,
        team:teams!players_team_id_fkey(id, name)
      `)
      .single()

    if (error) {
      console.error('Error updating player:', error)
      return c.json({ error: 'Failed to update player' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'UPDATE_PLAYER', 'players', playerId, updateData)

    return c.json({
      message: 'Player updated successfully',
      player: updatedPlayer
    })
  } catch (error) {
    console.error('Player update error:', error)
    return c.json({ error: 'Player update failed' }, 400)
  }
})

// Delete player - Admin only (S-06, S-07)
playerRoutes.delete('/:id', requireRole(['admin']), async (c) => {
  try {
    const playerId = c.req.param('id')
    
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if player exists
    const { data: existingPlayer, error: fetchError } = await supabase
      .from('players')
      .select('name, surname')
      .eq('id', playerId)
      .single()

    if (fetchError || !existingPlayer) {
      return c.json({ error: 'Player not found' }, 404)
    }

    // Delete the player (cascades to sanctions)
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) {
      console.error('Error deleting player:', error)
      return c.json({ error: 'Failed to delete player' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'DELETE_PLAYER', 'players', playerId, { 
      player_name: `${existingPlayer.name} ${existingPlayer.surname}` 
    })

    return c.json({
      message: 'Player deleted successfully'
    })
  } catch (error) {
    console.error('Player deletion error:', error)
    return c.json({ error: 'Player deletion failed' }, 400)
  }
})

// Verify player - Admin only (S-06, S-07)
playerRoutes.patch('/:id/verify', requireRole(['admin']), async (c) => {
  try {
    const playerId = c.req.param('id')
    
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: player, error } = await supabase
      .from('players')
      .update({ verified: true })
      .eq('id', playerId)
      .select(`
        *,
        team:teams!players_team_id_fkey(id, name)
      `)
      .single()

    if (error) {
      console.error('Error verifying player:', error)
      return c.json({ error: 'Failed to verify player' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'VERIFY_PLAYER', 'players', playerId)

    return c.json({
      message: 'Player verified successfully',
      player
    })
  } catch (error) {
    console.error('Player verification error:', error)
    return c.json({ error: 'Player verification failed' }, 400)
  }
})

export { playerRoutes }
