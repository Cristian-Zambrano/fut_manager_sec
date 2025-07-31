'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'

const DashboardPage: React.FC = () => {
  const { user, loading: authLoading, initialized } = useAuth() // NUEVO: initialized

  // NUEVO: Mostrar loading mientras la auth se inicializa
  if (!initialized || authLoading) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Initializing authentication...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <p className="text-gray-600">Please log in to view the dashboard.</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to FutManager Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            You are logged in as: <strong>{user?.email}</strong> with role: <strong>{user?.role}</strong>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Teams</h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-500">Total teams registered</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Players</h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-500">Total players registered</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Sanctions</h3>
              <p className="text-3xl font-bold text-red-600">0</p>
              <p className="text-sm text-gray-500">Active sanctions</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
