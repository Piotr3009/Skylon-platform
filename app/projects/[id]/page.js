'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { getCategoryIcon, getCategoryColor } from '@/lib/categoryIcons'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `£${(value / 1_000).toFixed(0)}k`
  return `£${Math.round(value)}`
}

// Modern Grid Color Configuration (from Gemini design)
const colorConfigs = {
  slate: { 
    border: 'border-slate-400', 
    bg: 'bg-slate-500', 
    text: 'text-slate-600', 
    light: 'bg-slate-50',
    accent: 'border-slate-100',
  },
  indigo: { 
    border: 'border-indigo-500', 
    bg: 'bg-indigo-600', 
    text: 'text-indigo-600', 
    light: 'bg-indigo-50',
    accent: 'border-indigo-100',
  },
  amber: { 
    border: 'border-amber-500', 
    bg: 'bg-amber-500', 
    text: 'text-amber-600', 
    light: 'bg-amber-50',
    accent: 'border-amber-100',
  },
  yellow: { 
    border: 'border-yellow-400', 
    bg: 'bg-yellow-500', 
    text: 'text-yellow-600', 
    light: 'bg-yellow-50',
    accent: 'border-yellow-100',
  },
  sky: { 
    border: 'border-sky-500', 
    bg: 'bg-sky-600', 
    text: 'text-sky-600', 
    light: 'bg-sky-50',
    accent: 'border-sky-100',
  },
  rose: { 
    border: 'border-rose-400', 
    bg: 'bg-rose-500', 
    text: 'text-rose-600', 
    light: 'bg-rose-50',
    accent: 'border-rose-100',
  },
  emerald: { 
    border: 'border-emerald-500', 
    bg: 'bg-emerald-500', 
    text: 'text-emerald-600', 
    light: 'bg-emerald-50',
    accent: 'border-emerald-100',
  },
  purple: { 
    border: 'border-purple-500', 
    bg: 'bg-purple-500', 
    text: 'text-purple-600', 
    light: 'bg-purple-50',
    accent: 'border-purple-100',
  },
  cyan: { 
    border: 'border-cyan-500', 
    bg: 'bg-cyan-500', 
    text: 'text-cyan-600', 
    light: 'bg-cyan-50',
    accent: 'border-cyan-100',
  },
  red: { 
    border: 'border-red-500', 
    bg: 'bg-red-500', 
    text: 'text-red-600', 
    light: 'bg-red-50',
    accent: 'border-red-100',
  },
  teal: { 
    border: 'border-teal-500', 
    bg: 'bg-teal-500', 
    text: 'text-teal-600', 
    light: 'bg-teal-50',
    accent: 'border-teal-100',
  },
  orange: { 
    border: 'border-orange-500', 
    bg: 'bg-orange-500', 
    text: 'text-orange-600', 
    light: 'bg-orange-50',
    accent: 'border-orange-100',
  },
  blue: { 
    border: 'border-blue-500', 
    bg: 'bg-blue-600', 
    text: 'text-blue-600', 
    light: 'bg-blue-50',
    accent: 'border-blue-100',
  },
  pink: { 
    border: 'border-pink-500', 
    bg: 'bg-pink-500', 
    text: 'text-pink-600', 
    light: 'bg-pink-50',
    accent: 'border-pink-100',
  },
}

const getCategoryGridColor = (categoryName = '') => {
  const normalized = categoryName.toLowerCase()
  
  const categoryColors = {
    demolition: 'red',
    groundworks: 'amber',
    structural: 'slate',
    external: 'orange',
    roofing: 'teal',
    joinery: 'amber',
    internal: 'indigo',
    carpentry: 'yellow',
    plumbing: 'blue',
    electrical: 'yellow',
    mechanical: 'sky',
    plastering: 'amber',
    flooring: 'slate',
    finishing: 'rose',
    specialist: 'pink',
  }
  
  const keywords = {
    demolition: ['demolition', 'clearance'],
    groundworks: ['groundworks', 'foundations'],
    structural: ['structural', 'steel'],
    external: ['external', 'cladding'],
    roofing: ['roofing', 'roof', 'loft'],
    joinery: ['joinery', 'doors'],
    internal: ['internal', 'partitions'],
    carpentry: ['carpentry', 'timber'],
    plumbing: ['plumbing', 'drainage'],
    electrical: ['electrical', 'lighting'],
    mechanical: ['mechanical', 'hvac', 'ac', 'vrf'],
    plastering: ['plastering', 'drylining'],
    flooring: ['flooring', 'floor'],
    finishing: ['finishing', 'paint', 'decor'],
    specialist: ['specialist', 'fire']
  }

  for (const [key, terms] of Object.entries(keywords)) {
    if (terms.some(term => normalized.includes(term))) {
      return colorConfigs[categoryColors[key]] || colorConfigs.slate
    }
  }
  
  return colorConfigs.slate
}

