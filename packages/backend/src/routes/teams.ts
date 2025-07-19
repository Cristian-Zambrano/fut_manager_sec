import { Hono } from 'hono'
import { requireRole } from '../middleware/auth'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'

const teamRoutes = new Hono<{ Bindings: Env, Variables: AuthContext }>()

// Get all teams - Admin and Vocal can see all, Team owners see their own
teamRoutes.get('/', async (c) => {
  const user = c.get('user')
  
  // TODO: Implement team fetching logic
  return c.json({ teams: [], user_role: user.role })
})

// Create team - Admin only
teamRoutes.post('/', requireRole(['admin']), async (c) => {
  try {
    const teamData = await c.req.json()
    
    // TODO: Implement team creation logic
    return c.json({ message: 'Team created successfully', team: teamData })
  } catch (error) {
    return c.json({ error: 'Failed to create team' }, 400)
  }
})

// Update team - Admin and Team owner (for their own team)
teamRoutes.put('/:id', async (c) => {
  const teamId = c.req.param('id')
  const user = c.get('user')
  
  // TODO: Implement authorization check and team update logic
  return c.json({ message: `Team ${teamId} updated` })
})

// Delete team - Admin only
teamRoutes.delete('/:id', requireRole(['admin']), async (c) => {
  const teamId = c.req.param('id')
  
  // TODO: Implement team deletion logic
  return c.json({ message: `Team ${teamId} deleted` })
})

export { teamRoutes }
