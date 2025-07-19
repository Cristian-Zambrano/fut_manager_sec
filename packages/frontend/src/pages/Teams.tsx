import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

interface Team {
  id: string
  name: string
  description?: string
  verified: boolean
  owner_id: string
  created_at: string
  owner?: {
    full_name: string
    email: string
  }
  players?: Array<{ count: number }>
}

const Teams: React.FC = () => {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const { data: session } = await supabase.auth.getSession()
      
      if (!session.session?.access_token) {
        setError('Authentication required')
        return
      }

      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }

      const data = await response.json()
      setTeams(data.teams || [])
    } catch (err: any) {
      console.error('Error fetching teams:', err)
      setError(err.message || 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      
      if (!session.session?.access_token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team')
      }

      setFormData({ name: '', description: '' })
      setShowCreateForm(false)
      await fetchTeams() // Refresh the list
      alert('Team created successfully! Awaiting admin verification.')
    } catch (err: any) {
      setError(err.message || 'Failed to create team')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyTeam = async (teamId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      
      if (!session.session?.access_token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/teams/${teamId}/verify`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to verify team')
      }

      await fetchTeams() // Refresh the list
      alert('Team verified successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to verify team')
    }
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { data: session } = await supabase.auth.getSession()
      
      if (!session.session?.access_token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete team')
      }

      await fetchTeams() // Refresh the list
      alert('Team deleted successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to delete team')
    }
  }

  const canCreateTeam = user?.role === 'team_owner'
  const canVerifyTeams = user?.role === 'admin'
  const canDeleteTeams = user?.role === 'admin'

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-center">
          <div className="text-lg">Loading teams...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            {user?.role === 'admin' && 'Manage all teams in the championship'}
            {user?.role === 'team_owner' && 'Manage your team registration'}
            {user?.role === 'vocal' && 'View verified teams for sanctions management'}
          </p>
        </div>
        {canCreateTeam && !teams.some(team => team.owner_id === user?.id) && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Register Team
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Create Team Form */}
      {showCreateForm && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Register New Team</h3>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Team Name *
              </label>
              <input
                type="text"
                id="name"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter team name"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional team description"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Team'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teams List */}
      <div className="bg-white shadow rounded-lg">
        {teams.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {user?.role === 'team_owner' ? 'No teams registered yet. Register your team to get started!' : 'No teams available.'}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Players
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  {(canVerifyTeams || canDeleteTeams) && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{team.name}</div>
                        {team.description && (
                          <div className="text-sm text-gray-500">{team.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {team.owner?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {team.owner?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        team.verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {team.verified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {team.players?.[0]?.count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(team.created_at).toLocaleDateString()}
                    </td>
                    {(canVerifyTeams || canDeleteTeams) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {canVerifyTeams && !team.verified && (
                          <button
                            onClick={() => handleVerifyTeam(team.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Verify
                          </button>
                        )}
                        {canDeleteTeams && (
                          <button
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role-based Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="text-sm text-blue-800">
          <strong>Your Role: {user?.role}</strong>
          <ul className="mt-2 list-disc list-inside">
            {user?.role === 'admin' && (
              <>
                <li>View all teams (verified and unverified)</li>
                <li>Verify team registrations</li>
                <li>Delete teams if necessary</li>
              </>
            )}
            {user?.role === 'team_owner' && (
              <>
                <li>Register your team (one team per owner)</li>
                <li>View your team details and players</li>
                <li>Teams require admin verification before being active</li>
              </>
            )}
            {user?.role === 'vocal' && (
              <>
                <li>View all verified teams</li>
                <li>Access team information for sanctions management</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Teams
