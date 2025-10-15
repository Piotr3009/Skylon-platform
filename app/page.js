'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CATEGORY_PRESETS = [
  {
    keywords: ['demolition', 'strip', 'clearance'],
    color: 'bg-rose-50 text-rose-600 border border-rose-200',
    Icon: (props) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M4 20h16" />
        <path d="M6 20v-6l5-5 4 4-5 5" />
        <path d="M14 10l3-3 2 2-3 3" />
      </svg>
    )
  },
  {
    keywords: ['ground', 'foundation', 'excavation'],
    color: 'bg-amber-50 text-amber-600 border border-amber-200',
    Icon: (props) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M3 17h18" />
        <path d="M6 13l3-8h6l3 8" />
        <path d="M9 13l1.5-4h3L15 13" />
      </svg>
    )
  },
  {
    keywords: ['electrical', 'lighting', 'power'],
    color: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
    Icon: (props) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
      </svg>
    )
  },
  {
    keywords: ['mechanical', 'hvac', 'ac', 'vent'],
    color: 'bg-cyan-50 text-cyan-600 border border-cyan-200',
    Icon: (props) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5V3" />
        <path d="M12 21v-2" />
        <path d="M5 12H3" />
        <path d="M21 12h-2" />
        <path d="M6.8 6.8l-1.4-1.4" />
        <path d="M18.6 19.4l-1.4-1.4" />
        <path d="M17.2 6.8l1.4-1.4" />
        <path d="M5.4 19.4l1.4-1.4" />
      </svg>
    )
  },
  {
    keywords: ['finishing', 'paint', 'decor'],
    color: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    Icon: (props) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M4 4h12v6H4z" />
        <path d="M9 10v10" />
        <path d="M6 20h6" />
        <path d="M16 4l4 4-4 4" />
      </svg>
    )
  },
  {
    keywords: ['joinery', 'carpentry', 'wood'],
    color: 'bg-orange-50 text-orange-600 border border-orange-200',
    Icon: (props) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M4 6h16v4H4z" />
        <path d="M6 10v8" />
        <path d="M18 10v8" />
        <path d="M9 10v8" />
        <path d="M15 10v8" />
      </svg>
    )
  }
]

const DEFAULT_CATEGORY_STYLE = {
  color: 'bg-slate-50 text-slate-600 border border-slate-200',
  Icon: (props) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </svg>
  )
}

const clampCategories = (categories) => categories.slice(0, 8)

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  if (value >= 1_000_000) {
    return `£${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `£${(value / 1_000).toFixed(1)}k`
  }
  return `£${Math.round(value)}`
}

const formatDuration = (days) => {
  if (!days) return '—'
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'}`
  }
  const weeks = Math.round(days / 7)
  return `${weeks} wk`
}

const parseDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const formatDate = (value) => {
  const date = parseDate(value)
  return date ? date.toLocaleDateString() : null
}

const formatDateRange = (start, end) => {
  const startDate = parseDate(start)
  const endDate = parseDate(end)

  if (!startDate || !endDate) return null

  const options = { month: 'short', day: 'numeric' }
  return `${startDate.toLocaleDateString(undefined, options)} – ${endDate.toLocaleDateString(undefined, options)}`
}

const getCategoryStyle = (name = '') => {
  const normalized = name.toLowerCase()
  return (
    CATEGORY_PRESETS.find((preset) =>
      preset.keywords.some((keyword) => normalized.includes(keyword))
    ) || DEFAULT_CATEGORY_STYLE
  )
}

const determineBuildingType = (project) => {
  const source = `${project?.name ?? ''} ${project?.description ?? ''}`.toLowerCase()
  if (source.match(/restaurant|hospitality|retail|fit[- ]?out/)) return 'hospitality'
  if (source.match(/residential|apartment|housing/)) return 'residential'
  if (source.match(/warehouse|industrial|logistics/)) return 'industrial'
  return 'office'
}

