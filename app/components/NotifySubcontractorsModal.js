'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function NotifySubcontractorsModal({ isOpen, categoryName, categoryTasks, projectId, projectName, onClose }) {
  const [selectedSpecializations, setSelectedSpecializations] = useState(['General Construction'])
  const [subcontractorCounts, setSubcontractorCounts] = useState({})
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // Lista wszystkich specializations
  const allSpecializations = [
    'General Construction',
    'Steel Frame Specialist',
    'Plumber',
    'HVAC Installer',
    'Electrician',
    'Fire Protection Specialist',
    'Lift Engineer',
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
    'Drainage Specialist',
    'Renderer'
  ]

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
                Select specializations to notify (General Construction is always included):
              </p>

              {/* Specializations Grid */}
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {allSpecializations.map((spec) => {
                  const count = subcontractorCounts[spec] || 0
                  const isSelected = selectedSpecializations.includes(spec)
                  const isGeneralConstruction = spec === 'General Construction'

                  return (
                    <label
                      key={spec}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${isGeneralConstruction ? 'opacity-75' : ''}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !isGeneralConstruction && handleToggleSpecialization(spec)}
                          disabled={isGeneralConstruction}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-900 text-sm">{spec}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {count}
                      </span>
                    </label>
                  )
                })}
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
              Skip
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