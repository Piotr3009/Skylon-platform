'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { archiveProject } from '@/lib/archiveProject'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

export default function ProjectsListPage() {
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProject, setEditingProject] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archivingProject, setArchivingProject] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadProjects()
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

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Get bid counts for each project
      const projectsWithBids = await Promise.all(
        data.map(async (project) => {
          // Count total tasks
          const { count: tasksCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)

          // Count bids for this project
          const { count: bidsCount } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)

          return {
            ...project,
            tasksCount: tasksCount || 0,
            bidsCount: bidsCount || 0
          }
        })
      )
      setProjects(projectsWithBids)
    }
    setLoading(false)
  }

  const handleEdit = (e, project) => {
    e.stopPropagation()
    setEditingProject({...project})
    setShowEditModal(true)
  }

  const handleDelete = async (e, projectId) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project?')) return

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (!error) {
      loadProjects()
    } else {
      alert('Error deleting project')
    }
  }

  const handleArchiveClick = (e, project) => {
    e.stopPropagation()
    setArchivingProject(project)
    setShowArchiveModal(true)
  }

  const handleArchiveConfirm = async () => {
    if (!archivingProject || !profile) return

    setArchiving(true)

    const result = await archiveProject(archivingProject.id, profile.id)

    if (result.success) {
      alert(`✅ ${result.message}\n\nStats:\n- Tasks: ${result.stats.totalTasks}\n- Proposals: ${result.stats.totalBids}\n- Files deleted: ${result.stats.filesDeleted}`)
      setShowArchiveModal(false)
      setArchivingProject(null)
      loadProjects() // Reload list
    } else {
      alert(`❌ Error: ${result.message}`)
    }

    setArchiving(false)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()

    const { error } = await supabase
      .from('projects')
      .update({
        name: editingProject.name,
        description: editingProject.description,
        status: editingProject.status,
        start_date: editingProject.start_date,
        end_date: editingProject.end_date
      })
      .eq('id', editingProject.id)

    if (!error) {
      setShowEditModal(false)
      setEditingProject(null)
      loadProjects()
    } else {
      alert('Error updating project')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-50">
      {/* Header */}
      <Header
        title="All Projects"
        subtitle="Manage your construction projects"
        user={profile}
        profile={profile}
        onLogout={handleLogout}
        showHome={true}
        showDashboard={true}
        gradient={true}
      >
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/archive')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-semibold shadow-sm"
          >
            📦 Archive
          </button>
          <button
            onClick={() => router.push('/admin/create-project')}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-semibold shadow-sm"
          >
            + New Project
          </button>
        </div>
      </Header>

      {/* Projects List */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">No projects yet</p>
            <button
              onClick={() => router.push('/admin/create-project')}
              className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/projects/${project.id}`)}
                >
                  {(project.project_image_url || project.gantt_image_url) && (
                    <img
                      src={project.project_image_url || project.gantt_image_url}
                      alt={project.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-xl font-bold mb-2">{project.name}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                    <div className="flex justify-between items-center text-sm mb-3">
                      <span className={`px-2 py-1 rounded text-white ${
                        project.status === 'active' ? 'bg-green-500' : 
                        project.status === 'completed' ? 'bg-blue-500' : 
                        'bg-gray-500'
                      }`}>
                        {project.status}
                      </span>
                      {project.start_date && (
                        <span className="text-gray-500">
                          {new Date(project.start_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {/* Proposals & Tasks Count */}
                    <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-semibold text-indigo-600">{project.bidsCount || 0}</span>
                        <span className="text-gray-600">proposals</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="font-semibold text-gray-700">{project.tasksCount || 0}</span>
                        <span className="text-gray-600">packages</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={(e) => handleEdit(e, project)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleArchiveClick(e, project)}
                    className="flex-1 px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                  >
                    Archive
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && archivingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-orange-600">⚠️ Archive Project</h2>
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                You are about to archive: <strong>{archivingProject.name}</strong>
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                <strong>Warning:</strong> All PDFs and images will be permanently deleted from storage.
                <br/>
                Only data (text) will be saved to archive.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleArchiveConfirm}
                disabled={archiving}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
              >
                {archiving ? 'Archiving...' : 'Confirm Archive'}
              </button>
              <button
                onClick={() => {
                  setShowArchiveModal(false)
                  setArchivingProject(null)
                }}
                disabled={archiving}
                className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Edit Project</h2>
            <form onSubmit={handleSaveEdit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project Name</label>
                  <input
                    type="text"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={editingProject.description || ''}
                    onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={editingProject.status}
                    onChange={(e) => setEditingProject({...editingProject, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editingProject.start_date || ''}
                      onChange={(e) => setEditingProject({...editingProject, start_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={editingProject.end_date || ''}
                      onChange={(e) => setEditingProject({...editingProject, end_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProject(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}