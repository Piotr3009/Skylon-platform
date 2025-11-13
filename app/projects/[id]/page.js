'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { getCategoryIcon, getCategoryColor } from '@/lib/categoryIcons'
import Header from '@/app/components/Header'
import Breadcrumbs from '@/app/components/Breadcrumbs'

export default function ProjectDetailPage() {
  const [profile, setProfile] = useState(null)
  const [project, setProject] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [newProjectLogo, setNewProjectLogo] = useState(null)
  const [newGanttImage, setNewGanttImage] = useState(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    checkAuth()
    loadProject()
    loadCategories()
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

  const loadProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()


    if (!error) {
      setProject(data)
    }
    setLoading(false)
  }

  const loadCategories = async () => {
    
    // Pobierz kategorie
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('project_id', params.id)
      .order('display_order')

    if (categoriesError) {
      return
    }

    // Pobierz wszystkie tasks dla tych kategorii
    const categoryIds = categoriesData.map(c => c.id)
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, status, suggested_price, budget_min, budget_max, category_id')
      .in('category_id', categoryIds)

    if (tasksError) {
      return
    }


    // Połącz tasks z kategoriami
    const categoriesWithTasks = categoriesData.map(category => ({
      ...category,
      tasks: tasksData.filter(task => task.category_id === category.id)
    }))

    setCategories(categoriesWithTasks)
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    
    const { error } = await supabase
      .from('categories')
      .insert([
        {
          project_id: params.id,
          name: categoryName,
          display_order: categories.length
        }
      ])

    if (!error) {
      setCategoryName('')
      setShowCategoryForm(false)
      loadCategories()
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Delete this category and all its tasks?')) return

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)

    if (!error) {
      loadCategories()
    }
  }

  const handleEdit = () => {
    setEditingProject({...project})
    setShowEditModal(true)
  }

  const handleArchiveClick = () => {
    setShowArchiveModal(true)
  }

  const handleArchiveConfirm = async () => {
    if (!project || !profile) return

    setArchiving(true)

    const result = await archiveProject(project.id, profile.id)

    if (result.success) {
      alert(`✅ ${result.message}\n\nStats:\n- Tasks: ${result.stats.totalTasks}\n- Proposals: ${result.stats.totalBids}\n- Files deleted: ${result.stats.filesDeleted}`)
      router.push('/admin/projects')
    } else {
      alert(`❌ Error: ${result.message}`)
      setArchiving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? All categories and tasks will be deleted.')) return

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', params.id)

    if (!error) {
      router.push('/admin/projects')
    } else {
      alert('Error deleting project')
    }
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()

    let projectLogoUrl = editingProject.project_image_url
    let ganttImageUrl = editingProject.gantt_image_url

    // Upload new project logo if provided
    if (newProjectLogo) {
      // Validate file size (5MB max)
      if (newProjectLogo.size > 5 * 1024 * 1024) {
        alert('Project logo must be less than 5MB')
        return
      }

      // Delete old logo if exists
      if (editingProject.project_image_url) {
        const oldFileName = editingProject.project_image_url.split('/').pop()
        await supabase.storage
          .from('project-files')
          .remove([`project-logos/${oldFileName}`])
      }

      const fileExt = newProjectLogo.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `project-logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, newProjectLogo)

      if (uploadError) {
        alert('Failed to upload project logo: ' + uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath)

      projectLogoUrl = publicUrl
    }

    // Upload new Gantt image if provided
    if (newGanttImage) {
      // Delete old Gantt if exists
      if (editingProject.gantt_image_url) {
        const oldFileName = editingProject.gantt_image_url.split('/').pop()
        await supabase.storage
          .from('project-files')
          .remove([`gantt/${oldFileName}`])
      }

      const fileExt = newGanttImage.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `gantt/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, newGanttImage)

      if (uploadError) {
        alert('Failed to upload Gantt image: ' + uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath)

      ganttImageUrl = publicUrl
    }

    const { error } = await supabase
      .from('projects')
      .update({
        name: editingProject.name,
        description: editingProject.description,
        status: editingProject.status,
        start_date: editingProject.start_date,
        end_date: editingProject.end_date,
        project_image_url: projectLogoUrl,
        gantt_image_url: ganttImageUrl
      })
      .eq('id', params.id)

    if (!error) {
      setShowEditModal(false)
      setEditingProject(null)
      setNewProjectLogo(null)
      setNewGanttImage(null)
      loadProject()
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <Header
        title={project?.name || 'Project Details'}
        subtitle="Manage categories and tasks"
        user={profile}
        profile={profile}
        onLogout={handleLogout}
        showHome={true}
        showDashboard={true}
        gradient={true}
      >
        <button
          onClick={handleEdit}
          className="px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg hover:bg-white/30 transition"
        >
          Edit
        </button>
        <button
          onClick={handleArchiveClick}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          Archive
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Delete
        </button>
      </Header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Projects', href: '/admin/projects' },
            { label: project?.name || 'Loading...' }
          ]}
        />

        {project && (
          <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm border border-indigo-100 p-4 mb-6">
            <div className="flex gap-4 text-sm flex-wrap">
              {project.start_date && (
                <span className="text-gray-700">
                  <span className="font-semibold">Start:</span> {new Date(project.start_date).toLocaleDateString()}
                </span>
              )}
              {project.end_date && (
                <span className="text-gray-700">
                  <span className="font-semibold">End:</span> {new Date(project.end_date).toLocaleDateString()}
                </span>
              )}
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                {project.status}
              </span>
              {project.project_type && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                  {project.project_type === 'commercial' ? 'Commercial & Domestic' :
                   project.project_type === 'domestic' ? 'Domestic' :
                   project.project_type === 'restaurant' ? 'Restaurant' :
                   project.project_type}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-0">
        {/* Project Description */}
        {project?.description && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Project Description
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          </div>
        )}

        {/* Gantt Chart */}
        {project?.gantt_image_url && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Project Timeline</h2>
            <img 
              src={project.gantt_image_url} 
              alt="Gantt Chart" 
              className="w-full rounded"
            />
          </div>
        )}

        {/* Categories Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Categories & Tasks</h2>
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Category
            </button>
          </div>

          {/* Add Category Form */}
          {showCategoryForm && (
            <form onSubmit={handleAddCategory} className="mb-6 p-4 bg-blue-50 rounded">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Category name (e.g., M&E, Construction, Finishes)"
                  className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(false)}
                  className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Categories List */}
          {categories.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No categories yet. Add your first category to organize tasks.
            </p>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id} className={`border rounded-lg p-4 ${getCategoryColor(category.name)}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const Icon = getCategoryIcon(category.name)
                        return <Icon className="w-6 h-6" />
                      })()}
                      <h3 className="text-lg font-bold">{category.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/projects/${params.id}/category/${category.id}/add-task`)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        + Add Task
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Tasks in this category */}
                  {category.tasks && category.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {category.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => router.push(`/admin/projects/${params.id}/task/${task.id}`)}
                        >
                          <div>
                            <div className="font-medium">{task.name}</div>
                            <div className="text-sm text-gray-600">
                              {task.budget_min && task.budget_max ? (
                                `£${task.budget_min} - £${task.budget_max}`
                              ) : task.budget_min ? (
                                `From £${task.budget_min}`
                              ) : task.budget_max ? (
                                `Up to £${task.budget_max}`
                              ) : task.suggested_price ? (
                                `£${task.suggested_price}`
                              ) : ''}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${
                            task.status === 'open' ? 'bg-green-100 text-green-800' :
                            task.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No tasks yet</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-orange-600">⚠️ Archive Project</h2>
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                You are about to archive: <strong>{project?.name}</strong>
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
                onClick={() => setShowArchiveModal(false)}
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

                {/* Current Project Logo */}
                {editingProject.project_image_url && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Project Logo</label>
                    <div className="relative inline-block">
                      <img 
                        src={editingProject.project_image_url} 
                        alt="Current logo" 
                        className="w-32 h-32 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Delete current project logo?')) {
                            const oldFileName = editingProject.project_image_url.split('/').pop()
                            await supabase.storage
                              .from('project-files')
                              .remove([`project-logos/${oldFileName}`])
                            
                            await supabase
                              .from('projects')
                              .update({ project_image_url: null })
                              .eq('id', params.id)
                            
                            loadProject()
                            setShowEditModal(false)
                          }
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload New Project Logo */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {editingProject.project_image_url ? 'Replace Project Logo/Image' : 'Project Logo/Image'} (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewProjectLogo(e.target.files[0])}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {newProjectLogo && (
                    <p className="text-sm text-green-600 mt-1">✓ New logo selected: {newProjectLogo.name}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a logo or main image for this project (max 5MB)
                  </p>
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

                {/* Current Gantt Chart */}
                {editingProject.gantt_image_url && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Gantt Chart</label>
                    <div className="relative inline-block">
                      <img 
                        src={editingProject.gantt_image_url} 
                        alt="Current Gantt" 
                        className="w-full max-w-md rounded border"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Delete current Gantt chart?')) {
                            const oldFileName = editingProject.gantt_image_url.split('/').pop()
                            await supabase.storage
                              .from('project-files')
                              .remove([`gantt/${oldFileName}`])
                            
                            await supabase
                              .from('projects')
                              .update({ gantt_image_url: null })
                              .eq('id', params.id)
                            
                            loadProject()
                            setShowEditModal(false)
                          }
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload New Gantt Chart */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {editingProject.gantt_image_url ? 'Replace Gantt Chart Image' : 'Gantt Chart Image'} (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewGanttImage(e.target.files[0])}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {newGanttImage && (
                    <p className="text-sm text-green-600 mt-1">✓ New Gantt chart selected: {newGanttImage.name}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a Gantt chart showing project timeline
                  </p>
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
                    setNewProjectLogo(null)
                    setNewGanttImage(null)
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