const BuildingIcon = ({ type }) => {
  switch (type) {
    case 'industrial':
      return (
        <svg
          viewBox="0 0 120 120"
          className="h-40 w-40 text-slate-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <rect x="12" y="50" width="96" height="58" rx="6" className="fill-white/70" />
          <path d="M12 74h96" />
          <path d="M36 50V30l18 10V30l18 10V30l18 10" />
          <path d="M36 94h12M60 94h12M84 94h12" />
        </svg>
      )
    case 'hospitality':
      return (
        <svg
          viewBox="0 0 120 120"
          className="h-40 w-40 text-slate-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M20 98h80" />
          <path d="M20 98V46l40-24 40 24v52" className="fill-white/70" />
          <path d="M44 98V66h12v32" />
          <path d="M64 98V66h12v32" />
          <path d="M40 46h40" />
          <path d="M52 34h16" />
        </svg>
      )
    case 'residential':
      return (
        <svg
          viewBox="0 0 120 120"
          className="h-40 w-40 text-slate-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M20 94h80" />
          <path d="M24 94V56l36-26 36 26v38" className="fill-white/70" />
          <path d="M48 94V74h24v20" />
          <path d="M34 66h12M74 66h12" />
          <path d="M20 56h80" />
        </svg>
      )
    default:
      return (
        <svg
          viewBox="0 0 120 120"
          className="h-40 w-40 text-slate-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <rect x="28" y="28" width="64" height="64" rx="6" className="fill-white/70" />
          <path d="M44 28v-8h32v8" />
          <path d="M44 48h8M68 48h8M44 64h8M68 64h8M44 80h8M68 80h8" />
          <path d="M52 92v12M68 92v12" />
        </svg>
      )
  }
}

