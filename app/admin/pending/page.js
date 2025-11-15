'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB')
}

const getTimeAgo = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function PendingPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [groupedBids, setGroupedBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPending: 0,
    totalProjects: 0,
    totalValue: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData?.role !== 'owner' && profileData?.role !== 'coordinator') {
      router.push('/dashboard')
      return
    }

    setUser(user)
    setProfile(profileData)
    await loadPendingBids()
  }

  const loadPendingBids = async () => {
    try {
      // Fetch all pending bids with full context
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select(`
          *,
          tasks (
            id,
            name,
            budget_min,
            budget_max,
            categories (
              id,
              name,
              projects (
                id,
                name,
                project_type
              )
            )
          ),
          profiles (
            id,
            company_name,
            full_name,
            email,
            phone,
            average_rating
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (bidsError) throw bidsError

      // Group bids by project -> category -> task
      const grouped = {}
      let totalValue = 0

      bidsData.forEach(bid => {
        const project = bid.tasks?.categories?.projects
        const category = bid.tasks?.categories
        const task = bid.tasks

        if (!project) return

        // Initialize project group
        if (!grouped[project.id]) {
          grouped[project.id] = {
            id: project.id,
            name: project.name,
            type: project.project_type,
            categories: {}
          }
        }

        // Initialize category group
        if (!grouped[project.id].categories[category.id]) {
          grouped[project.id].categories[category.id] = {
            id: category.id,
            name: category.name,
            tasks: {}
          }
        }

        // Initialize task group
        if (!grouped[project.id].categories[category.id].tasks[task.id]) {
          grouped[project.id].categories[category.id].tasks[task.id] = {
            id: task.id,
            name: task.name,
            budget_min: task.budget_min,
            budget_max: task.budget_max,
            bids: []
          }
        }

        // Add bid to task
        grouped[project.id].categories[category.id].tasks[task.id].bids.push({
          ...bid,
          subcontractor: bid.profiles
        })

        totalValue += Number(bid.price) || 0
      })

      // Convert to array format
      const groupedArray = Object.values(grouped).map(project => ({
        ...project,
        categories: Object.values(project.categories).map(category => ({
          ...category,
          tasks: Object.values(category.tasks)
        }))
      }))

      setGroupedBids(groupedArray)

      setStats({
        totalPending: bidsData.length,
        totalProjects: groupedArray.length,
        totalValue: totalValue
      })

      setLoading(false)
    } catch (error) {
      console.error('Error loading pending bids:', error)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{`
        .navy-header {
          background: linear-gradient(to right, #1e3a5f, #2a5179, #1e3a5f) !important;
          border-bottom: 1px solid #163050;
          position: relative;
          z-index: 10;
        }
      `}</style>

      {/* Header */}
      <header className="navy-header shadow-lg">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Skylon" className="h-10" />
              <div>
                <h1 className="text-2xl font-bold text-white">Pending Proposals</h1>
                <p className="text-sm text-white/80 mt-1">Review and manage pending proposals from subcontractors</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                Home
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="text-sm font-medium text-gray-600">Total Pending</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPending}</div>
            <div className="text-xs text-gray-500 mt-1">Awaiting review</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-sm font-medium text-gray-600">Projects with Bids</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProjects}</div>
            <div className="text-xs text-gray-500 mt-1">Active projects</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-sm font-medium text-gray-600">Total Bid Value</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalValue)}</div>
            <div className="text-xs text-gray-500 mt-1">Combined proposals</div>
          </div>
        </div>

        {/* Grouped Bids */}
        {groupedBids.length > 0 ? (
          <div className="space-y-6">
            {groupedBids.map(project => (
              <div key={project.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Project Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{project.name}</h2>
                        {project.type && (
                          <span className="text-sm text-blue-100 capitalize">{project.type}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories and Tasks */}
                <div className="p-6 space-y-4">
                  {project.categories.map(category => (
                    <div key={category.id} className="border-l-4 border-indigo-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        {category.name}
                      </h3>

                      {category.tasks.map(task => (
                        <div key={task.id} className="mb-4 bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h4 className="text-base font-medium text-gray-900">{task.name}</h4>
                              </div>
                              {(task.budget_min || task.budget_max) && (
                                <div className="text-sm text-gray-600 mt-1 ml-6">
                                  Budget: {formatCurrency(task.budget_min)} - {formatCurrency(task.budget_max)}
                                </div>
                              )}
                            </div>
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                              {task.bids.length} {task.bids.length === 1 ? 'bid' : 'bids'}
                            </span>
                          </div>

                          {/* Bids for this task */}
                          <div className="space-y-2">
                            {task.bids.map(bid => (
                              <div key={bid.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1">
                                        <div className="font-semibold text-gray-900">
                                          {bid.subcontractor?.company_name || bid.subcontractor?.full_name || 'Unknown'}
                                        </div>
                                        {bid.subcontractor?.company_name && bid.subcontractor?.full_name && (
                                          <div className="text-sm text-gray-600">{bid.subcontractor.full_name}</div>
                                        )}
                                        <div className="text-sm text-gray-500">{bid.subcontractor?.email}</div>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="text-yellow-500">★</span>
                                        <span className="font-medium">
                                          {bid.subcontractor?.average_rating 
                                            ? Number(bid.subcontractor.average_rating).toFixed(1) 
                                            : '0.0'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-2 flex items-center gap-6 text-sm">
                                      <div>
                                        <span className="text-gray-600">Price: </span>
                                        <span className="font-bold text-green-600">{formatCurrency(bid.price)}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Duration: </span>
                                        <span className="font-semibold text-gray-900">{bid.duration} days</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Submitted: </span>
                                        <span className="text-gray-700">{getTimeAgo(bid.created_at)}</span>
                                      </div>
                                    </div>

                                    {bid.comment && (
                                      <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                        <span className="font-medium">Comment:</span> {bid.comment}
                                      </div>
                                    )}
                                  </div>

                                  <div className="ml-4">
                                    <button
                                      onClick={() => router.push(`/admin/projects/${project.id}/task/${task.id}`)}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                    >
                                      View Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Proposals</h3>
            <p className="text-gray-600">There are currently no pending proposals to review.</p>
          </div>
        )}
      </div>
    </div>
  )
}