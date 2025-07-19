import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { requireRole } from '../middleware/auth'
import { logAuditAction } from '../middleware/audit'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'

const sanctionRoutes = new Hono<{ Bindings: Env, Variables: AuthContext }>()

// Validation schemas
const createSanctionSchema = z.object({
  description: z.string().min(5).max(500),
  amount: z.number().min(0).max(999999.99),
  player_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional()
}).refine(data => data.player_id || data.team_id, {
  message: "Either player_id or team_id must be provided"
}).refine(data => !(data.player_id && data.team_id), {
  message: "Cannot specify both player_id and team_id"
})

const updateSanctionSchema = z.object({
  description: z.string().min(5).max(500).optional(),
  amount: z.number().min(0).max(999999.99).optional()
})

// Get all sanctions - Role-based filtering (S-04, S-05, S-06, S-07)
sanctionRoutes.get('/', async (c) => {
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
      .from('sanctions')
      .select(`
        *,
        player:players(
          id,
          name,
          surname,
          team:teams!players_team_id_fkey(id, name, verified, owner_id)
        ),
        team:teams!sanctions_team_id_fkey(
          id,
          name,
          verified,
          owner_id,
          owner:user_profiles!teams_owner_id_fkey(full_name, email)
        ),
        created_by_user:user_profiles!sanctions_created_by_fkey(full_name, email)
      `)

    // Apply role-based filtering (S-04, S-05)
    if (user.role === 'team_owner') {
      // Team owners can see sanctions affecting their teams or players
      const { data: userTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id)
      
      if (userTeams && userTeams.length > 0) {
        const teamIds = userTeams.map(team => team.id)
        
        // Get players from user's teams
        const { data: teamPlayers } = await supabase
          .from('players')
          .select('id')
          .in('team_id', teamIds)
        
        const playerIds = teamPlayers?.map(player => player.id) || []
        
        // Filter sanctions for user's teams OR players from user's teams
        if (playerIds.length > 0) {
          query = query.or(`team_id.in.(${teamIds.join(',')}),player_id.in.(${playerIds.join(',')})`)
        } else {
          query = query.in('team_id', teamIds)
        }
      } else {
        // No teams owned, return empty
        return c.json({ 
          sanctions: [], 
          user_role: user.role,
          message: 'No sanctions found - you don\'t own any teams'
        })
      }
    }
    // Admins and vocals can see all sanctions (no additional filter needed)

    const { data: sanctions, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sanctions:', error)
      return c.json({ error: 'Failed to fetch sanctions' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'VIEW_SANCTIONS', 'sanctions', undefined, { count: sanctions?.length || 0 })

    return c.json({ 
      sanctions: sanctions || [],
      user_role: user.role,
      message: 'Sanctions retrieved successfully'
    })
  } catch (error) {
    console.error('Sanctions fetch error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get specific sanction by ID
sanctionRoutes.get('/:id', async (c) => {
  try {
    const sanctionId = c.req.param('id')
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
      .from('sanctions')
      .select(`
        *,
        player:players(
          id,
          name,
          surname,
          team:teams!players_team_id_fkey(id, name, verified, owner_id)
        ),
        team:teams!sanctions_team_id_fkey(
          id,
          name,
          verified,
          owner_id,
          owner:user_profiles!teams_owner_id_fkey(full_name, email)
        ),
        created_by_user:user_profiles!sanctions_created_by_fkey(full_name, email)
      `)
      .eq('id', sanctionId)

    // Apply role-based access control (S-04, S-17)
    if (user.role === 'team_owner') {
      // Team owners can only see sanctions affecting their teams/players
      const { data: userTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id)
      
      if (userTeams && userTeams.length > 0) {
        const teamIds = userTeams.map(team => team.id)
        
        // Get players from user's teams
        const { data: teamPlayers } = await supabase
          .from('players')
          .select('id')
          .in('team_id', teamIds)
        
        const playerIds = teamPlayers?.map(player => player.id) || []
        
        // Filter sanctions for user's teams OR players from user's teams
        if (playerIds.length > 0) {
          query = query.or(`team_id.in.(${teamIds.join(',')}),player_id.in.(${playerIds.join(',')})`)
        } else {
          query = query.in('team_id', teamIds)
        }
      } else {
        return c.json({ error: 'Sanction not found or access denied' }, 404)
      }
    }

    const { data: sanction, error } = await query.single()

    if (error) {
      console.error('Error fetching sanction:', error)
      return c.json({ error: 'Sanction not found or access denied' }, 404)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'VIEW_SANCTION_DETAIL', 'sanctions', sanctionId)

    return c.json({ 
      sanction,
      message: 'Sanction details retrieved successfully'
    })
  } catch (error) {
    console.error('Sanction detail fetch error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create sanction - Vocal and Admin (S-06, S-07)
sanctionRoutes.post('/', requireRole(['vocal', 'admin']), async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { description, amount, player_id, team_id } = createSanctionSchema.parse(body)
    
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

    // Verify target exists (player or team)
    if (player_id) {
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id, name, surname, verified')
        .eq('id', player_id)
        .single()

      if (playerError || !player) {
        return c.json({ error: 'Player not found' }, 400)
      }

      if (!player.verified) {
        return c.json({ error: 'Cannot sanction unverified player' }, 400)
      }
    }

    if (team_id) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, verified')
        .eq('id', team_id)
        .single()

      if (teamError || !team) {
        return c.json({ error: 'Team not found' }, 400)
      }

      if (!team.verified) {
        return c.json({ error: 'Cannot sanction unverified team' }, 400)
      }
    }

    // Create the sanction
    const { data: sanction, error } = await supabase
      .from('sanctions')
      .insert({
        description,
        amount,
        player_id: player_id || null,
        team_id: team_id || null,
        created_by: user.id
      })
      .select(`
        *,
        player:players(id, name, surname),
        team:teams!sanctions_team_id_fkey(id, name)
      `)
      .single()

    if (error) {
      console.error('Error creating sanction:', error)
      return c.json({ error: 'Failed to create sanction' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'CREATE_SANCTION', 'sanctions', sanction.id, { 
      description, 
      amount, 
      player_id, 
      team_id,
      target_type: player_id ? 'player' : 'team'
    })

    return c.json({
      message: 'Sanction created successfully',
      sanction
    })
  } catch (error) {
    console.error('Sanction creation error:', error)
    return c.json({ error: 'Sanction creation failed' }, 400)
  }
})

// Update sanction - Vocal and Admin (S-04, S-07, S-17)
sanctionRoutes.put('/:id', requireRole(['vocal', 'admin']), async (c) => {
  try {
    const sanctionId = c.req.param('id')
    const user = c.get('user')
    const body = await c.req.json()
    const updateData = updateSanctionSchema.parse(body)
    
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

    // Get sanction to check existence and ownership
    const { data: existingSanction, error: fetchError } = await supabase
      .from('sanctions')
      .select('*')
      .eq('id', sanctionId)
      .single()

    if (fetchError || !existingSanction) {
      return c.json({ error: 'Sanction not found' }, 404)
    }

    // Role-based access control (S-04, S-17)
    // Vocals can only update sanctions they created, admins can update any
    if (user.role === 'vocal' && existingSanction.created_by !== user.id) {
      return c.json({ error: 'You can only update sanctions you created' }, 403)
    }

    // Update the sanction
    const { data: updatedSanction, error } = await supabase
      .from('sanctions')
      .update(updateData)
      .eq('id', sanctionId)
      .select(`
        *,
        player:players(id, name, surname),
        team:teams!sanctions_team_id_fkey(id, name)
      `)
      .single()

    if (error) {
      console.error('Error updating sanction:', error)
      return c.json({ error: 'Failed to update sanction' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'UPDATE_SANCTION', 'sanctions', sanctionId, updateData)

    return c.json({
      message: 'Sanction updated successfully',
      sanction: updatedSanction
    })
  } catch (error) {
    console.error('Sanction update error:', error)
    return c.json({ error: 'Sanction update failed' }, 400)
  }
})

// Delete sanction - Vocal (own sanctions) and Admin (any sanction) (S-06, S-07)
sanctionRoutes.delete('/:id', requireRole(['vocal', 'admin']), async (c) => {
  try {
    const sanctionId = c.req.param('id')
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

    // Check if sanction exists and get ownership info
    const { data: existingSanction, error: fetchError } = await supabase
      .from('sanctions')
      .select(`
        *,
        player:players(name, surname),
        team:teams!sanctions_team_id_fkey(name)
      `)
      .eq('id', sanctionId)
      .single()

    if (fetchError || !existingSanction) {
      return c.json({ error: 'Sanction not found' }, 404)
    }

    // Role-based access control (S-04, S-17)
    // Vocals can only delete sanctions they created, admins can delete any
    if (user.role === 'vocal' && existingSanction.created_by !== user.id) {
      return c.json({ error: 'You can only delete sanctions you created' }, 403)
    }

    // Delete the sanction
    const { error } = await supabase
      .from('sanctions')
      .delete()
      .eq('id', sanctionId)

    if (error) {
      console.error('Error deleting sanction:', error)
      return c.json({ error: 'Failed to delete sanction' }, 500)
    }

    // Log audit action (S-02)
    const target = existingSanction.player 
      ? `${existingSanction.player.name} ${existingSanction.player.surname}` 
      : existingSanction.team?.name || 'Unknown'
    
    await logAuditAction(c, 'DELETE_SANCTION', 'sanctions', sanctionId, { 
      description: existingSanction.description,
      amount: existingSanction.amount,
      target,
      target_type: existingSanction.player_id ? 'player' : 'team'
    })

    return c.json({
      message: 'Sanction deleted successfully'
    })
  } catch (error) {
    console.error('Sanction deletion error:', error)
    return c.json({ error: 'Sanction deletion failed' }, 400)
  }
})

// Get sanctions by team - for team owners and admins
sanctionRoutes.get('/team/:teamId', async (c) => {
  try {
    const teamId = c.req.param('teamId')
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

    // Role-based access control (S-04, S-17)
    if (user.role === 'team_owner') {
      // Verify the team belongs to the user
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('id', teamId)
        .eq('owner_id', user.id)
        .single()

      if (teamError || !team) {
        return c.json({ error: 'Team not found or access denied' }, 404)
      }
    }

    // Get sanctions for the team and its players
    const { data: teamPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('team_id', teamId)
    
    const playerIds = teamPlayers?.map(player => player.id) || []
    
    let sanctionsQuery = supabase
      .from('sanctions')
      .select(`
        *,
        player:players(id, name, surname),
        team:teams!sanctions_team_id_fkey(id, name),
        created_by_user:user_profiles!sanctions_created_by_fkey(full_name, email)
      `)
    
    // Filter for team sanctions OR player sanctions from this team
    if (playerIds.length > 0) {
      sanctionsQuery = sanctionsQuery.or(`team_id.eq.${teamId},player_id.in.(${playerIds.join(',')})`)
    } else {
      sanctionsQuery = sanctionsQuery.eq('team_id', teamId)
    }
    
    const { data: sanctions, error } = await sanctionsQuery.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching team sanctions:', error)
      return c.json({ error: 'Failed to fetch team sanctions' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'VIEW_TEAM_SANCTIONS', 'sanctions', undefined, { 
      team_id: teamId,
      count: sanctions?.length || 0 
    })

    return c.json({ 
      sanctions: sanctions || [],
      team_id: teamId,
      message: 'Team sanctions retrieved successfully'
    })
  } catch (error) {
    console.error('Team sanctions fetch error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export { sanctionRoutes }
