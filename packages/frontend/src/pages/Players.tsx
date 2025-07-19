import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { getApiUrl } from '../utils/api'

// Create Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

interface Team {
  id: string
  name: string
  verified: boolean
  owner_id: string
  owner: {
    full_name: string
    email: string
  }
}

interface Player {
  id: string
  name: string
  surname: string
  position: string
  jersey_number: number | null
  verified: boolean
  created_at: string
  team: Team
  sanctions: any[]
}

interface CreatePlayerData {
  name: string
  surname: string
  team_id: string
  position: string
  jersey_number: number | null
}

const Players: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [createPlayerData, setCreatePlayerData] = useState<CreatePlayerData>({
    name: '',
    surname: '',
    team_id: '',
    position: '',
    jersey_number: null
  })

  const fetchPlayers = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(getApiUrl('api/players'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch players')
      }

      const data = await response.json()
      setPlayers(data.players)
      setUserRole(data.user_role)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players')
    }
  }

  const fetchTeams = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      
      if (!token) {
        console.error('Authentication required for fetching teams')
        return
      }

      const response = await fetch(getApiUrl('api/teams'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }

      const data = await response.json()
      setTeams(data.teams)
    } catch (err) {
      console.error('Error fetching teams:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchPlayers(), fetchTeams()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createPlayerData.name || !createPlayerData.surname || !createPlayerData.team_id) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(getApiUrl('api/players'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...createPlayerData,
          jersey_number: createPlayerData.jersey_number || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create player')
      }

      const data = await response.json()
      setPlayers(prev => [data.player, ...prev])
      setShowCreateForm(false)
      setCreatePlayerData({
        name: '',
        surname: '',
        team_id: '',
        position: '',
        jersey_number: null
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create player')
    }
  }

  const handleVerifyPlayer = async (playerId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(getApiUrl(`api/players/${playerId}/verify`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to verify player')
      }

      await response.json() // Consume response
      setPlayers(prev => prev.map(player => 
        player.id === playerId ? { ...player, verified: true } : player
      ))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify player')
    }
  }

  const handleDeletePlayer = async (playerId: string) => {
    if (!window.confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      return
    }

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(getApiUrl(`api/players/${playerId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete player')
      }

      setPlayers(prev => prev.filter(player => player.id !== playerId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete player')
    }
  }

  const getStatusBadge = (player: Player) => {
    if (player.verified) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Verified
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pending Verification
        </span>
      )
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      team_owner: 'bg-blue-100 text-blue-800',
      vocal: 'bg-green-100 text-green-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {role.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Players Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage players in the system. {getRoleBadge(userRole)}
          </p>
        </div>
        {userRole === 'admin' && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Add Player
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Player Form */}
      {showCreateForm && userRole === 'admin' && (
        <div className="mt-6 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Player</h3>
            <form onSubmit={handleCreatePlayer} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={createPlayerData.name}
                    onChange={(e) => setCreatePlayerData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="surname" className="block text-sm font-medium text-gray-700">
                    Surname *
                  </label>
                  <input
                    type="text"
                    id="surname"
                    required
                    value={createPlayerData.surname}
                    onChange={(e) => setCreatePlayerData(prev => ({ ...prev, surname: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="team_id" className="block text-sm font-medium text-gray-700">
                    Team *
                  </label>
                  <select
                    id="team_id"
                    required
                    value={createPlayerData.team_id}
                    onChange={(e) => setCreatePlayerData(prev => ({ ...prev, team_id: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} {team.verified ? '✓' : '(Pending)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                    Position
                  </label>
                  <input
                    type="text"
                    id="position"
                    value={createPlayerData.position}
                    onChange={(e) => setCreatePlayerData(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="e.g., Forward, Midfielder, Defender, Goalkeeper"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="jersey_number" className="block text-sm font-medium text-gray-700">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    id="jersey_number"
                    min="1"
                    max="99"
                    value={createPlayerData.jersey_number || ''}
                    onChange={(e) => setCreatePlayerData(prev => ({ 
                      ...prev, 
                      jersey_number: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Players List */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {players.length === 0 ? (
                <div className="bg-white px-4 py-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No players found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {userRole === 'admin' 
                      ? 'Get started by creating a new player.' 
                      : 'No players are available for your role.'}
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jersey #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sanctions
                      </th>
                      {userRole === 'admin' && (
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {players.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {player.name.charAt(0)}{player.surname.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {player.name} {player.surname}
                              </div>
                              <div className="text-sm text-gray-500">
                                Joined: {new Date(player.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.team.name}</div>
                          <div className="text-sm text-gray-500">
                            {player.team.verified ? (
                              <span className="text-green-600">✓ Verified</span>
                            ) : (
                              <span className="text-yellow-600">Pending</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.position || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.jersey_number || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(player)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.sanctions?.length || 0} sanctions
                        </td>
                        {userRole === 'admin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex space-x-2">
                              {!player.verified && (
                                <button
                                  onClick={() => handleVerifyPlayer(player.id)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Verify
                                </button>
                              )}
                              <button
                                onClick={() => handleDeletePlayer(player.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role-based Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Role-based Access Information
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                {userRole === 'admin' && 'As an Admin, you can create, verify, and delete players from any team.'}
                {userRole === 'team_owner' && 'As a Team Owner, you can view players from your own teams only.'}
                {userRole === 'vocal' && 'As a Vocal, you can view verified players from verified teams only.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Players
