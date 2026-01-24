'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SpecializationsPage() {
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState([])
  const [subcontractorCounts, setSubcontractorCounts] = useState({})
  const router = useRouter()

  // Specialization categories with subcategories
  const specializationCategories = {
    'Designers / Professionals': [
      'M&E Designer',
      'Structural Engineer',
      'Architectural Designer',
      'Acoustic Consultant',
      'Fire Engineer',
      'BREEAM Specialist',
      'PES Specialist',
      'CDM Coordinator',
      'Quantity Surveyor'
    ],
    'Specialist Installations': [
      'Fire Stopping',
      'Sprinkler Systems',
      'Movement Monitoring',
      'BMS (Building Management Systems)',
      'Pressurisation Systems',
      'Lift Installer',
      'Lightning Protection'
    ],
    'Electrical & Security': [
      'Electrical Installation',
      'IT Installer / Data Cabling',
      'CCTV Installer',
      'Access Control / Door Entry',
      'Fire Alarm Systems',
      'Emergency Lighting',
      'AV Systems',
      'Intruder Alarm'
    ],
    'MEP': [
      'Plumber',
      'HVAC Installer',
      'Drainage Specialist'
    ]
  }

  // Standalone specializations
  const standaloneSpecializations = [
    'General Construction',
    'Steel Frame Specialist',
    'Scaffolder',
    'Decorator/Painter',
    'Bricklayer',
    'Joinery Installer',
    'Carpenter',
    'Dry Liner',
    'Plasterer',
    'Basement Specialist',
    'Loft Specialist',
    'Tiler',
    'Floor Specialist',
    'Staircase Specialist',
    'Roofer',
    'Glazier',
    'Groundworks',
    'Renderer',
    'Electrician',
    'Fire Protection Specialist'
  ]

  useEffect(() => {
    checkAuth()
    loadSubcontractorCounts()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'owner' && profile.role !== 'coordinator')) {
      router.push('/dashboard')
    }
  }

  const loadSubcontractorCounts = async () => {
    setLoading(true)
    
    const { data: subcontractors } = await supabase
      .from('profiles')
      .select('specialization')
      .eq('role', 'subcontractor')

    const counts = {}
    if (subcontractors) {
      subcontractors.forEach(sub => {
        if (sub.specialization && Array.isArray(sub.specialization)) {
          sub.specialization.forEach(spec => {
            counts[spec] = (counts[spec] || 0) + 1
          })
        }
      })
    }
    
    setSubcontractorCounts(counts)
    setLoading(false)
  }

  const toggleCategory = (category) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const expandAll = () => {
    setExpandedCategories(Object.keys(specializationCategories))
  }

  const collapseAll = () => {
    setExpandedCategories([])
  }

  const getCategoryCount = (subcategories) => {
    return subcategories.reduce((sum, spec) => sum + (subcontractorCounts[spec] || 0), 0)
  }

  const getTotalCount = () => {
    return Object.values(subcontractorCounts).reduce((sum, count) => sum + count, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading specializations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/subcontractors')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📋 Subcontractor Specializations</h1>
                <p className="text-sm text-gray-500 mt-1">View all categories and subcategories</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={expandAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{Object.keys(specializationCategories).length}</div>
              <div className="text-sm text-gray-500 mt-1">Main Categories</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {Object.values(specializationCategories).flat().length + standaloneSpecializations.length}
              </div>
              <div className="text-sm text-gray-500 mt-1">Total Specializations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">{getTotalCount()}</div>
              <div className="text-sm text-gray-500 mt-1">Total Assignments</div>
            </div>
          </div>
        </div>

        {/* Categories Accordion */}
        <div className="space-y-4">
          {Object.entries(specializationCategories).map(([category, subcategories]) => {
            const isExpanded = expandedCategories.includes(category)
            const categoryCount = getCategoryCount(subcategories)
            
            return (
              <div key={category} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      category === 'Designers / Professionals' ? 'bg-purple-100 text-purple-600' :
                      category === 'Specialist Installations' ? 'bg-orange-100 text-orange-600' :
                      category === 'Electrical & Security' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {category === 'Designers / Professionals' ? '🏗️' :
                       category === 'Specialist Installations' ? '🔧' :
                       category === 'Electrical & Security' ? '⚡' : '🔩'}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900">{category}</h3>
                      <p className="text-sm text-gray-500">{subcategories.length} specializations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      categoryCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {categoryCount} subcontractors
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Subcategories */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {subcategories.map((spec, index) => {
                      const count = subcontractorCounts[spec] || 0
                      return (
                        <div 
                          key={spec}
                          className={`px-6 py-3 flex items-center justify-between hover:bg-gray-50 ${
                            index !== subcategories.length - 1 ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                            <span className="text-gray-700">{spec}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Other Trades */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-200 text-gray-600">
                  🛠️
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Other Trades</h3>
                  <p className="text-sm text-gray-500">{standaloneSpecializations.length} standalone specializations</p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 grid grid-cols-2 gap-px bg-gray-100">
              {standaloneSpecializations.map((spec) => {
                const count = subcontractorCounts[spec] || 0
                return (
                  <div 
                    key={spec}
                    className="px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-700">{spec}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}