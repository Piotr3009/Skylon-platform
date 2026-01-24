'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function NotifySubcontractorsModal({ isOpen, categoryName, categoryTasks, projectId, projectName, onClose }) {
  const [selectedSpecializations, setSelectedSpecializations] = useState([])
  const [subcontractorCounts, setSubcontractorCounts] = useState({})
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState([])

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

  // Standalone specializations (no subcategories)
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
    'Renderer'
  ]

  // All specializations flat list for counting
  const allSpecializations = [
    ...Object.values(specializationCategories).flat(),
    ...standaloneSpecializations
  ]

  const toggleCategory = (category) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  // Select/deselect entire category
  const toggleEntireCategory = (category, subcategories) => {
    const allSelected = subcategories.every(spec => selectedSpecializations.includes(spec))
    if (allSelected) {
      setSelectedSpecializations(prev => prev.filter(s => !subcategories.includes(s)))
    } else {
      setSelectedSpecializations(prev => [...new Set([...prev, ...subcategories])])
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSubcontractorCounts()
    }
  }, [isOpen])

  const loadSubcontractorCounts = async () => {
    setLoading(true)
    const counts = {}

    for (const spec of allSpecializations) {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'subcontractor')
        .contains('specialization', [spec])

      if (!error) {
        counts[spec] = count || 0
      }
    }

    setSubcontractorCounts(counts)
    setLoading(false)
  }

  const handleToggleSpecialization = (spec) => {
    if (selectedSpecializations.includes(spec)) {
      setSelectedSpecializations(selectedSpecializations.filter(s => s !== spec))
    } else {
      setSelectedSpecializations([...selectedSpecializations, spec])
    }
  }

  const getTotalSubcontractors = () => {
    return selectedSpecializations.reduce((sum, spec) => sum + (subcontractorCounts[spec] || 0), 0)
  }

  const handleSendNotifications = async () => {
    if (selectedSpecializations.length === 0) {
      alert('Please select at least one specialization')
      return
    }

    setSending(true)

    try {
      let allSubcontractors = []

      for (const spec of selectedSpecializations) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, company_name')
          .eq('role', 'subcontractor')
          .contains('specialization', [spec])

        if (data) {
          allSubcontractors = [...allSubcontractors, ...data]
        }
      }

      const uniqueSubcontractors = Array.from(
        new Map(allSubcontractors.map(s => [s.id, s])).values()
      )

      console.log(`Sending to ${uniqueSubcontractors.length} unique subcontractors`)

      // Wywołaj Edge Function
      const { data, error } = await supabase.functions.invoke('notify-subcontractors', {
        body: {
          projectId,
          projectName,
          categoryName,
          tasks: categoryTasks,
          subcontractors: uniqueSubcontractors,
          specializations: selectedSpecializations
        }
      })

      if (error) throw error

      alert(`✅ Successfully sent ${uniqueSubcontractors.length} email notifications!`)
      onClose()
    } catch (error) {
      console.error('Error sending notifications:', error)
      alert('❌ Error sending notifications: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">📧 Notify Subcontractors</h2>
              <p className="text-sm text-gray-600 mt-1">
                Category: <span className="font-semibold">{categoryName}</span> ({categoryTasks.length} tasks)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-2">Loading subcontractors...</p>
            </div>
          ) : (
            <>
              {/* Tasks Preview */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Tasks to be included in email:</h3>
                <ul className="space-y-1">
                  {categoryTasks.map((task) => (
                    <li key={task.id} className="text-sm text-gray-700">
                      • {task.name} 
                      {task.budget_min && task.budget_max && (
                        <span className="text-gray-500"> (£{task.budget_min}-£{task.budget_max})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-sm text-gray-700 mb-4">
                Select which specializations should receive this notification:
              </p>

              {/* Specializations with Categories */}
              <div className="max-h-[400px] overflow-y-auto pr-2 border-2 border-gray-200 rounded-lg">
                {/* Categories with subcategories */}
                {Object.entries(specializationCategories).map(([category, subcategories]) => {
                  const categoryCount = subcategories.reduce((sum, spec) => sum + (subcontractorCounts[spec] || 0), 0)
                  const allSelected = subcategories.every(spec => selectedSpecializations.includes(spec))
                  const someSelected = subcategories.some(spec => selectedSpecializations.includes(spec))
                  
                  return (
                    <div key={category} className="border-b border-gray-200 last:border-b-0">
                      {/* Category header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          <span className="text-gray-500 text-sm">
                            {expandedCategories.includes(category) ? '▼' : '▶'}
                          </span>
                          <span className="font-bold text-gray-800">{category}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            categoryCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {categoryCount}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEntireCategory(category, subcategories)}
                          className={`text-xs font-medium px-3 py-1 rounded transition ${
                            allSelected 
                              ? 'bg-blue-600 text-white' 
                              : someSelected 
                                ? 'bg-blue-200 text-blue-800'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      
                      {/* Subcategories */}
                      {expandedCategories.includes(category) && (
                        <div className="bg-white">
                          {subcategories.map((spec) => {
                            const count = subcontractorCounts[spec] || 0
                            const isSelected = selectedSpecializations.includes(spec)
                            
                            return (
                              <label
                                key={spec}
                                className={`flex items-center justify-between px-6 py-2 cursor-pointer border-l-4 transition ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-transparent hover:bg-gray-50 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSpecialization(spec)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">{spec}</span>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {count}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Standalone specializations */}
                <div className="border-t-2 border-gray-300">
                  <div className="px-4 py-2 bg-gray-100">
                    <span className="font-bold text-gray-700">Other Trades</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {standaloneSpecializations.map((spec) => {
                      const count = subcontractorCounts[spec] || 0
                      const isSelected = selectedSpecializations.includes(spec)

                      return (
                        <label
                          key={spec}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-50 border border-blue-300'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSpecialization(spec)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700">{spec}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {count}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Total Counter */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Recipients</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedSpecializations.length} specialization{selectedSpecializations.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    ~{getTotalSubcontractors()}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * Approximate count - duplicates will be removed
                </p>
              </div>

              {selectedSpecializations.length === 0 && (
                <p className="text-sm text-red-600 mt-3">
                  ⚠️ Please select at least one specialization
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendNotifications}
              disabled={sending || loading || selectedSpecializations.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Email Notifications
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}