'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/app/components/Header'
import Breadcrumbs from '@/app/components/Breadcrumbs'
import { getCategoryIcon, getCategoryColor } from '@/lib/categoryIcons'

export default function AddTaskPage() {
  const [profile, setProfile] = useState(null)
  const [category, setCategory] = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [suggestedPrice, setSuggestedPrice] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('')
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    checkAuth()
    loadCategory()
  }, [])

  // Auto-calculate End Date when Start Date or Duration changes
  useEffect(() => {
    if (startDate && estimatedDuration) {
      const start = new Date(startDate)
      const duration = parseInt(estimatedDuration)
      
      if (!isNaN(duration) && duration > 0) {
        const end = new Date(start)
        end.setDate(end.getDate() + duration)
        
        // Format to YYYY-MM-DD for input[type="date"]
        const formattedEndDate = end.toISOString().split('T')[0]
        setEndDate(formattedEndDate)
      }
    }
  }, [startDate, estimatedDuration])

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

  const loadCategory = async () => {
    const { data: categoryData } = await supabase
      .from('categories')
      .select('*, projects(*)')
      .eq('id', params.categoryId)
      .single()

    if (categoryData) {
      setCategory(categoryData)
      setProject(categoryData.projects)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Create task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert([
        {
          category_id: params.categoryId,
          name,
          description,
          suggested_price: suggestedPrice ? parseFloat(suggestedPrice) : null,
          estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          expected_completion_date: expectedCompletionDate || null,
          status: 'open'
        }
      ])
      .select()
      .single()

    if (taskError) {
      setError('Failed to create task: ' + taskError.message)
      setLoading(false)
      return
    }

    // Upload documents if any
    if (documents.length > 0) {
      let uploadedCount = 0
      for (const doc of documents) {
        const fileExt = doc.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `documents/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, doc)

        if (uploadError) {
          console.error('Failed to upload document:', uploadError)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath)

        await supabase
          .from('task_documents')
          .insert([
            {
              task_id: taskData.id,
              file_name: doc.name,
              file_url: publicUrl,
              file_type: doc.type,
              uploaded_by: profile.id
            }
          ])

        uploadedCount++
      }
      console.log(`Successfully uploaded ${uploadedCount} of ${documents.length} documents`)
    }

    setSuccess(true)
    setTimeout(() => {
      router.push(`/admin/projects/${params.id}`)
    }, 1500)
  }

  if (!category) {
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

  const CategoryIcon = getCategoryIcon(category?.name || '')
  const categoryColor = getCategoryColor(category?.name || '')

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50">
      <Header
        title={`Add Task to ${category?.name || 'Category'}`}
        subtitle={`Project: ${project?.name || 'Loading...'}`}
        user={profile}
        profile={profile}
        onLogout={handleLogout}
        showHome={true}
        showDashboard={true}
        gradient={true}
      />

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Projects', href: '/admin/projects' },
            { label: project?.name || 'Project', href: `/admin/projects/${params.id}` },
            { label: 'Add Task' }
          ]}
        />

        {category && (
          <div className={`${categoryColor} rounded-lg p-4 mb-6 flex items-center gap-3`}>
            <CategoryIcon className="w-8 h-8" />
            <div>
              <div className="font-bold text-lg">{category.name}</div>
              <div className="text-sm opacity-80">Adding new task to this category</div>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Task created successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block font-bold mb-2">
                Task Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Electrical Installation - Ground Floor"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block font-bold mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="6"
                placeholder="Detailed scope of work..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-bold mb-2">
                  Suggested Price (£)
                </label>
                <input
                  type="number"
                  value={suggestedPrice}
                  onChange={(e) => setSuggestedPrice(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15000"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block font-bold mb-2">
                  Estimated Duration (days)
                </label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-bold mb-2">
                  Expected Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold mb-2">
                  Expected End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block font-bold mb-2">
                Deadline / Expected Completion Date 🎯
              </label>
              <input
                type="date"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Set the target deadline for this task completion
              </p>
            </div>

            <div className="mb-6">
              <label className="block font-bold mb-2">
                Documents (PDF, DWG, Images, etc.) - Add files one by one or multiple at once
              </label>
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50/30 hover:bg-blue-50 transition">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const newFiles = Array.from(e.target.files)
                    setDocuments([...documents, ...newFiles])
                    e.target.value = '' // Reset input to allow adding more files
                  }}
                  className="w-full px-3 py-2 border border-blue-300 bg-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  📎 Click "Choose Files" multiple times to add more documents
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  You can select multiple files at once (Ctrl/Cmd + Click) or add them one by one
                </p>
              </div>

              {documents.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {documents.length} file{documents.length > 1 ? 's' : ''} selected
                  </div>
                  <div className="space-y-2">
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-green-200">
                        <div className="flex items-center gap-3 flex-1">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
                            <div className="text-xs text-gray-500">{(doc.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newDocs = documents.filter((_, i) => i !== index)
                            setDocuments(newDocs)
                          }}
                          className="ml-3 p-1 text-red-600 hover:bg-red-100 rounded transition flex-shrink-0"
                          title="Remove file"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocuments([])}
                    className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear all files
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold transition"
            >
              {loading
                ? (documents.length > 0
                  ? `Creating Task & Uploading ${documents.length} Document${documents.length > 1 ? 's' : ''}...`
                  : 'Creating Task...')
                : 'Create Task'}
            </button>
            {documents.length > 0 && (
              <p className="text-sm text-gray-600 text-center mt-2">
                All {documents.length} document{documents.length > 1 ? 's' : ''} will be uploaded when you create the task
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}