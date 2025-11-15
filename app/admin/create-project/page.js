'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

const STANDARD_CATEGORIES = [
  'Demolition & Site Clearance',
  'Groundworks & Foundations',
  'Structural Frame',
  'External Walls & Cladding',
  'Roofing',
  'Joinery Installation',
  'Internal Walls & Partitions',
  'Carpentry Works',
  'Plumbing & Drainage',
  'Electrical Installation',
  'Mechanical Installation AC/VRF',
  'Plastering & Drylining',
  'Flooring',
  'Joinery',
  'Finishing',
  'External Works',
  'Specialist Systems'
]

export default function CreateProjectPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState('commercial')
  const [projectLogo, setProjectLogo] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [ganttImage, setGanttImage] = useState(null)
  const [selectedCategories, setSelectedCategories] = useState(
    STANDARD_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  )
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
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

  const toggleCategory = (category) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let ganttImageUrl = null
    let projectLogoUrl = null

    // Upload project logo if provided
    if (projectLogo) {
      // Validate file size (5MB max)
      if (projectLogo.size > 5 * 1024 * 1024) {
        setError('Project logo must be less than 5MB')
        setLoading(false)
        return
      }

      const fileExt = projectLogo.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `project-logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, projectLogo)

      if (uploadError) {
        setError('Failed to upload project logo: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath)

      projectLogoUrl = publicUrl
    }

    // Upload Gantt image if provided
    if (ganttImage) {
      const fileExt = ganttImage.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `gantt/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, ganttImage)

      if (uploadError) {
        setError('Failed to upload Gantt image: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath)

      ganttImageUrl = publicUrl
    }

    // Create project
    const { data: projectData, error: insertError } = await supabase
      .from('projects')
      .insert([
        {
          name,
          description,
          project_type: projectType,
          project_image_url: projectLogoUrl,
          gantt_image_url: ganttImageUrl,
          start_date: startDate,
          end_date: endDate,
          created_by: profile.id,
          status: 'active'
        }
      ])
      .select()
      .single()

    if (insertError) {
      setError('Failed to create project: ' + insertError.message)
      setLoading(false)
      return
    }

    // Create selected categories
    const categoriesToCreate = STANDARD_CATEGORIES
      .filter(cat => selectedCategories[cat])
      .map((cat, index) => ({
        project_id: projectData.id,
        name: cat,
        display_order: index
      }))

    if (categoriesToCreate.length > 0) {
      const { error: categoriesError } = await supabase
        .from('categories')
        .insert(categoriesToCreate)

      if (categoriesError) {
        setError('Project created but failed to add categories: ' + categoriesError.message)
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setTimeout(() => {
      router.push(`/admin/projects/${projectData.id}`)
    }, 1500)
  }

  if (!profile) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        title="Create New Project"
        subtitle="Add a new construction project to the platform"
        user={profile}
        profile={profile}
        onLogout={handleLogout}
        showHome={true}
        showDashboard={true}
        gradient={true}
      />

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Project created successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="e.g. Office Building London"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                rows="4"
                placeholder="Project details and requirements..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Project Type *
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                required
              >
                <option value="commercial">Commercial</option>
                <option value="domestic">Domestic Only</option>
                <option value="restaurant">Restaurant & Hospitality</option>
                <option value="other">Other</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Select the type of building project
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Project Logo/Image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProjectLogo(e.target.files[0])}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload a logo or main image for this project (max 5MB). This will appear next to the project name.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2">
                Gantt Chart Image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setGanttImage(e.target.files[0])}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload a Gantt chart showing project timeline
              </p>
            </div>

            {/* Categories Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-3">
                Select Categories for this Project
              </label>
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded">
                {STANDARD_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories[category]}
                      onChange={() => toggleCategory(category)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                You can add more categories later if needed
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a5f] text-white py-3 rounded hover:bg-[#2a5179] disabled:bg-gray-400 font-bold"
            >
              {loading ? 'Creating Project...' : 'Create Project'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}