const CategoryNode = ({ name }) => {
  const { color, Icon } = getCategoryStyle(name)
  return (
    <div
      className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl bg-white/90 backdrop-blur border shadow-sm ${color}`}
    >
      <Icon className="h-8 w-8" />
      <span className="mt-1 text-center text-xs font-semibold leading-tight">
        {name.length > 14 ? `${name.slice(0, 12)}…` : name}
      </span>
    </div>
  )
}

const ProjectTree = ({ project }) => {
  const categories = clampCategories(project.categories ?? [])
  const total = categories.length
  const buildingType = determineBuildingType(project)

  return (
    <div className="relative mx-auto flex h-[360px] w-full max-w-md items-center justify-center">
      <div className="absolute inset-6 rounded-[36px] bg-gradient-to-br from-white/80 via-white/60 to-indigo-50/70 shadow-lg" />
      <div className="absolute inset-6 blur-3xl bg-indigo-200/40" />
      <div className="relative z-10 flex items-center justify-center">
        <div className="relative flex items-center justify-center rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-xl">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-slate-50 opacity-80" />
          <div className="relative">
            <BuildingIcon type={buildingType} />
            <div className="mt-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
              {buildingType}
            </div>
          </div>
        </div>
      </div>

      {total === 0 && (
        <div className="absolute -bottom-6 left-1/2 w-full -translate-x-1/2 text-center text-sm text-slate-500">
          Categories will appear here once scoped.
        </div>
      )}

      {categories.map((category, index) => {
        const angle = (index / total) * Math.PI * 2 - Math.PI / 2
        const distance = 150
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        const branchLength = distance - 70
        const rotation = angle * (180 / Math.PI)

        return (
          <div key={category.id || `${category.name}-${index}`} className="absolute inset-0">
            <div
              className="absolute left-1/2 top-1/2 origin-left"
              style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
            >
              <span className="block h-[2px] bg-slate-200" style={{ width: `${branchLength}px` }} />
            </div>

            <div
              className="absolute left-1/2 top-1/2"
              style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
            >
              <CategoryNode name={category.name} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const HeroStat = ({ value, label }) => (
  <div className="rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-left shadow-sm backdrop-blur">
    <div className="text-3xl font-bold text-white drop-shadow-sm">{value}</div>
    <div className="mt-1 text-sm font-medium uppercase tracking-wide text-white/80">{label}</div>
  </div>
)

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (projectsError) {
        throw projectsError
      }

      if (!projectsData || projectsData.length === 0) {
        setProjects([])
        setLoading(false)
        return
      }

      const projectIds = projectsData.map((project) => project.id)
      const uniqueProjectIds = [...new Set(projectIds)].filter(Boolean)

      let categoriesData = []
      if (uniqueProjectIds.length) {
        const { data: fetchedCategories, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, project_id, display_order')
          .in('project_id', uniqueProjectIds)
          .order('display_order', { ascending: true })

        if (categoriesError) {
          throw categoriesError
        }

        categoriesData = fetchedCategories ?? []
      }

      let tasksData = []
      const categoryIds = categoriesData.map((category) => category.id)
      if (categoryIds.length) {
        const { data: fetchedTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, category_id, status, suggested_price, estimated_duration')
          .in('category_id', categoryIds)

        if (tasksError) {
          throw tasksError
        }

        tasksData = fetchedTasks ?? []
      }

      const categoriesWithTasks = categoriesData.map((category) => ({
        ...category,
        tasks: tasksData.filter((task) => task.category_id === category.id)
      }))

      const categoriesByProject = categoriesWithTasks.reduce((acc, category) => {
        if (!acc[category.project_id]) {
          acc[category.project_id] = []
        }
        acc[category.project_id].push(category)
        return acc
      }, {})

      const enhancedProjects = projectsData.map((project) => {
        const projectCategories = categoriesByProject[project.id] ?? []
        const totalTasks = projectCategories.reduce((sum, category) => sum + category.tasks.length, 0)
        const totalBudget = projectCategories.reduce(
          (sum, category) =>
            sum +
            category.tasks.reduce((taskSum, task) => taskSum + (Number(task.suggested_price) || 0), 0),
          0
        )
        const totalDuration = projectCategories.reduce(
          (sum, category) =>
            sum +
            category.tasks.reduce((taskSum, task) => taskSum + (Number(task.estimated_duration) || 0), 0),
          0
        )

        return {
          ...project,
          categories: projectCategories,
          meta: {
            categories: projectCategories.length,
            tasks: totalTasks,
            budget: totalBudget,
            duration: totalDuration
          }
        }
      })

      setProjects(enhancedProjects)
    } catch (err) {
      console.error('Failed to load projects', err)
      setError('Unable to load projects from Supabase at the moment. Please try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  const heroStats = useMemo(() => {
    if (!projects.length) {
      return [
        { value: '0', label: 'Active Projects' },
        { value: '0', label: 'Packages to Bid' },
        { value: '—', label: 'Total Budget Live' }
      ]
    }

    const totalCategories = projects.reduce((sum, project) => sum + (project.meta?.categories ?? 0), 0)
    const totalBudget = projects.reduce((sum, project) => sum + (project.meta?.budget ?? 0), 0)

    return [
      { value: projects.length, label: 'Active Projects' },
      { value: totalCategories, label: 'Packages to Bid' },
      { value: formatCurrency(totalBudget), label: 'Total Budget Live' }
    ]
  }, [projects])

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="relative border-b border-white/10 bg-slate-900/70 backdrop-blur">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.25),_transparent_60%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-white">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Skylon Build Network</h1>
            <p className="mt-1 text-sm text-white/70">
              Commercial refurbishment packages for subcontractors in Central London.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/login')}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10"
            >
              Log in
            </button>
            <button
              onClick={() => router.push('/register')}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
            >
              Become a subcontractor
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 py-20 text-white md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              Commercial Refurbishment Packages
            </span>
            <h2 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">
              Break down complex fit-out projects into clear trade packages ready for bid.
            </h2>
            <p className="mt-6 text-lg text-white/70">
              Our coordinators publish scope, drawings, programme expectations and suggested budgets for every workstream. Join the trusted network of London subcontractors and win the packages that match your crew.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => router.push('/register')}
                className="rounded-2xl bg-white px-6 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-white/20 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Create subcontractor profile
              </button>
              <button
                onClick={() => router.push('/login')}
                className="rounded-2xl border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:border-white/60 hover:bg-white/10"
              >
                Explore active packages
              </button>
            </div>
          </div>

          <div className="grid w-full max-w-sm grid-cols-1 gap-4 sm:grid-cols-2">
            {heroStats.map((stat) => (
              <HeroStat key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h3 className="text-center text-3xl font-bold text-slate-900">
            How project packages flow through Skylon
          </h3>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Scope & programme published',
                body:
                  'Our project coordinators split the master schedule into focused trade packages with drawings, technical notes and target dates.'
              },
              {
                title: 'Subcontractors submit proposals',
                body:
                  'Prequalified partners review the package board, ask clarification questions and drop in their pricing with resource availability.'
              },
              {
                title: 'Award & deliver with clarity',
                body:
                  'Winning teams get access to shared files, real-time programme updates and milestone tracking tied to the main commercial fit-out.'
              }
            ].map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-600">
                  0{index + 1}
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-4 text-center">
            <h3 className="text-3xl font-bold text-slate-900">Active project trees</h3>
            <p className="text-base text-slate-600">
              Click into a project to review every package, documents and submit your price for the workstream you can deliver.
            </p>
          </div>

          {error && (
            <div className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-12 grid gap-10">
              {[...Array(3).keys()].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-3xl border border-slate-200/70 bg-white/80 p-10"
                >
                  <div className="h-6 w-2/3 rounded-full bg-slate-200/70" />
                  <div className="mt-4 h-4 w-full rounded-full bg-slate-200/60" />
                  <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-200/60" />
                  <div className="mt-8 h-48 rounded-3xl bg-slate-200/50" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 space-y-14">
              {projects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                  No active refurbishment projects are open for bidding right now. Check back soon or contact our team for upcoming tenders.
                </div>
              ) : (
                projects.map((project, index) => {
                  const formattedStart = formatDate(project.start_date)
                  const formattedEnd = formatDate(project.end_date)
                  const procurementWindow = formatDateRange(project.start_date, project.end_date)

                  return (
                    <article
                      key={project.id}
                      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-100" />
                      <div className="relative grid gap-10 p-10 md:grid-cols-2 md:items-center">
                        <div className={`order-2 ${index % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
                          <ProjectTree project={project} />
                        </div>
                        <div className={`order-1 flex flex-col gap-6 ${index % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
                          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-indigo-500">
                            <span>Project</span>
                            <span className="h-1 w-1 rounded-full bg-indigo-500" />
                            <span>{project.status}</span>
                            {project.meta?.categories ? <span className="h-1 w-1 rounded-full bg-indigo-500" /> : null}
                            {project.meta?.categories ? <span>{project.meta.categories} packages</span> : null}
                          </div>
                          <div>
                            <h4 className="text-3xl font-bold text-slate-900">{project.name}</h4>
                            {project.description && (
                              <p className="mt-3 text-base leading-relaxed text-slate-600">{project.description}</p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Suggested Budget
                              </div>
                              <div className="mt-2 text-xl font-bold text-slate-900">
                                {formatCurrency(project.meta?.budget ?? 0)}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Packages</div>
                              <div className="mt-2 text-xl font-bold text-slate-900">{project.meta?.categories ?? 0}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Combined Duration
                              </div>
                              <div className="mt-2 text-xl font-bold text-slate-900">
                                {formatDuration(project.meta?.duration)}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm text-slate-500">
                            <div className="flex flex-wrap items-center gap-4">
                              {formattedStart && <span>Start: {formattedStart}</span>}
                              {formattedEnd && <span>Target completion: {formattedEnd}</span>}
                              {project.meta?.tasks ? <span>{project.meta.tasks} scoped tasks</span> : null}
                            </div>
                            {procurementWindow ? (
                              <div>
                                <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                                  <span>Procurement window</span>
                                  <span>{procurementWindow}</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" />
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {project.gantt_image_url && (
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                              <img
                                src={project.gantt_image_url}
                                alt={`${project.name} Gantt preview`}
                                className="h-40 w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap gap-4">
                            <button
                              onClick={() => router.push(`/projects/${project.id}`)}
                              className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:bg-indigo-400"
                            >
                              View package board
                            </button>
                            <button
                              onClick={() => router.push('/register')}
                              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                            >
                              I want to price this scope
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Skylon Commercial Refurbishment. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <span>info@skylonbuild.com</span>
            <span>+44 (0)20 1234 5678</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
