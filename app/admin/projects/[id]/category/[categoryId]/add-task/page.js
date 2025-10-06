'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function AddTaskPage() {
  const [profile, setProfile] = useState(null)
  const [category, setCategory] = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [suggestedPrice, setSuggestedPrice] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    checkAuth()
    loadCategory()
  }, [])

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
      }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Add Task to {category.name}</h1>
              <p className="text-sm mt-1">Project: {project?.name}</p>
            </div>
            <button
              onClick={() => router.push(`/admin/projects/${params.id}`)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Back to Project
            </button>
          </div>
        </div>
      </header>

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

            <div className="mb-6">
              <label className="block font-bold mb-2">
                Documents (PDF, DWG, etc.)
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setDocuments(Array.from(e.target.files))}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload project documents, drawings, specifications
              </p>
              {documents.length > 0 && (
                <div className="mt-2 text-sm">
                  Selected: {documents.map(d => d.name).join(', ')}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold"
            >
              {loading ? 'Creating Task...' : 'Create Task'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}