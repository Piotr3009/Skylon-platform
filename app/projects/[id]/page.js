'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { getCategoryIcon, getCategoryColor } from '@/lib/categoryIcons'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
}

const formatMonthYear = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${year}`
}

// Helper functions for file type detection
const getFileType = (fileName) => {
  if (!fileName) return 'other'
  const ext = fileName.toLowerCase().split('.').pop()
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
  const pdfExts = ['pdf']
  if (imageExts.includes(ext)) return 'image'
  if (pdfExts.includes(ext)) return 'pdf'
  return 'other'
}

export default function PublicTaskPage() {
  const [task, setTask] = useState(null)
  const [category, setCategory] = useState(null)
  const [project, setProject] = useState(null)
  const [documents, setDocuments] = useState([])
  const [questions, setQuestions] = useState([])
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myBid, setMyBid] = useState(null)
  const [taskPhotos, setTaskPhotos] = useState([])

  // Proposal form state
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [proposalPrice, setProposalPrice] = useState('')
  const [proposalDuration, setProposalDuration] = useState('')
  const [proposalComment, setProposalComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Question form state
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [askingQuestion, setAskingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState(null)
  const [questionSuccess, setQuestionSuccess] = useState(false)

  // Photo upload state
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoDescription, setPhotoDescription] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [photoSuccess, setPhotoSuccess] = useState(false)

  // Document preview state
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedPdf, setSelectedPdf] = useState(null)

  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    checkUser()
    loadTaskDetails()
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
      setProfile(profileData)
    }
  }

  const loadTaskDetails = async () => {
    setLoading(true)

    // Load task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', params.taskId)
      .single()

    if (taskError) {
      setLoading(false)
      return
    }

    setTask(taskData)

    // Load category
    const { data: categoryData } = await supabase
      .from('categories')
      .select('*')
      .eq('id', taskData.category_id)
      .single()

    setCategory(categoryData)

    // Load project
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()

    setProject(projectData)

    // Load documents
    const { data: docsData } = await supabase
      .from('task_documents')
      .select('*')
      .eq('task_id', params.taskId)

    if (docsData) setDocuments(docsData)

    // Load questions
    const { data: questionsData } = await supabase
      .from('task_questions')
      .select('*, profiles(full_name, company_name)')
      .eq('task_id', params.taskId)
      .order('created_at', { ascending: false })

    if (questionsData) setQuestions(questionsData)

    // Load my bid if logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: bidData, error: bidError } = await supabase
        .from('bids')
        .select('*')
        .eq('task_id', params.taskId)
        .eq('subcontractor_id', user.id)
        .maybeSingle()

      if (bidData && !bidError) setMyBid(bidData)
    }

    // Load task photos
    const { data: photosData } = await supabase
      .from('task_photos')
      .select('*, profiles(full_name, company_name)')
      .eq('task_id', params.taskId)
      .order('created_at', { ascending: false })

    if (photosData) setTaskPhotos(photosData)

    setLoading(false)
  }

  const handleSubmitProposal = async (e) => {
    e.preventDefault()

    if (!user) {
      router.push('/login')
      return
    }

    if (profile?.role !== 'subcontractor') {
      setError('Only subcontractors can submit proposals')
      return
    }

    setSubmitting(true)
    setError(null)

    // Use upsert to allow updating existing bids
    const { data, error: bidError } = await supabase
      .from('bids')
      .upsert(
        {
          task_id: params.taskId,
          subcontractor_id: user.id,
          price: parseFloat(proposalPrice),
          duration: parseInt(proposalDuration),
          comment: proposalComment,
          status: 'pending'
        },
        {
          onConflict: 'task_id,subcontractor_id'
        }
      )

    if (bidError) {
      setError('Failed to submit proposal: ' + bidError.message)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)

    setTimeout(() => {
      setShowProposalForm(false)
      setSuccess(false)
      setProposalPrice('')
      setProposalDuration('')
      setProposalComment('')
      loadTaskDetails() // Reload to show updated bid
    }, 2000)
  }

  const handleAskQuestion = async (e) => {
    e.preventDefault()

    if (!user) {
      router.push('/login')
      return
    }

    setAskingQuestion(true)
    setQuestionError(null)

    const { error: questionError } = await supabase
      .from('task_questions')
      .insert([
        {
          task_id: params.taskId,
          subcontractor_id: user.id,
          question: questionText
        }
      ])

    if (questionError) {
      setQuestionError('Failed to submit question: ' + questionError.message)
      setAskingQuestion(false)
      return
    }

    setQuestionSuccess(true)
    setQuestionText('')
    setAskingQuestion(false)
    
    setTimeout(() => {
      setShowQuestionForm(false)
      setQuestionSuccess(false)
      loadTaskDetails()
    }, 1500)
  }

  const handlePhotoUpload = async (e) => {
    e.preventDefault()

    if (!photoFile) {
      setPhotoError('Please select a photo')
      return
    }

    // Validate file size (5MB max)
    if (photoFile.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be less than 5MB')
      return
    }

    // Validate file type
    if (!photoFile.type.startsWith('image/')) {
      setPhotoError('File must be an image')
      return
    }

    setUploadingPhoto(true)
    setPhotoError(null)

    try {
      // Upload to Supabase storage
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `task-photos/${fileName}`

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('project-files')
        .upload(filePath, photoFile)

      if (uploadError) {
        setPhotoError('Upload failed: ' + uploadError.message)
        setUploadingPhoto(false)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath)

      // Save to database
      const { error: dbError } = await supabase
        .from('task_photos')
        .insert([
          {
            task_id: params.taskId,
            uploaded_by: user.id,
            photo_url: publicUrl,
            description: photoDescription
          }
        ])

      if (dbError) {
        setPhotoError('Database error: ' + dbError.message)
        setUploadingPhoto(false)
        return
      }

      setPhotoSuccess(true)
      setUploadingPhoto(false)

      setTimeout(() => {
        setShowPhotoUpload(false)
        setPhotoSuccess(false)
        setPhotoFile(null)
        setPhotoDescription('')
        loadTaskDetails()
      }, 1500)

    } catch (err) {
      setPhotoError('Upload failed: ' + err.message)
      setUploadingPhoto(false)
    }
  }

  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoError(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading task details...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Task not found</h1>
          <button
            onClick={() => router.push(`/projects/${params.id}`)}
            className="text-blue-600 hover:underline"
          >
            Return to project
          </button>
        </div>
      </div>
    )
  }

  const canSubmitProposal = user && profile?.role === 'subcontractor' && task.status === 'open'

  // Pre-fill form with existing bid data when opening the form
  const handleOpenProposalForm = () => {
    if (myBid) {
      setProposalPrice(myBid.price.toString())
      setProposalDuration(myBid.duration.toString())
      setProposalComment(myBid.comment || '')
    }
    setShowProposalForm(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-gray-300">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <button
                onClick={() => router.push(`/projects/${params.id}`)}
                className="hover:text-blue-600 transition"
              >
                {project?.name}
              </button>
              <span>→</span>
              {category && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = getCategoryIcon(category.name)
                    return <Icon className="w-5 h-5" />
                  })()}
                  <span>{category.name}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push(`/projects/${params.id}`)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Back to Project
            </button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.name}</h1>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  task.status === 'open' ? 'bg-green-100 text-green-800' :
                  task.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {task.status}
                </span>
                {task.bid_deadline && (
                  <span className="text-sm text-gray-600">
                    Bid deadline: {new Date(task.bid_deadline).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task details */}
            <div className="bg-white rounded-xl shadow-md border-2 border-gray-300 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Task Details</h2>

              <div className="grid grid-cols-2 gap-6 mb-6">
                {(task.budget_min || task.budget_max || task.suggested_price) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Suggested Budget</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {task.budget_min && task.budget_max ? (
                        // Show range if both min and max exist
                        `${formatCurrency(task.budget_min)} - ${formatCurrency(task.budget_max)}`
                      ) : task.budget_min ? (
                        // Show only min if max doesn't exist
                        `From ${formatCurrency(task.budget_min)}`
                      ) : task.budget_max ? (
                        // Show only max if min doesn't exist
                        `Up to ${formatCurrency(task.budget_max)}`
                      ) : (
                        // Fallback to suggested_price
                        formatCurrency(task.suggested_price)
                      )}
                    </div>
                  </div>
                )}
                {(task.start_date || task.end_date) && (
                  <div className="grid grid-cols-2 gap-4">
                    {task.start_date && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Start Date</div>
                        <div className="text-xl font-bold text-gray-900">
                          {formatMonthYear(task.start_date)}
                        </div>
                      </div>
                    )}
                    {task.end_date && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">End Date</div>
                        <div className="text-xl font-bold text-gray-900">
                          {formatMonthYear(task.end_date)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!task.start_date && !task.end_date && task.estimated_duration && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Estimated Duration</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {task.estimated_duration} days
                    </div>
                  </div>
                )}
              </div>

              {task.short_description && (
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Overview</div>
                  <p className="text-gray-700">{task.short_description}</p>
                </div>
              )}

              {task.description && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Full Description</div>
                  <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                    {task.description}
                  </div>
                </div>
              )}
            </div>

            {/* Photo Gallery */}
            {taskPhotos.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border-2 border-gray-300 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Project Photos ({taskPhotos.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {taskPhotos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <img
                        src={photo.photo_url}
                        alt={photo.description || 'Task photo'}
                        className="w-full h-48 object-cover rounded-lg border border-gray-200 group-hover:shadow-lg transition cursor-pointer"
                        onClick={() => window.open(photo.photo_url, '_blank')}
                      />
                      <div className="mt-2">
                        {photo.description && (
                          <p className="text-sm text-gray-700 mb-1">{photo.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {photo.profiles?.company_name || photo.profiles?.full_name} • {new Date(photo.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Photo Section - only for accepted subcontractors */}
            {myBid && myBid.status === 'accepted' && (
              <div className="bg-white rounded-xl shadow-md border-2 border-gray-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Upload Progress Photos</h2>
                  {!showPhotoUpload && (
                    <button
                      onClick={() => setShowPhotoUpload(true)}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Add Photo
                    </button>
                  )}
                </div>

                {showPhotoUpload && (
                  <form onSubmit={handlePhotoUpload} className="p-4 bg-green-50 rounded-lg border border-green-200">
                    {photoError && (
                      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                        {photoError}
                      </div>
                    )}

                    {photoSuccess && (
                      <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                        Photo uploaded successfully!
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Photo (max 5MB) *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                      {photoFile && (
                        <p className="mt-2 text-sm text-gray-600">
                          Selected: {photoFile.name} ({(photoFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        value={photoDescription}
                        onChange={(e) => setPhotoDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., Foundation completed, Electrical work in progress..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={uploadingPhoto}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                      >
                        {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPhotoUpload(false)
                          setPhotoFile(null)
                          setPhotoDescription('')
                          setPhotoError(null)
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {!showPhotoUpload && (
                  <p className="text-sm text-gray-600">
                    Upload photos to show project progress and keep the coordinator updated.
                  </p>
                )}
              </div>
            )}

            {/* Questions section */}
            <div className="bg-white rounded-xl shadow-md border-2 border-gray-300 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Questions & Answers ({questions.length})
                </h2>
                {user && (
                  <button
                    onClick={() => setShowQuestionForm(!showQuestionForm)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Ask Question
                  </button>
                )}
              </div>

              {showQuestionForm && (
                <form onSubmit={handleAskQuestion} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Question
                  </label>
                  
                  {questionError && (
                    <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                      {questionError}
                    </div>
                  )}
                  
                  {questionSuccess && (
                    <div className="mb-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
                      Question submitted successfully!
                    </div>
                  )}
                  
                  <textarea
                    value={questionText}
                    onChange={(e) => {
                      setQuestionText(e.target.value)
                      setQuestionError(null)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Ask about scope, requirements, materials..."
                    required
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      type="submit"
                      disabled={askingQuestion}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {askingQuestion ? 'Submitting...' : 'Submit Question'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuestionForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {questions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No questions yet. Be the first to ask!
                </p>
              ) : (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="border-l-4 border-[#1e3a5f] pl-4 py-3">
                      <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span className="font-medium">
                          Anonymous Subcontractor
                        </span>
                        <span>{new Date(q.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="font-semibold text-gray-900 mb-2">
                        Q: {q.question}
                      </div>
                      {q.answer ? (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <span className="text-sm font-medium text-gray-700">A: </span>
                          <span className="text-gray-700">{q.answer}</span>
                        </div>
                      ) : (
                        <div className="text-gray-400 italic text-sm">
                          Awaiting response from coordinator
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submit proposal */}
            {canSubmitProposal && !showProposalForm && !myBid && (
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-2">Ready to bid?</h3>
                <p className="text-blue-100 mb-4 text-sm">
                  Submit your proposal with pricing and timeline
                </p>
                <button
                  onClick={handleOpenProposalForm}
                  className="w-full px-4 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition shadow"
                >
                  Submit Proposal
                </button>
              </div>
            )}

            {/* Update existing bid */}
            {canSubmitProposal && !showProposalForm && myBid && (
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-2">Your Current Bid</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-100">Price:</span>
                    <span className="font-semibold">£{myBid.price.toLocaleString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-100">Duration:</span>
                    <span className="font-semibold">{myBid.duration} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-100">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      myBid.status === 'pending' ? 'bg-yellow-500 text-white' :
                      myBid.status === 'accepted' ? 'bg-white text-green-600' :
                      'bg-red-500 text-white'
                    }`}>
                      {myBid.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleOpenProposalForm}
                  className="w-full px-4 py-3 bg-white text-green-600 font-semibold rounded-lg hover:bg-gray-100 transition shadow"
                >
                  Update Proposal
                </button>
              </div>
            )}

            {!user && task.status === 'open' && (
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-2">Want to bid?</h3>
                <p className="text-blue-100 mb-4 text-sm">
                  Login or register to submit your proposal
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-4 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition shadow mb-2"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="w-full px-4 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-blue-800 transition"
                >
                  Register
                </button>
              </div>
            )}

            {/* Proposal form */}
            {showProposalForm && (
              <div className="bg-white rounded-lg shadow-lg border-2 border-blue-500 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {myBid ? 'Update Your Proposal' : 'Submit Your Proposal'}
                </h3>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                    {myBid ? 'Proposal updated successfully!' : 'Proposal submitted successfully!'}
                  </div>
                )}

                <form onSubmit={handleSubmitProposal}>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Price (£) *
                    </label>
                    <input
                      type="number"
                      value={proposalPrice}
                      onChange={(e) => setProposalPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="25000"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration (days) *
                    </label>
                    <input
                      type="number"
                      value={proposalDuration}
                      onChange={(e) => setProposalDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="20"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Comments & Approach
                    </label>
                    <textarea
                      value={proposalComment}
                      onChange={(e) => setProposalComment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="4"
                      placeholder="Describe your approach, experience, team size..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                    >
                      {submitting ? (myBid ? 'Updating...' : 'Submitting...') : (myBid ? 'Update Proposal' : 'Submit Proposal')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProposalForm(false)}
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Documents */}
            <div className="bg-white rounded-xl shadow-md border-2 border-gray-300 p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                Documents ({documents.length})
              </h3>

              {!user && documents.length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-medium mb-1">🔒 Login required to view documents</p>
                  <p className="text-xs text-blue-600">Register or login to access project files</p>
                </div>
              )}

              {user && profile && !profile.email_verified && documents.length > 0 && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <p className="font-medium mb-1">⚠️ Email verification required</p>
                  <p className="text-xs text-yellow-600">Check your inbox to verify your email before viewing</p>
                </div>
              )}

              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents available</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {documents.map((doc) => {
                    const canView = user && profile?.email_verified
                    const fileType = getFileType(doc.file_name)

                    if (!canView) {
                      return (
                        <div
                          key={doc.id}
                          className="relative aspect-square bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center opacity-60 cursor-not-allowed"
                        >
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="text-xs text-gray-500 text-center px-2 truncate w-full">
                            {doc.file_name}
                          </span>
                          <span className="text-xs text-gray-400 mt-1">🔒 Locked</span>
                        </div>
                      )
                    }

                    // Image preview
                    if (fileType === 'image') {
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedImage(doc)}
                          className="relative aspect-square bg-gray-100 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition group"
                        >
                          <img
                            src={doc.file_url}
                            alt={doc.file_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <span className="text-xs text-white truncate block">
                              {doc.file_name}
                            </span>
                          </div>
                        </div>
                      )
                    }

                    // PDF preview
                    if (fileType === 'pdf') {
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedPdf(doc)}
                          className="relative aspect-square bg-red-50 rounded-lg border border-red-200 flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:shadow-md transition group"
                        >
                          <svg className="w-12 h-12 text-red-500 mb-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13.5c0 .8-.7 1.5-1.5 1.5H6v2H5v-6h2c.8 0 1.5.7 1.5 1.5v1zm4.5 2.5h-2v-6h2c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2zm5.5-4.5c0-.3-.2-.5-.5-.5h-1v1.5h1v1h-1V16h-1v-6h2c.8 0 1.5.7 1.5 1.5v1zM7 12h-.5v1.5H7c.3 0 .5-.2.5-.5v-1c0-.3-.2-.5-.5-.5zm4 0h-.5v3.5H11c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1z"/>
                          </svg>
                          <span className="text-xs text-gray-700 text-center px-2 truncate w-full font-medium">
                            {doc.file_name}
                          </span>
                          <span className="text-xs text-red-500 mt-1">Click to preview</span>
                        </div>
                      )
                    }

                    // Other files (download)
                    return (
                      <a
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-md transition"
                      >
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs text-gray-700 text-center px-2 truncate w-full">
                          {doc.file_name}
                        </span>
                        <span className="text-xs text-blue-500 mt-1">Click to download</span>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Task info */}
            <div className="bg-white rounded-xl shadow-md border-2 border-gray-300 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Task Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 mb-2">Category</div>
                  {category && (
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${getCategoryColor(category.name)}`}>
                      {(() => {
                        const Icon = getCategoryIcon(category.name)
                        return <Icon className="w-6 h-6 flex-shrink-0" />
                      })()}
                      <div className="font-semibold">{category.name}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-gray-500">Project</div>
                  <div className="font-medium text-gray-900">{project?.name}</div>
                </div>
                <div>
                  <div className="text-gray-500">Status</div>
                  <div className="font-medium text-gray-900 capitalize">{task.status}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage.file_url}
              alt={selectedImage.file_name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3 rounded-b-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{selectedImage.file_name}</span>
                <a
                  href={selectedImage.file_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {selectedPdf && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPdf(null)}
        >
          <button
            onClick={() => setSelectedPdf(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div 
            className="w-full max-w-5xl h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-100 p-3 flex items-center justify-between border-b">
              <span className="font-medium text-gray-800 truncate">{selectedPdf.file_name}</span>
              <a
                href={selectedPdf.file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </a>
            </div>
            <iframe
              src={selectedPdf.file_url}
              className="flex-1 w-full"
              title={selectedPdf.file_name}
            />
          </div>
        </div>
      )}
    </div>
  )
}