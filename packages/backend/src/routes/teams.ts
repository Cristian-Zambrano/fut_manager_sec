import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { requireRole } from '../middleware/auth'
import { logAuditAction } from '../middleware/audit'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'

const teamRoutes = new Hono<{ Bindings: Env, Variables: AuthContext }>()

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional()
})

const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  verified: z.boolean().optional()
})

// Get all teams - Role-based filtering (S-04, S-05, S-06, S-07)
teamRoutes.get('/', async (c) => {
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
      .from('teams')
      .select(`
        *,
        owner:user_profiles!teams_owner_id_fkey(full_name, email),
        players:players(count)
      `)

    // Apply role-based filtering (S-04, S-05)
    if (user.role === 'team_owner') {
      // Team owners can only see their own teams
      query = query.eq('owner_id', user.id)
    } else if (user.role === 'vocal') {
      // Vocals can see all verified teams
      query = query.eq('verified', true)
    }
    // Admins can see all teams (no additional filter)

    const { data: teams, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching teams:', error)
      return c.json({ error: 'Failed to fetch teams' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'VIEW_TEAMS', 'teams', undefined, { count: teams?.length || 0 })

    return c.json({ 
      teams: teams || [],
      user_role: user.role,
      message: 'Teams retrieved successfully'
    })
  } catch (error) {
    console.error('Teams fetch error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get specific team by ID
teamRoutes.get('/:id', async (c) => {
  try {
    const teamId = c.req.param('id')
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
      .from('teams')
      .select(`
        *,
        owner:user_profiles!teams_owner_id_fkey(full_name, email),
        players:players(*),
        sanctions:sanctions(*)
      `)
      .eq('id', teamId)

    // Apply role-based access control (S-04, S-17)
    if (user.role === 'team_owner') {
      query = query.eq('owner_id', user.id)
    } else if (user.role === 'vocal') {
      query = query.eq('verified', true)
    }

    const { data: team, error } = await query.single()

    if (error) {
      console.error('Error fetching team:', error)
      return c.json({ error: 'Team not found or access denied' }, 404)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'VIEW_TEAM_DETAIL', 'teams', teamId)

    return c.json({ 
      team,
      message: 'Team details retrieved successfully'
    })
  } catch (error) {
    console.error('Team detail fetch error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create team - Team owners only (S-06, S-07)
teamRoutes.post('/', requireRole(['team_owner']), async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { name, description } = createTeamSchema.parse(body)
    
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

    // Check if user already has a team (business rule - one team per owner)
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (existingTeam) {
      return c.json({ error: 'You already have a registered team' }, 400)
    }

    // Create the team
    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name,
        description: description || '',
        owner_id: user.id,
        verified: false // Teams need admin verification
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating team:', error)
      return c.json({ error: 'Failed to create team' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'CREATE_TEAM', 'teams', team.id, { name, description })

    return c.json({
      message: 'Team created successfully. Awaiting admin verification.',
      team
    })
  } catch (error) {
    console.error('Team creation error:', error)
    return c.json({ error: 'Team creation failed' }, 400)
  }
})

// Update team - Admin (all teams) or Team owner (own team only) (S-04, S-07, S-17)
teamRoutes.put('/:id', async (c) => {
  try {
    const teamId = c.req.param('id')
    const user = c.get('user')
    const body = await c.req.json()
    const updateData = updateTeamSchema.parse(body)
    
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

    // Get team to check ownership
    const { data: existingTeam, error: fetchError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (fetchError || !existingTeam) {
      return c.json({ error: 'Team not found' }, 404)
    }

    // Role-based access control (S-04, S-17)
    if (user.role === 'team_owner' && existingTeam.owner_id !== user.id) {
      return c.json({ error: 'You can only update your own team' }, 403)
    }

    // Only admins can verify teams (S-07)
    if (updateData.verified !== undefined && user.role !== 'admin') {
      delete updateData.verified
    }

    // Update the team
    const { data: updatedTeam, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      console.error('Error updating team:', error)
      return c.json({ error: 'Failed to update team' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'UPDATE_TEAM', 'teams', teamId, updateData)

    return c.json({
      message: 'Team updated successfully',
      team: updatedTeam
    })
  } catch (error) {
    console.error('Team update error:', error)
    return c.json({ error: 'Team update failed' }, 400)
  }
})

// Delete team - Admin only (S-06, S-07)
teamRoutes.delete('/:id', requireRole(['admin']), async (c) => {
  try {
    const teamId = c.req.param('id')
    
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

    // Check if team exists
    const { data: existingTeam, error: fetchError } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single()

    if (fetchError || !existingTeam) {
      return c.json({ error: 'Team not found' }, 404)
    }

    // Delete the team (cascades to players and sanctions)
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (error) {
      console.error('Error deleting team:', error)
      return c.json({ error: 'Failed to delete team' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'DELETE_TEAM', 'teams', teamId, { team_name: existingTeam.name })

    return c.json({
      message: 'Team deleted successfully'
    })
  } catch (error) {
    console.error('Team deletion error:', error)
    return c.json({ error: 'Team deletion failed' }, 400)
  }
})

// Verify team - Admin only (S-06, S-07)
teamRoutes.patch('/:id/verify', requireRole(['admin']), async (c) => {
  try {
    const teamId = c.req.param('id')
    
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

    const { data: team, error } = await supabase
      .from('teams')
      .update({ verified: true })
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      console.error('Error verifying team:', error)
      return c.json({ error: 'Failed to verify team' }, 500)
    }

    // Log audit action (S-02)
    await logAuditAction(c, 'VERIFY_TEAM', 'teams', teamId)

    return c.json({
      message: 'Team verified successfully',
      team
    })
  } catch (error) {
    console.error('Team verification error:', error)
    return c.json({ error: 'Team verification failed' }, 400)
  }
})

export { teamRoutes }
