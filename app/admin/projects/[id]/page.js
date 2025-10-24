'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { getCategoryIcon, getCategoryColor } from '@/lib/categoryIcons'

export default function ProjectDetailPage() {
  const [profile, setProfile] = useState(null)
  const [project, setProject] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    console.log('🚀 useEffect started, project ID:', params.id)
    checkAuth()
    loadProject()
    loadCategories()
  }, [])

  const checkAuth = async () => {
    console.log('🔐 Checking auth...')
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
    console.log('✅ Auth OK, role:', profileData?.role)
  }

  const loadProject = async () => {
    console.log('📋 Loading project...')
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()

    console.log('Project data:', data)
    console.log('Project error:', error)

    if (!error) {
      setProject(data)
    }
    setLoading(false)
  }

  const loadCategories = async () => {
    console.log('🔍 START loadCategories')
    console.log('Project ID:', params.id)
    
    // Pobierz kategorie
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('project_id', params.id)
      .order('display_order')

    if (categoriesError) {
      console.log('💥 BŁĄD kategorii:', categoriesError)
      return
    }

    // Pobierz wszystkie tasks dla tych kategorii
    const categoryIds = categoriesData.map(c => c.id)
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, status, suggested_price, category_id')
      .in('category_id', categoryIds)

    if (tasksError) {
      console.log('💥 BŁĄD tasks:', tasksError)
      return
    }

    console.log('📦 Categories:', categoriesData.length)
    console.log('📦 Tasks:', tasksData.length)

    // Połącz tasks z kategoriami
    const categoriesWithTasks = categoriesData.map(category => ({
      ...category,
      tasks: tasksData.filter(task => task.category_id === category.id)
    }))

    console.log('✅ Categories with tasks:', categoriesWithTasks)
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

    const { error } = await supabase
      .from('projects')
      .update({
        name: editingProject.name,
        description: editingProject.description,
        status: editingProject.status,
        start_date: editingProject.start_date,
        end_date: editingProject.end_date
      })
      .eq('id', params.id)

    if (!error) {
      setShowEditModal(false)
      setEditingProject(null)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit Project
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Project
              </button>
              <button
                onClick={() => router.push('/admin/projects')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Back to Projects
              </button>
            </div>
          </div>
          {project?.description && (
            <p className="text-gray-600">{project.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            {project?.start_date && (
              <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
            )}
            {project?.end_date && (
              <span>End: {new Date(project.end_date).toLocaleDateString()}</span>
            )}
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
              {project?.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
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
                              {task.suggested_price && `£${task.suggested_price}`}
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