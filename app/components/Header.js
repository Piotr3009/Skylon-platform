'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

<<<<<<< HEAD
  useEffect(() => {
    checkAuth()
    loadProjects()
  }, [])
=======
  const headerClasses = gradient
    ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 shadow-lg border-b border-indigo-800"
    : "bg-white shadow-sm border-b border-gray-200"
>>>>>>> parent of ce14f96 (redesign)

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()

<<<<<<< HEAD
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
    setLoading(true)

    // Load all projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('Error loading projects:', projectsError)
      setLoading(false)
      return
    }

    if (!projectsData || projectsData.length === 0) {
      setProjects([])
      setLoading(false)
      return
    }

    // Load categories for each project
    const projectIds = projectsData.map(p => p.id)
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, project_id')
      .in('project_id', projectIds)

    // Load tasks for each category
    const categoryIds = categoriesData?.map(c => c.id) || []
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, category_id, status, budget_min, budget_max, suggested_price')
      .in('category_id', categoryIds)

    // Calculate stats for each project
    const enhancedProjects = projectsData.map(project => {
      const projectCategories = categoriesData?.filter(c => c.project_id === project.id) || []
      const projectCategoryIds = projectCategories.map(c => c.id)
      const projectTasks = tasksData?.filter(t => projectCategoryIds.includes(t.category_id)) || []

      const totalBudget = projectTasks.reduce((sum, task) => {
        if (task.budget_min && task.budget_max) {
          return sum + ((Number(task.budget_min) + Number(task.budget_max)) / 2)
        }
        if (task.budget_min) return sum + Number(task.budget_min)
        if (task.budget_max) return sum + Number(task.budget_max)
        if (task.suggested_price) return sum + Number(task.suggested_price)
        return sum
      }, 0)

      const openTasks = projectTasks.filter(t => t.status === 'open').length
      const assignedTasks = projectTasks.filter(t => t.status === 'assigned').length
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length

      return {
        ...project,
        stats: {
          categories: projectCategories.length,
          tasks: projectTasks.length,
          budget: totalBudget,
          openTasks,
          assignedTasks,
          completedTasks
        }
      }
    })

    setProjects(enhancedProjects)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading projects...</div>
      </div>
    )
  }
=======
  const subtitleClasses = gradient
    ? "text-sm text-indigo-100 mt-1"
    : "text-sm text-gray-600 mt-1"
>>>>>>> parent of ce14f96 (redesign)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Manage Projects"
        subtitle="View and manage all construction projects"
        user={profile}
        profile={profile}
        onLogout={handleLogout}
        showHome={true}
        showDashboard={true}
        gradient={true}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            All Projects ({projects.length})
          </h1>
          <button
            onClick={() => router.push('/admin/create-project')}
            className="px-6 py-3 bg-[#1e3a5f] text-white font-semibold rounded-lg hover:bg-[#2a5179] transition"
          >
            + Create New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No projects yet</p>
            <button
              onClick={() => router.push('/admin/create-project')}
              className="px-6 py-3 bg-[#1e3a5f] text-white font-semibold rounded-lg hover:bg-[#2a5179] transition"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/admin/projects/${project.id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition cursor-pointer overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        project.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'completed'
                          ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Categories</div>
                      <div className="text-lg font-bold text-gray-900">
                        {project.stats.categories}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Tasks</div>
                      <div className="text-lg font-bold text-gray-900">
                        {project.stats.tasks}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1e3a5f]/5 rounded-lg p-3 mb-4">
                    <div className="text-xs text-blue-600 mb-1">Total Budget</div>
                    <div className="text-xl font-bold text-blue-900">
                      {formatCurrency(project.stats.budget)}
                    </div>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-600">{project.stats.openTasks} Open</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#1e3a5f]/50"></div>
                      <span className="text-gray-600">{project.stats.assignedTasks} Assigned</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-gray-600">{project.stats.completedTasks} Done</span>
                    </div>
                  </div>

                  {project.start_date && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Start: {new Date(project.start_date).toLocaleDateString('en-GB')}
                        {project.end_date && (
                          <> • End: {new Date(project.end_date).toLocaleDateString('en-GB')}</>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <button
                    className="text-blue-600 font-semibold text-sm hover:text-blue-700 transition"
                  >
                    View Project Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}