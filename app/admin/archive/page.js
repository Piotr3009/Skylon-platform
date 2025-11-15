'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
}

export default function ArchivePage() {
  const [profile, setProfile] = useState(null)
  const [archivedProjects, setArchivedProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadArchivedProjects()
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

    setProfile(profileData)
  }

  const loadArchivedProjects = async () => {
    const { data, error } = await supabase
      .from('archived_projects')
      .select(`
        *,
        created_by_profile:profiles!archived_projects_created_by_fkey(full_name, company_name),
        archived_by_profile:profiles!archived_projects_archived_by_fkey(full_name, company_name)
      `)
      .order('archived_at', { ascending: false })

    if (!error && data) {
      setArchivedProjects(data)
    }
    setLoading(false)
  }

  const loadProjectDetails = async (projectId) => {
    // Load full details: categories, tasks, bids
    const { data: categories } = await supabase
      .from('archived_categories')
      .select('*')
      .eq('archived_project_id', projectId)
      .order('display_order')

    const { data: tasks } = await supabase
      .from('archived_tasks')
      .select('*')
      .in('archived_category_id', categories?.map(c => c.id) || [])

    const { data: bids } = await supabase
      .from('archived_bids')
      .select(`
        *,
        subcontractor:profiles!archived_bids_subcontractor_id_fkey(full_name, company_name)
      `)
      .eq('archived_project_id', projectId)

    return { categories, tasks, bids }
  }

  const handleViewDetails = async (project) => {
    setSelectedProject({ ...project, loading: true })
    setShowDetailsModal(true)

    const details = await loadProjectDetails(project.id)
    setSelectedProject({ ...project, ...details, loading: false })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading archive...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      <Header
        title="📦 Project Archive"
        subtitle="View archived projects and their history"
        user={profile}
        profile={profile}
        onLogout={handleLogout}
        showHome={true}
        showDashboard={true}
        gradient={true}
      >
        <button
          onClick={() => router.push('/admin/projects')}
          className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold shadow-sm"
        >
          ← Back to Projects
        </button>
      </Header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {archivedProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600 mb-2 text-lg">No archived projects yet</p>
            <p className="text-gray-500 text-sm">Archived projects will appear here</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="text-sm text-gray-600">
                <strong>{archivedProjects.length}</strong> archived project{archivedProjects.length !== 1 ? 's' : ''} • 
                All files (PDFs, images) have been deleted from storage
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archivedProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                      <span className="px-2 py-1 bg-gray-500 text-white rounded text-xs font-semibold">
                        archived
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {project.description || 'No description'}
                    </p>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tasks:</span>
                        <span className="font-semibold text-gray-900">{project.total_tasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Proposals:</span>
                        <span className="font-semibold text-gray-900">{project.total_bids}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Value:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(project.total_value)}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200 space-y-1 text-xs text-gray-500">
                      {project.start_date && (
                        <div>Start: {new Date(project.start_date).toLocaleDateString()}</div>
                      )}
                      {project.end_date && (
                        <div>End: {new Date(project.end_date).toLocaleDateString()}</div>
                      )}
                      <div className="text-orange-600 font-medium">
                        Archived: {new Date(project.archived_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handleViewDetails(project)}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedProject.description}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {selectedProject.loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-600">Loading details...</div>
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{selectedProject.total_tasks}</div>
                      <div className="text-sm text-gray-600">Tasks</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{selectedProject.total_bids}</div>
                      <div className="text-sm text-gray-600">Proposals</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedProject.total_value)}</div>
                      <div className="text-sm text-gray-600">Total Value</div>
                    </div>
                  </div>

                  {/* Categories & Tasks */}
                  {selectedProject.categories && selectedProject.categories.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-3">Categories & Tasks</h3>
                      <div className="space-y-3">
                        {selectedProject.categories.map((category) => {
                          const categoryTasks = selectedProject.tasks?.filter(t => t.archived_category_id === category.id) || []
                          return (
                            <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                              <h4 className="font-semibold text-gray-900 mb-2">{category.name}</h4>
                              {categoryTasks.length > 0 ? (
                                <div className="space-y-2">
                                  {categoryTasks.map((task) => (
                                    <div key={task.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                      <span>{task.name}</span>
                                      <span className="text-gray-600">{formatCurrency(task.final_price || task.suggested_price)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">No tasks</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bids */}
                  {selectedProject.bids && selectedProject.bids.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-3">Proposals ({selectedProject.bids.length})</h3>
                      <div className="space-y-2">
                        {selectedProject.bids.map((bid) => (
                          <div key={bid.id} className="flex justify-between items-center p-3 border border-gray-200 rounded">
                            <div>
                              <div className="font-medium">{bid.subcontractor?.company_name || bid.subcontractor?.full_name || 'Unknown'}</div>
                              <div className="text-sm text-gray-600">{bid.duration} days</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(bid.price)}</div>
                              <span className={`px-2 py-1 text-xs rounded ${
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
