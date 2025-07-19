import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/api'

interface Player {
  id: string
  name: string
  surname: string
  verified: boolean
  team: {
    id: string
    name: string
    verified: boolean
    owner_id: string
  }
}

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

interface Sanction {
  id: string
  description: string
  amount: number
  player_id: string | null
  team_id: string | null
  created_at: string
  created_by: string
  player?: Player
  team?: Team
  created_by_user: {
    full_name: string
    email: string
  }
}

interface CreateSanctionData {
  description: string
  amount: number
  target_type: 'player' | 'team'
  player_id: string
  team_id: string
}

const Sanctions: React.FC = () => {
  const { getToken } = useAuth()
  const [sanctions, setSanctions] = useState<Sanction[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [createSanctionData, setCreateSanctionData] = useState<CreateSanctionData>({
    description: '',
    amount: 0,
    target_type: 'player',
    player_id: '',
    team_id: ''
  })

  const fetchSanctions = async () => {
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      const response = await fetch(getApiUrl('api/sanctions'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sanctions')
      }

      const data = await response.json()
      setSanctions(data.sanctions)
      setUserRole(data.user_role)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sanctions')
    }
  }

  const fetchPlayersAndTeams = async () => {
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      // Fetch players
      const playersResponse = await fetch(getApiUrl('api/players'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (playersResponse.ok) {
        const playersData = await playersResponse.json()
        setPlayers(playersData.players.filter((p: Player) => p.verified))
      }

      // Fetch teams
      const teamsResponse = await fetch(getApiUrl('api/teams'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json()
        setTeams(teamsData.teams.filter((t: Team) => t.verified))
      }
    } catch (err) {
      console.error('Error fetching players/teams:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchSanctions(), fetchPlayersAndTeams()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleCreateSanction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createSanctionData.description || createSanctionData.amount <= 0) {
      setError('Please fill in all required fields with valid values')
      return
    }

    if (createSanctionData.target_type === 'player' && !createSanctionData.player_id) {
      setError('Please select a player')
      return
    }

    if (createSanctionData.target_type === 'team' && !createSanctionData.team_id) {
      setError('Please select a team')
      return
    }

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      const requestBody: any = {
        description: createSanctionData.description,
        amount: createSanctionData.amount
      }

      if (createSanctionData.target_type === 'player') {
        requestBody.player_id = createSanctionData.player_id
      } else {
        requestBody.team_id = createSanctionData.team_id
      }

      const response = await fetch(getApiUrl('api/sanctions'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create sanction')
      }

      const data = await response.json()
      setSanctions(prev => [data.sanction, ...prev])
      setShowCreateForm(false)
      setCreateSanctionData({
        description: '',
        amount: 0,
        target_type: 'player',
        player_id: '',
        team_id: ''
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sanction')
    }
  }

  const handleDeleteSanction = async (sanctionId: string) => {
    if (!window.confirm('Are you sure you want to delete this sanction? This action cannot be undone.')) {
      return
    }

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('No authentication token available')
      }
      
      const response = await fetch(getApiUrl(`api/sanctions/${sanctionId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete sanction')
      }

      setSanctions(prev => prev.filter(sanction => sanction.id !== sanctionId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sanction')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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

  const canCreateSanctions = userRole === 'vocal' || userRole === 'admin'
  const canDeleteSanction = (_sanction: Sanction) => {
    if (userRole === 'admin') return true
    if (userRole === 'vocal') {
      // Vocals can delete any sanction (per requirements, they manage sanctions)
      return true
    }
    return false
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
          <h1 className="text-2xl font-bold text-gray-900">Sanctions Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage sanctions for players and teams. {getRoleBadge(userRole)}
          </p>
        </div>
        {canCreateSanctions && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
            >
              Add Sanction
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

      {/* Create Sanction Form */}
      {showCreateForm && canCreateSanctions && (
        <div className="mt-6 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Sanction</h3>
            <form onSubmit={handleCreateSanction} className="space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  id="description"
                  required
                  rows={3}
                  value={createSanctionData.description}
                  onChange={(e) => setCreateSanctionData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the reason for this sanction..."
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    id="amount"
                    required
                    min="0"
                    step="0.01"
                    value={createSanctionData.amount}
                    onChange={(e) => setCreateSanctionData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="target_type" className="block text-sm font-medium text-gray-700">
                    Sanction Target *
                  </label>
                  <select
                    id="target_type"
                    required
                    value={createSanctionData.target_type}
                    onChange={(e) => setCreateSanctionData(prev => ({ 
                      ...prev, 
                      target_type: e.target.value as 'player' | 'team',
                      player_id: '',
                      team_id: ''
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  >
                    <option value="player">Player</option>
                    <option value="team">Team</option>
                  </select>
                </div>
              </div>

              {createSanctionData.target_type === 'player' && (
                <div>
                  <label htmlFor="player_id" className="block text-sm font-medium text-gray-700">
                    Player *
                  </label>
                  <select
                    id="player_id"
                    required
                    value={createSanctionData.player_id}
                    onChange={(e) => setCreateSanctionData(prev => ({ ...prev, player_id: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  >
                    <option value="">Select a player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} {player.surname} ({player.team.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {createSanctionData.target_type === 'team' && (
                <div>
                  <label htmlFor="team_id" className="block text-sm font-medium text-gray-700">
                    Team *
                  </label>
                  <select
                    id="team_id"
                    required
                    value={createSanctionData.team_id}
                    onChange={(e) => setCreateSanctionData(prev => ({ ...prev, team_id: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Create Sanction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sanctions List */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {sanctions.length === 0 ? (
                <div className="bg-white px-4 py-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No sanctions found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {canCreateSanctions 
                      ? 'Get started by creating a new sanction.' 
                      : 'No sanctions are available for your role.'}
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      {(userRole === 'vocal' || userRole === 'admin') && (
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sanctions.map((sanction) => (
                      <tr key={sanction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                sanction.player_id ? 'bg-blue-100' : 'bg-purple-100'
                              }`}>
                                <span className={`text-sm font-medium ${
                                  sanction.player_id ? 'text-blue-800' : 'text-purple-800'
                                }`}>
                                  {sanction.player_id ? 'P' : 'T'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {sanction.player_id 
                                  ? `${sanction.player?.name} ${sanction.player?.surname}`
                                  : sanction.team?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {sanction.player_id ? 'Player' : 'Team'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {sanction.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(sanction.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sanction.created_by_user.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sanction.created_at).toLocaleDateString()}
                        </td>
                        {(userRole === 'vocal' || userRole === 'admin') && canDeleteSanction(sanction) && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteSanction(sanction.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
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
                {userRole === 'admin' && 'As an Admin, you can view all sanctions and delete any sanction.'}
                {userRole === 'vocal' && 'As a Vocal, you can create sanctions for verified players and teams, and delete sanctions you created.'}
                {userRole === 'team_owner' && 'As a Team Owner, you can view sanctions affecting your teams and players only.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sanctions
