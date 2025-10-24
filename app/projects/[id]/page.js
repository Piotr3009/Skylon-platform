'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { getCategoryIcon, getCategoryColor } from '@/lib/categoryIcons'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `£${(value / 1_000).toFixed(0)}k`
  return `£${Math.round(value)}`
}

export default function PublicProjectPage() {
  const [project, setProject] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const params = useParams()
  const categoryRefs = useRef({})

  useEffect(() => {
    checkUser()
    loadProjectDetails()
  }, [])

  // Scroll to category when URL has category parameter
  useEffect(() => {
    if (typeof window === 'undefined' || loading || categories.length === 0) return

    const urlParams = new URLSearchParams(window.location.search)
    const categoryId = urlParams.get('category')

    if (categoryId) {
      const element = categoryRefs.current[categoryId]
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Add highlight effect
          element.classList.add('ring-4', 'ring-blue-400', 'ring-offset-4')
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-blue-400', 'ring-offset-4')
          }, 3000)
        }, 300)
      } else {
        console.log('Category element not found for ID:', categoryId)
        console.log('Available refs:', Object.keys(categoryRefs.current))
      }
    }
  }, [loading, categories])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadProjectDetails = async () => {
    setLoading(true)

    // Load project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()

    if (projectError) {
      console.error('Project error:', projectError)
      setLoading(false)
      return
    }

    setProject(projectData)

    // Load categories with tasks
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('project_id', params.id)
      .order('display_order')

    if (categoriesError) {
      console.error('Categories error:', categoriesError)
      setLoading(false)
      return
    }

    // Load tasks for these categories
    const categoryIds = categoriesData.map(c => c.id)

    if (categoryIds.length > 0) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, name, status, suggested_price, estimated_duration, short_description, category_id')
        .in('category_id', categoryIds)
        .order('created_at', { ascending: true })

      if (!tasksError) {
        const categoriesWithTasks = categoriesData.map(category => ({
          ...category,
          tasks: tasksData.filter(task => task.category_id === category.id)
        }))
        setCategories(categoriesWithTasks)
      }
    } else {
      setCategories(categoriesData)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:underline"
          >
            Return to homepage
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  project.status === 'active' ? 'bg-green-100 text-green-800' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-gray-600 max-w-3xl">{project.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {user ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => router.push('/register')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Register to Bid
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            {project.start_date && (
              <div>
                <span className="text-gray-500">Start:</span>{' '}
                <span className="font-medium text-gray-900">
                  {new Date(project.start_date).toLocaleDateString('en-GB')}
                </span>
              </div>
            )}
            {project.end_date && (
              <div>
                <span className="text-gray-500">Target completion:</span>{' '}
                <span className="font-medium text-gray-900">
                  {new Date(project.end_date).toLocaleDateString('en-GB')}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Trade packages:</span>{' '}
              <span className="font-medium text-gray-900">{categories.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Gantt Chart */}
      {project.gantt_image_url && (
        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Project Timeline</h2>
            <img
              src={project.gantt_image_url}
              alt="Project Gantt Chart"
              className="w-full rounded-lg"
            />
          </div>
        </section>
      )}

      {/* Categories & Tasks */}
      <section className="max-w-7xl mx-auto px-4 py-6 pb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Trade Packages & Tasks</h2>

        {categories.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No trade packages have been published yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category) => (
              <div
                key={category.id}
                ref={(el) => categoryRefs.current[category.id] = el}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300"
              >
                <div className={`px-6 py-4 border-b border-gray-200 ${getCategoryColor(category.name)}`}>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = getCategoryIcon(category.name)
                      return <Icon className="w-6 h-6" />
                    })()}
                    <h3 className="text-lg font-bold">{category.name}</h3>
                  </div>
                </div>

                <div className="p-6">
                  {category.tasks && category.tasks.length > 0 ? (
                    <div className="space-y-3">
                      {category.tasks.map((task) => {
                        const Icon = getCategoryIcon(category.name)
                        return (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer group"
                            onClick={() => router.push(`/projects/${params.id}/task/${task.id}`)}
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`flex-shrink-0 p-2 rounded-lg ${getCategoryColor(category.name)}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                                  {task.name}
                                </div>
                                {task.short_description && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    {task.short_description}
                                  </div>
                                )}
                                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                  {task.suggested_price && (
                                    <span>Budget: {formatCurrency(task.suggested_price)}</span>
                                  )}
                                  {task.estimated_duration && (
                                    <span>Duration: {task.estimated_duration} days</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                task.status === 'open' ? 'bg-green-100 text-green-800' :
                                task.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                task.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {task.status}
                              </span>
                              <svg
                                className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No tasks published in this category yet
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer CTA */}
      {!user && (
        <section className="bg-blue-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to submit your proposal?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Register as a subcontractor to bid on tasks and grow your business with Skylon Build Network.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => router.push('/register')}
                className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Create Account
              </button>
              <button
                onClick={() => router.push('/login')}
                className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Login
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
