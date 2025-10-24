'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
}

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [myBids, setMyBids] = useState([])
  const [stats, setStats] = useState({ activeProjects: 0, totalTasks: 0, myBids: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    // Get profile data
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    // Load role-specific data
    if (profileData?.role === 'subcontractor') {
      await loadSubcontractorData(user.id)
    } else if (profileData?.role === 'owner' || profileData?.role === 'coordinator') {
      await loadAdminData(user.id)
    }

    setLoading(false)
  }

  const loadSubcontractorData = async (userId) => {
    // Load active projects
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, description, status, start_date')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6)

    if (projectsData) setProjects(projectsData)

    // Load user's bids
    const { data: bidsData } = await supabase
      .from('bids')
      .select(`
        *,
        tasks!inner(id, name, status),
        categories!inner(id, name, project_id),
        projects!inner(id, name)
      `)
      .eq('subcontractor_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (bidsData) {
      // Flatten the nested data
      const formattedBids = bidsData.map(bid => ({
        ...bid,
        task_name: bid.tasks?.name || 'Unknown',
        category_name: bid.categories?.name || 'Unknown',
        project_name: bid.projects?.name || 'Unknown',
        project_id: bid.projects?.id
      }))
      setMyBids(formattedBids)
    }

    // Calculate stats
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')

    const { count: bidsCount } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('subcontractor_id', userId)

    setStats({
      activeProjects: projectCount || 0,
      totalTasks: tasksCount || 0,
      myBids: bidsCount || 0
    })
  }

  const loadAdminData = async (userId) => {
    // Load user's projects
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, description, status, created_at')
      .order('created_at', { ascending: false })
      .limit(6)

    if (projectsData) setProjects(projectsData)

    // Calculate admin stats
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: totalProjectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    const { count: subcontractorCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'subcontractor')

    setStats({
      activeProjects: projectCount || 0,
      totalProjects: totalProjectCount || 0,
      subcontractors: subcontractorCount || 0
    })
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {profile?.full_name || profile?.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Home
              </button>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                {profile?.role}
              </span>
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {(profile?.role === 'owner' || profile?.role === 'coordinator') ? (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-gray-600 text-sm font-medium mb-1">Active Projects</div>
                <div className="text-4xl font-bold text-blue-600">{stats.activeProjects}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-gray-600 text-sm font-medium mb-1">Total Projects</div>
                <div className="text-4xl font-bold text-green-600">{stats.totalProjects}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-gray-600 text-sm font-medium mb-1">Subcontractors</div>
                <div className="text-4xl font-bold text-purple-600">{stats.subcontractors}</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-gray-600 text-sm font-medium mb-1">Active Projects</div>
                <div className="text-4xl font-bold text-blue-600">{stats.activeProjects}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-gray-600 text-sm font-medium mb-1">Open Tasks</div>
                <div className="text-4xl font-bold text-green-600">{stats.totalTasks}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-gray-600 text-sm font-medium mb-1">My Proposals</div>
                <div className="text-4xl font-bold text-purple-600">{stats.myBids}</div>
              </div>
            </>
          )}
        </div>

        {/* Admin Actions */}
        {(profile?.role === 'owner' || profile?.role === 'coordinator') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/admin/create-project')}
                className="p-6 border-2 border-blue-300 bg-blue-50 rounded-lg hover:border-blue-500 hover:bg-blue-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="font-bold text-blue-900 text-lg mb-1">Create Project</div>
                <div className="text-sm text-blue-700">Add a new construction project</div>
              </button>

              <button
                onClick={() => router.push('/admin/projects')}
                className="p-6 border-2 border-green-300 bg-green-50 rounded-lg hover:border-green-500 hover:bg-green-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="font-bold text-green-900 text-lg mb-1">Manage Projects</div>
                <div className="text-sm text-green-700">View and edit existing projects</div>
              </button>

              <button
                onClick={() => router.push('/')}
                className="p-6 border-2 border-purple-300 bg-purple-50 rounded-lg hover:border-purple-500 hover:bg-purple-100 transition text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="font-bold text-purple-900 text-lg mb-1">Public View</div>
                <div className="text-sm text-purple-700">See how subcontractors view projects</div>
              </button>
            </div>
          </div>
        )}

        {/* Subcontractor My Bids */}
        {profile?.role === 'subcontractor' && myBids.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">My Recent Proposals</h3>
            <div className="space-y-3">
              {myBids.map((bid) => (
                <div
                  key={bid.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
                  onClick={() => router.push(`/projects/${bid.project_id}/task/${bid.task_id}`)}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{bid.task_name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {bid.project_name} → {bid.category_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(bid.price)}</div>
                      <div className="text-sm text-gray-600">{bid.duration} days</div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      bid.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {bid.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {(profile?.role === 'owner' || profile?.role === 'coordinator')
                ? 'Recent Projects'
                : 'Available Projects'}
            </h3>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all →
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No projects available yet</p>
              {(profile?.role === 'owner' || profile?.role === 'coordinator') && (
                <button
                  onClick={() => router.push('/admin/create-project')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Create Your First Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer group"
                  onClick={() => {
                    if (profile?.role === 'owner' || profile?.role === 'coordinator') {
                      router.push(`/admin/projects/${project.id}`)
                    } else {
                      router.push(`/projects/${project.id}`)
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                      {project.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.status === 'active' ? 'bg-green-100 text-green-800' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}
                  {project.start_date && (
                    <div className="text-xs text-gray-500">
                      Start: {new Date(project.start_date).toLocaleDateString('en-GB')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