const formatDeadline = (deadline) => {
  if (!deadline) return null
  
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffMs = deadlineDate - now
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMs < 0) return { text: 'Closed', className: 'text-gray-500', urgent: false }
  if (diffHours < 6) return { text: `${diffHours}h left`, className: 'text-red-600', urgent: true }
  if (diffHours < 24) return { text: `${diffHours}h left`, className: 'text-orange-600', urgent: true }
  if (diffDays < 3) return { text: `${diffDays}d left`, className: 'text-yellow-600', urgent: false }
  return { text: `${diffDays}d left`, className: 'text-gray-600', urgent: false }
}

const getOfferDisplay = (count) => {
  if (count === 0) return 'Be first!'
  if (count <= 2) return `${count} offer${count > 1 ? 's' : ''}`
  return '3+ offers'
}

export default function PublicProjectPage() {
  const [project, setProject] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [showGanttModal, setShowGanttModal] = useState(false)
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const categoryRefs = useRef({})

  useEffect(() => {
    checkUser()
    loadProjectDetails()
  }, [])

  // Scroll to category when URL has category parameter
  useEffect(() => {
    const categoryId = searchParams.get('category')
    if (categoryId && !loading && categories.length > 0) {
      const element = categoryRefs.current[categoryId]
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // Add highlight effect
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
          }, 2000)
        }, 100)
      }
    }
  }, [searchParams, loading, categories])

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
      setLoading(false)
      return
    }

    // Load tasks for these categories
    const categoryIds = categoriesData.map(c => c.id)
    
    if (categoryIds.length > 0) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, name, status, suggested_price, budget_min, budget_max, estimated_duration, short_description, category_id, bid_deadline')
        .in('category_id', categoryIds)
        .order('created_at', { ascending: true })

      if (!tasksError && tasksData) {
        // Load proposal counts for all tasks
        const taskIds = tasksData.map(t => t.id)
        const { data: proposalsData } = await supabase
          .from('bids')
          .select('task_id')
          .in('task_id', taskIds)
        
        // Count proposals per task
        const proposalCounts = {}
        if (proposalsData) {
          proposalsData.forEach(p => {
            proposalCounts[p.task_id] = (proposalCounts[p.task_id] || 0) + 1
          })
        }

        // Add proposal count to each task
        const tasksWithCounts = tasksData.map(task => ({
          ...task,
          proposalCount: proposalCounts[task.id] || 0
        }))

        const categoriesWithTasks = categoriesData.map(category => ({
          ...category,
          tasks: tasksWithCounts.filter(task => task.category_id === category.id)
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
            <div className="flex-1">
              {/* Project name with image */}
              <div className="flex items-center gap-4 mb-2">
                {/* Project image */}
                {project.project_image_url ? (
                  <img 
                    src={project.project_image_url} 
                    alt={project.name}
                    className="w-24 h-24 object-cover rounded-lg border-2 border-indigo-300 flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center border-2 border-indigo-300 flex-shrink-0">
                    <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-3">
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
                </div>
              </div>
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

          <div className="flex flex-wrap gap-6 text-sm border-t border-gray-100 pt-4">
            {project.start_date && (
              <div>
                <span className="font-semibold text-gray-700">Start:</span>{' '}
                <span className="text-gray-600">
                  {new Date(project.start_date).toLocaleDateString('en-GB')}
                </span>
              </div>
            )}
            {project.end_date && (
              <div>
                <span className="font-semibold text-gray-700">Target completion:</span>{' '}
                <span className="text-gray-600">
                  {new Date(project.end_date).toLocaleDateString('en-GB')}
                </span>
              </div>
            )}
            <div>
              <span className="font-semibold text-gray-700">Trade packages:</span>{' '}
              <span className="text-gray-600">{categories.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Project Description Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Project Description
          </h2>
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6">
            {project.description ? (
              <div>
                <p className="text-sm text-gray-700 font-semibold mb-2">📋 About This Project:</p>
                <p className="text-gray-700 leading-relaxed">
                  {project.description}
                </p>
              </div>
            ) : (
              <p className="text-gray-600 italic">
                Detailed project description will be added soon. Please check individual trade packages for specific requirements.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Selection Criteria Banner */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                🏆 How We Select Subcontractors
              </h3>
              <p className="text-gray-700 mb-3 text-sm leading-relaxed">
                We choose our partners based on comprehensive evaluation criteria. 
                <strong className="text-gray-900"> We don&apos;t just accept the lowest bid.</strong>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-2 border-2 border-blue-300">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                    </svg>
                    <span className="text-xs font-semibold text-blue-900">Quality</span>
                  </div>
                  <p className="text-xs text-blue-700">Excellence in workmanship</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-2 border-2 border-blue-300">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="text-xs font-semibold text-blue-900">Timeliness</span>
                  </div>
                  <p className="text-xs text-blue-700">On-time delivery</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-2 border-2 border-blue-300">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    <span className="text-xs font-semibold text-blue-900">Professionalism</span>
                  </div>
                  <p className="text-xs text-blue-700">Professional conduct</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-2 border-2 border-blue-300">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                    <span className="text-xs font-semibold text-blue-900">Health & Safety</span>
                  </div>
                  <p className="text-xs text-blue-700">Safety compliance</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-2 border-2 border-blue-300">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="text-xs font-semibold text-blue-900">Price</span>
                  </div>
                  <p className="text-xs text-blue-700">Competitive value</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gantt Chart */}
      {project.gantt_image_url && (
        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Project Timeline</h2>
            <img
              src={project.gantt_image_url}
              alt="Project Gantt Chart"
              className="w-full rounded-lg cursor-pointer hover:opacity-90 transition"
              onClick={() => setShowGanttModal(true)}
            />
          </div>
        </section>
      )}

      {/* Categories & Tasks - Modern Grid Design */}
      <section className="max-w-7xl mx-auto px-4 py-6 pb-12">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-6">Trade Packages & Tasks</h2>

        {categories.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No trade packages have been published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const config = getCategoryGridColor(category.name)
              const Icon = getCategoryIcon(category.name)
              const hasTasks = category.tasks && category.tasks.length > 0
              
              return (
                <div 
                  key={category.id}
                  ref={(el) => categoryRefs.current[category.id] = el}
                  className={`group relative flex flex-col bg-white rounded-3xl border-2 transition-all duration-500 hover:-translate-y-2
                    ${config.border} ${hasTasks ? 'border-opacity-100 shadow-2xl' : 'border-opacity-20 hover:border-opacity-100'}
                  `}
                >
                  {/* Top Indicator Accent */}
                  <div className={`absolute top-0 left-0 w-full h-2 rounded-t-3xl ${config.bg} opacity-20`} />

                  <div className="p-7 flex flex-col h-full">
                    {/* Header with Icon and Status */}
                    <div className="flex justify-between items-start mb-8">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 transform group-hover:rotate-6
                        ${hasTasks ? `${config.bg} text-white shadow-lg` : `${config.light} ${config.text} opacity-60`}
                      `}>
                        <Icon className="w-8 h-8" strokeWidth={2.2} />
                      </div>
                      
                      {hasTasks ? (
                        <div className="flex flex-col items-end">
                          <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${config.bg} text-white`}>
                            {category.tasks.length} Task{category.tasks.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-400">
                          Coming Soon
                        </span>
                      )}
                    </div>

                    {/* Category Title */}
                    <h3 className={`text-2xl font-black mb-4 leading-tight tracking-tighter ${hasTasks ? 'text-slate-900' : 'text-slate-400'}`}>
                      {category.name}
                    </h3>

                    {/* Tasks */}
                    <div className="flex-grow">
                      {hasTasks ? (
                        <div className="space-y-4">
                          {category.tasks.map(task => (
                            <div 
                              key={task.id} 
                              onClick={() => router.push(`/projects/${params.id}/task/${task.id}`)}
                              className={`p-5 rounded-2xl border-2 ${config.accent} bg-gradient-to-br from-white to-slate-50 cursor-pointer hover:shadow-md transition-all`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="text-sm font-black text-slate-800">{task.name}</div>
                                <svg className={`w-4 h-4 ${config.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                              <div className="flex items-center gap-3">
                                {(task.budget_min || task.budget_max) && (
                                  <div className={`flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-white shadow-sm px-3 py-2 rounded-xl border border-slate-100 flex-1`}>
                                    <svg className={`w-3.5 h-3.5 ${config.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {task.budget_min && task.budget_max 
                                      ? `£${task.budget_min.toLocaleString()}`
                                      : formatCurrency(task.budget_min || task.budget_max)}
                                  </div>
                                )}
                                {task.estimated_duration && (
                                  <div className={`flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-white shadow-sm px-3 py-2 rounded-xl border border-slate-100 flex-1`}>
                                    <svg className={`w-3.5 h-3.5 ${config.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {task.estimated_duration} days
                                  </div>
                                )}
                              </div>
                              
                              {/* Status badge */}
                              <div className="mt-3 flex justify-between items-center">
                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ${
                                  task.status === 'open' ? 'bg-green-100 text-green-700' :
                                  task.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                                  task.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {task.status}
                                </span>
                                
                                {task.status === 'open' && task.proposalCount !== undefined && (
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {task.proposalCount === 0 ? 'Be first!' : `${task.proposalCount} offer${task.proposalCount > 1 ? 's' : ''}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`mt-2 p-4 rounded-2xl border border-dashed ${config.border} border-opacity-30 bg-slate-50/50`}>
                          <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                            Specifications are being prepared for this trade package.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
                      <button 
                        onClick={() => hasTasks && router.push(`/projects/${params.id}/task/${category.tasks[0]?.id}`)}
                        className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-tighter transition-all
                          ${hasTasks ? 'text-slate-900 hover:tracking-widest' : 'text-slate-300 pointer-events-none'}
                        `}
                      >
                        View Details 
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
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

      {/* Gantt Modal */}
      {showGanttModal && project?.gantt_image_url && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowGanttModal(false)}
        >
          <div className="relative w-[95vw] max-w-[1800px] max-h-[95vh] overflow-auto bg-white rounded-lg shadow-2xl">
            <button
              onClick={() => setShowGanttModal(false)}
              className="sticky top-4 right-4 float-right bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-red-600 transition z-10 text-xl font-bold shadow-lg"
            >
              ✕
            </button>
            <img
              src={project.gantt_image_url}
              alt="Gantt Chart"
              className="w-full h-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}