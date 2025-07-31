'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { getApiUrl } from '@/utils/api'
import Layout from '@/components/Layout'

interface Sanction {
  id: string
  player_id: string
  sanction_type: string
  description: string
  start_date: string
  end_date?: string
  is_active: boolean
  created_at: string
  player?: {
    full_name: string
    email: string
  }
}

const SanctionsPage: React.FC = () => {
  const { user, initialized } = useAuth()
  const [sanctions, setSanctions] = useState<Sanction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    console.log('🎯 Sanctions: Effect triggered', { user: !!user, initialized })
    
    // Only fetch sanctions when auth is initialized and user exists
    if (initialized) {
      if (user) {
        console.log('✅ Sanctions: Auth ready, fetching sanctions')
        fetchSanctions()
      } else {
        console.log('❌ Sanctions: No user after initialization')
        setLoading(false)
        setError('Authentication required')
      }
    } else {
      console.log('⏳ Sanctions: Waiting for auth initialization')
    }
  }, [user, initialized])

  const fetchSanctions = async () => {
    try {
      setLoading(true)
      const { data: session } = await supabase.auth.getSession()
      
      if (!session.session?.access_token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(getApiUrl('api/sanctions'), {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sanctions')
      }

      const data = await response.json()
      setSanctions(data.sanctions || [])
    } catch (err: any) {
      console.error('Error fetching sanctions:', err)
      setError(err.message || 'Failed to load sanctions')
    } finally {
      setLoading(false)
    }
  }

  const getSanctionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'suspension':
        return 'bg-red-100 text-red-800'
      case 'fine':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Sanctions</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all sanctions issued to players in the championship.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                {loading ? (
                  <div className="bg-white px-4 py-5 sm:p-6">
                    <div className="text-center">Loading sanctions...</div>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sanctions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                            No sanctions found
                          </td>
                        </tr>
                      ) : (
                        sanctions.map((sanction) => (
                          <tr key={sanction.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {sanction.player?.full_name || 'Unknown Player'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {sanction.player?.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                getSanctionTypeColor(sanction.sanction_type)
                              }`}>
                                {sanction.sanction_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {sanction.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(sanction.start_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {sanction.end_date 
                                ? new Date(sanction.end_date).toLocaleDateString()
                                : 'Indefinite'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                sanction.is_active 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {sanction.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default SanctionsPage
