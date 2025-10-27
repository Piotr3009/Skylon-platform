'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLocale } from './components/LocaleProvider'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LanguageSwitcher from './components/LanguageSwitcher'

const CATEGORY_PRESETS = [
  {
    keywords: ['demolition', 'site clearance', 'strip', 'clearance'],
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
    keywords: ['groundworks', 'foundations', 'ground', 'foundation', 'excavation'],
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
    keywords: ['structural frame', 'steelwork', 'steel', 'metal', 'structural'],
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
        <path d="M6 3v18" />
        <path d="M18 3v18" />
        <path d="M6 9h12" />
        <path d="M6 15h12" />
      </svg>
    )
  },
  {
    keywords: ['external walls', 'cladding', 'facade', 'curtain wall'],
    color: 'bg-gray-50 text-gray-600 border border-gray-200',
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
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
      </svg>
    )
  },
  {
    keywords: ['roofing', 'roof', 'waterproof'],
    color: 'bg-teal-50 text-teal-600 border border-teal-200',
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
        <path d="M3 12l9-9 9 9" />
        <path d="M5 10v10h14V10" />
      </svg>
    )
  },
  {
    keywords: ['joinery installation', 'joinery', 'doors', 'windows'],
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
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <circle cx="16" cy="12" r="1" fill="currentColor" />
      </svg>
    )
  },
  {
    keywords: ['internal walls', 'partitions', 'partition', 'wall', 'drywall', 'stud'],
    color: 'bg-zinc-50 text-zinc-600 border border-zinc-200',
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
        <rect x="8" y="3" width="8" height="18" />
        <path d="M8 8h8" />
        <path d="M8 13h8" />
      </svg>
    )
  },
  {
    keywords: ['carpentry works', 'carpentry', 'timber', 'wood'],
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
        <path d="M4 6h16v4H4z" />
        <path d="M6 10v8" />
        <path d="M18 10v8" />
        <path d="M9 10v8" />
        <path d="M15 10v8" />
      </svg>
    )
  },
  {
    keywords: ['plumbing', 'drainage', 'water', 'pipes'],
    color: 'bg-blue-50 text-blue-600 border border-blue-200',
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
        <path d="M12 2v20" />
        <path d="M8 6h8" />
        <path d="M8 10h8" />
        <path d="M8 14h8" />
        <path d="M8 18h8" />
      </svg>
    )
  },
  {
    keywords: ['electrical', 'installation', 'lighting', 'power'],
    color: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
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
    keywords: ['mechanical', 'hvac', 'ac', 'vrf', 'vent'],
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
    keywords: ['plastering', 'drylining', 'plaster', 'dry lining'],
    color: 'bg-stone-50 text-stone-600 border border-stone-200',
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
    keywords: ['flooring', 'floor', 'screed', 'tiles'],
    color: 'bg-neutral-50 text-neutral-600 border border-neutral-200',
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
        <rect x="3" y="8" width="18" height="4" />
        <rect x="3" y="14" width="18" height="4" />
      </svg>
    )
  },
  {
    keywords: ['finishing', 'paint', 'decor', 'decoration'],
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
    keywords: ['external works', 'external', 'landscaping', 'site'],
    color: 'bg-green-50 text-green-600 border border-green-200',
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
        <path d="M3 20h18" />
        <path d="M6 20v-6" />
        <path d="M12 20v-10" />
        <path d="M18 20v-4" />
      </svg>
    )
  },
  {
    keywords: ['specialist', 'systems', 'fire', 'security'],
    color: 'bg-red-50 text-red-600 border border-red-200',
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
        <path d="M12 2c-1.2 2.5-2 4.5-2 7 0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.5-.8-4.5-2-7" />
        <path d="M9 14h6" />
        <path d="M12 14v8" />
        <path d="M8 22h8" />
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

const clampCategories = (categories) => categories.slice(0, 17)

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

const getProjectSchedule = (project) => {
  const formattedStart = project.start_date
    ? new Date(project.start_date).toLocaleDateString()
    : null
  const formattedEnd = project.end_date
    ? new Date(project.end_date).toLocaleDateString()
    : null
  
  let procurementWindow = null
  if (project.start_date && project.end_date) {
    const start = new Date(project.start_date)
    const end = new Date(project.end_date)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    procurementWindow = formatDuration(diffDays)
  }

  return { formattedStart, formattedEnd, procurementWindow }
}

const BuildingIcon = ({ type, projectType }) => {
  // Use projectType if available, otherwise fall back to type
  const iconType = projectType || type

  if (iconType === 'commercial') {
    return (
      <img
        src="/office-building.svg"
        alt="Commercial Building"
        className="h-50 w-50"
      />
    )
  }

  if (iconType === 'domestic') {
    return (
      <img
        src="/domestic.png"
        alt="Domestic House"
        className="h-50 w-50"
      />
    )
  }

  if (iconType === 'restaurant') {
    return (
      <img
        src="/restaurant.png"
        alt="Restaurant"
        className="h-50 w-50"
      />
    )
  }

  if (iconType === 'other') {
    return (
      <img
        src="/other-building.svg"
        alt="Other Building"
        className="h-50 w-50"
      />
    )
  }

  // Legacy support for old type strings
  switch (type) {
    case 'industrial':
      return (
        <img
          src="/other-building.svg"
          alt="Industrial Building"
          className="h-50 w-50"
        />
      )
    case 'hospitality':
      return (
        <img
          src="/restaurant.png"
          alt="Hospitality"
          className="h-50 w-50"
        />
      )
    case 'residential':
      return (
        <img
          src="/domestic.png"
          alt="Residential"
          className="h-50 w-50"
        />
      )
    default:
      return (
        <img
          src="/office-building.svg"
          alt="Office Building"
          className="h-50 w-50"
        />
      )
  }
}

const CategoryNode = ({ name, categoryId, projectId, tasks, onClick }) => {
  const { color, Icon } = getCategoryStyle(name)

  const handleClick = (e) => {
    e.stopPropagation()
    if (onClick) {
      onClick(categoryId, projectId, tasks)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`flex min-h-24 min-w-32 max-w-36 flex-col items-center justify-center rounded-2xl bg-white/90 backdrop-blur border shadow-sm p-2 ${color} ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-200' : ''}`}
    >
      <Icon className="h-6 w-6 flex-shrink-0" />
      <span className="mt-1 text-center text-[10px] font-semibold leading-tight break-words px-1">
        {name}
      </span>
    </div>
  )
}

const ProjectTree = ({ project, router }) => {
  const categories = clampCategories(project.categories ?? [])
  const total = categories.length
  const buildingType = determineBuildingType(project)
  const projectType = project.project_type || buildingType

  return (
    <div className="relative mx-auto flex h-[600px] w-full items-center justify-center">
      <div className="absolute inset-6 rounded-[36px] bg-gradient-to-br from-indigo-100/80 via-indigo-50/60 to-slate-200/70 shadow-lg z-0" />
      <div className="absolute inset-6 blur-3xl bg-indigo-300/40 z-0" />
      <div className="relative z-10 flex items-center justify-center">
        <div className="relative flex items-center justify-center rounded-3xl border border-indigo-100 bg-white/90 p-8 shadow-xl">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-slate-50 opacity-80" />
          <div className="relative">
            <BuildingIcon type={buildingType} projectType={projectType} />
            <div className="mt-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
              {projectType === 'commercial' ? 'Commercial & Domestic' :
               projectType === 'domestic' ? 'Domestic' :
               projectType === 'restaurant' ? 'Restaurant' :
               projectType === 'other' ? 'Other' : buildingType}
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
        const distance = 290  // Zwiększone z 270 na 290
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        
        // Building edge radius - strzałki zaczynają się jeszcze dalej od budynku
        const buildingRadius = 150
        
        // Start from building edge
        const startX = Math.cos(angle) * buildingRadius
        const startY = Math.sin(angle) * buildingRadius
        
        // End at icon edge - strzałki są krótsze
        const iconRadius = 75
        const endX = Math.cos(angle) * (distance - iconRadius)
        const endY = Math.sin(angle) * (distance - iconRadius)
        
        const lineLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
        const rotation = angle * (180 / Math.PI)

        // Arrow tip calculations - mniejsza strzałka
        const arrowSize = 4
        const arrowX1 = lineLength - arrowSize
        const arrowY1 = -arrowSize / 2
        const arrowY2 = arrowSize / 2

        return (
          <div key={category.id || `${category.name}-${index}`} className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
            <svg
              className="absolute overflow-visible pointer-events-none"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${startX}px), calc(-50% + ${startY}px)) rotate(${rotation}deg)`,
                width: `${lineLength}px`,
                height: '20px',
                zIndex: 100
              }}
            >
              <line
                x1="0"
                y1="10"
                x2={lineLength}
                y2="10"
                stroke="rgb(99 102 241)"
                strokeWidth="0.8"
              />
              <polygon
                points={`${lineLength},10 ${arrowX1},${10 + arrowY1} ${arrowX1},${10 + arrowY2}`}
                fill="rgb(99 102 241)"
              />
            </svg>

            <div
              className="absolute left-1/2 top-1/2"
              style={{
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                zIndex: 101,
                pointerEvents: 'auto'
              }}
            >
              <CategoryNode
                name={category.name}
                categoryId={category.id}
                projectId={project.id}
                tasks={category.tasks}
                onClick={(catId, projId, tasks) => {
                  // Go to project page with category parameter
                  router.push(`/projects/${projId}?category=${catId}`)
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const HeroStat = ({ value, label }) => (
  <div className="rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-left shadow-sm backdrop-blur">
    <div className="text-3xl font-bold text-cream drop-shadow-sm">{value}</div>
    <div className="mt-1 text-sm font-medium uppercase tracking-wide text-cream-light">{label}</div>
  </div>
)

export default function HomePage() {
  const { t } = useLocale()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showGanttModal, setShowGanttModal] = useState(false)
  const [selectedGantt, setSelectedGantt] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // Check if URL has password recovery hash and redirect
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      router.push(`/reset-password${hash}`)
      return
    }
    
    checkUser()
    loadProjects()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      setUser(user)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.refresh()
  }

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
      <header className="relative border-b border-white/10 bg-slate-900/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.25),_transparent_60%)] backdrop-blur" />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-cream drop-shadow-md">Skylon Build Network</h1>
            <p className="mt-1 text-sm text-cream-light drop-shadow-sm">
              Commercial & Domestic refurbishment packages for subcontractors in Central London.
            </p>
          </div>
          <div className="flex gap-3 items-center relative z-[200]">
            <LanguageSwitcher />
            {user && profile ? (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-cream transition hover:border-white/60 hover:bg-white/10"
                >
                  {t('nav.dashboard')}
                </button>
                <div className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur rounded-xl border border-white/20">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-cream">
                      {profile.full_name || profile.company_name || user.email}
                    </div>
                    {profile.company_name && profile.full_name && (
                      <div className="text-xs text-cream-light">{profile.company_name}</div>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-white/20 text-cream rounded-full text-xs font-medium capitalize">
                    {profile.role || 'user'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-cream transition hover:border-white/60 hover:bg-white/10"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-cream shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
                >
                  {t('nav.register')}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 py-20 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <span className="rounded-full border border-white/40 bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cream shadow-sm">
              {t('hero.badge')}
            </span>
            <h2 className="mt-6 text-4xl font-black leading-tight sm:text-5xl text-cream drop-shadow-md">
              {t('hero.title')}
            </h2>
            <p className="mt-6 text-lg text-cream-light drop-shadow-sm">
              {t('hero.description')}
            </p>
          </div>

          <div className="grid w-full max-w-sm grid-cols-1 gap-4 sm:grid-cols-2">
            {heroStats.map((stat) => (
              <HeroStat key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* About Skylon Build Network */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">More Than Just a Platform</h3>
            <div className="space-y-3 text-slate-700 leading-relaxed">
              <p>
                <strong>Skylon Build Network</strong> is more than just a platform — it&apos;s an opportunity for smaller construction companies to enter the world of commercial projects in London. We help subcontractors gain hands-on experience working with major clients, learning industry standards, planning, and coordination within a main contractor environment.
              </p>
              <p>
                Skylon is always open to share knowledge, expertise, and technical support — from bid preparation to on-site delivery. It&apos;s a great chance to grow your business, build reputation, and secure long-term contracts in the commercial and refurbishment sector.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-10">
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
                  const { formattedStart, formattedEnd, procurementWindow } = getProjectSchedule(project)

                  return (
                    <article
                      key={project.id}
                      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-100" />
                      <div className={`relative grid gap-10 p-10 md:items-center ${index % 2 === 0 ? 'md:grid-cols-[70%_30%]' : 'md:grid-cols-[30%_70%]'}`}>
                        <div className={`${index % 2 === 0 ? 'order-1' : 'order-2'}`}>
                          <ProjectTree project={project} router={router} />
                        </div>
                        <div className={`flex flex-col gap-6 ${index % 2 === 0 ? 'order-2' : 'order-1'}`}>
                          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-indigo-500">
                            <span>Project</span>
                            <span className="h-1 w-1 rounded-full bg-indigo-500" />
                            <span>{project.status}</span>
                            {project.meta?.categories ? <span className="h-1 w-1 rounded-full bg-indigo-500" /> : null}
                            {project.meta?.categories ? <span>{project.meta.categories} packages</span> : null}
                          </div>
                          <div>
                            <div className="flex items-center gap-4 mb-3">
                              {project.project_image_url ? (
                                <img 
                                  src={project.project_image_url} 
                                  alt={project.name}
                                  className="w-16 h-16 object-cover rounded-lg border-2 border-indigo-300 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center border-2 border-indigo-300 flex-shrink-0">
                                  <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                </div>
                              )}
                              <h4 className="text-3xl font-bold text-slate-900">{project.name}</h4>
                            </div>
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
                            <div className="overflow-hidden rounded-2xl border border-slate-200 cursor-pointer hover:border-indigo-400 transition">
                              <img
                                src={project.gantt_image_url}
                                alt={`${project.name} Gantt preview`}
                                className="h-40 w-full object-contain bg-white"
                                loading="lazy"
                                onClick={() => {
                                  setSelectedGantt(project.gantt_image_url)
                                  setShowGanttModal(true)
                                }}
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

      {/* Gantt Modal */}
      {showGanttModal && (
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
              src={selectedGantt}
              alt="Gantt Chart"
              className="w-full h-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Logo */}
            <div>
              <a 
                href="https://www.skylongroup.co.uk/" 
                target="_blank"
                rel="noopener noreferrer"
              >
                <img 
                  src="/logo.png" 
                  alt="Skylon Construction" 
                  className="h-16 mb-4 cursor-pointer hover:opacity-80 transition"
                />
              </a>
              <p className="text-sm text-slate-600">
                Domestic Refurbishment specialists in Central London
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  <strong>E:</strong>{' '}
                  <a href="mailto:info@skylonconstruction.com" className="hover:text-indigo-600">
                    info@skylonconstruction.com
                  </a>
                </p>
                <p>
                  <strong>T:</strong>{' '}
                  <a href="tel:+447842510066" className="hover:text-indigo-600">
                    07842 510 066
                  </a>
                </p>
              </div>
            </div>

            {/* Address */}
            <div>
              <h4 className="font-bold text-slate-900 mb-3">Head Office</h4>
              <address className="text-sm text-slate-600 not-italic">
                Tyttenhanger House<br />
                Coursers Road<br />
                St Albans, AL4 0PF
              </address>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
            <p>© {new Date().getFullYear()} Skylon Group UK. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}