'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
}

export default function AdminTaskDetailPage() {
  const [task, setTask] = useState(null)
  const [category, setCategory] = useState(null)
  const [project, setProject] = useState(null)
  const [documents, setDocuments] = useState([])
  const [bids, setBids] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  // Answer question state
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null)
  const [answerText, setAnswerText] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)

  // Edit task state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [savingTask, setSavingTask] = useState(false)
  const [newDocuments, setNewDocuments] = useState([]) // For uploading new documents during edit

  // Rating state
  const [ratingBidId, setRatingBidId] = useState(null)
  const [ratingValue, setRatingValue] = useState('')
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    checkAuth()
    loadTaskDetails()
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
    setEditingTask(taskData)

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

    // Load bids with subcontractor profiles
    const { data: bidsData } = await supabase
      .from('bids')
      .select('*, profiles(full_name, company_name, email, phone, average_rating, total_projects)')
      .eq('task_id', params.taskId)
      .order('created_at', { ascending: false })

    if (bidsData) setBids(bidsData)

    // Load questions
    const { data: questionsData } = await supabase
      .from('task_questions')
      .select('*, profiles(full_name, company_name, email)')
      .eq('task_id', params.taskId)
      .order('created_at', { ascending: false })

    if (questionsData) setQuestions(questionsData)

    setLoading(false)
  }

  const handleAcceptBid = async (bidId) => {
    if (!confirm('Accept this proposal? This will set the task status to "assigned" and reject other bids.')) {
      return
    }

    // Update bid to accepted
    const { error: bidError } = await supabase
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bidId)

    if (bidError) {
      alert('Error accepting bid: ' + bidError.message)
      return
    }

    // Update task status to assigned
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: 'assigned' })
      .eq('id', params.taskId)

    if (taskError) {
      alert('Error updating task: ' + taskError.message)
      return
    }

    // Reject other bids
    const otherBidIds = bids.filter(b => b.id !== bidId).map(b => b.id)
    if (otherBidIds.length > 0) {
      await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .in('id', otherBidIds)
    }

    loadTaskDetails()
  }

  const handleRejectBid = async (bidId) => {
    if (!confirm('Reject this proposal?')) {
      return
    }

    const { error } = await supabase
      .from('bids')
      .update({ status: 'rejected' })
      .eq('id', bidId)

    if (error) {
      alert('Error rejecting bid: ' + error.message)
      return
    }

    loadTaskDetails()
  }

  const handleSubmitAnswer = async (questionId) => {
    if (!answerText.trim()) {
      alert('Please enter an answer')
      return
    }

    setSubmittingAnswer(true)

    const { error } = await supabase
      .from('task_questions')
      .update({ answer: answerText })
      .eq('id', questionId)

    if (error) {
      alert('Error submitting answer: ' + error.message)
      setSubmittingAnswer(false)
      return
    }

    setAnswerText('')
    setAnsweringQuestionId(null)
    setSubmittingAnswer(false)
    loadTaskDetails()
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setSavingTask(true)

    const { error } = await supabase
      .from('tasks')
      .update({
        name: editingTask.name,
        description: editingTask.description,
        short_description: editingTask.short_description,
        budget_min: editingTask.budget_min,
        budget_max: editingTask.budget_max,
        suggested_price: editingTask.suggested_price,
        estimated_duration: editingTask.estimated_duration,
        status: editingTask.status,
        bid_deadline: editingTask.bid_deadline || null
      })
      .eq('id', params.taskId)

    if (error) {
      alert('Error updating task: ' + error.message)
      setSavingTask(false)
      return
    }

    // Upload new documents if any
    if (newDocuments.length > 0) {
      let uploadedCount = 0
      for (const doc of newDocuments) {
        const fileExt = doc.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `documents/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, doc)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath)

        await supabase
          .from('task_documents')
          .insert([
            {
              task_id: params.taskId,
              file_name: doc.name,
              file_url: publicUrl,
              file_type: doc.type,
              uploaded_by: profile.id
            }
          ])

        uploadedCount++
      }
    }

    setSavingTask(false)
    setShowEditModal(false)
    setNewDocuments([])
    loadTaskDetails()
  }

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task? This will also delete all associated files. This action cannot be undone.')) {
      return
    }

    // Import deleteTaskFiles
    const { deleteTaskFiles } = await import('@/lib/deleteTaskFiles')

    // Usuń pliki z storage przed usunięciem taska
    const fileResult = await deleteTaskFiles(params.taskId)
    
    if (fileResult.filesDeleted > 0) {
      console.log(`Deleted ${fileResult.filesDeleted} files from storage`)
    }
    
    if (fileResult.errors.length > 0) {
      console.warn('Some files could not be deleted:', fileResult.errors)
    }

    // Usuń task (CASCADE usunie task_documents, bids, ratings, photos, questions)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', params.taskId)

    if (error) {
      alert('Error deleting task: ' + error.message)
      return
    }

    alert(`Task deleted successfully. ${fileResult.filesDeleted} file(s) removed from storage.`)
    router.push(`/admin/projects/${params.id}`)
  }

  const handleSubmitRating = async (bidId, subcontractorId) => {
    if (!ratingValue || ratingValue < 1 || ratingValue > 10) {
      alert('Please enter a rating between 1 and 10')
      return
    }

    setSubmittingRating(true)

    const { error } = await supabase
      .from('task_ratings')
      .insert([
        {
          task_id: params.taskId,
          subcontractor_id: subcontractorId,
          rating: parseInt(ratingValue),
          comment: ratingComment,
          rated_by: profile.id
        }
      ])

    if (error) {
      alert('Error submitting rating: ' + error.message)
      setSubmittingRating(false)
      return
    }

    // Update average rating for subcontractor
    const { data: ratings } = await supabase
      .from('task_ratings')
      .select('rating')
      .eq('subcontractor_id', subcontractorId)

    if (ratings && ratings.length > 0) {
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      const totalProjects = ratings.length

      await supabase
        .from('profiles')
        .update({
          average_rating: avgRating.toFixed(2),
          total_projects: totalProjects
        })
        .eq('id', subcontractorId)
    }

    setRatingBidId(null)
    setRatingValue('')
    setRatingComment('')
    setSubmittingRating(false)
    loadTaskDetails()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Task not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-500">
              <button
                onClick={() => router.push(`/admin/projects/${params.id}`)}
                className="hover:text-blue-600 transition"
              >
                {project?.name}
              </button>
              {' → '}
              <span>{category?.name}</span>
            </div>
            <button
              onClick={() => router.push(`/admin/projects/${params.id}`)}
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
                  task.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {task.status}
                </span>
                <span className="text-sm text-gray-600">
                  {bids.length} proposal{bids.length !== 1 ? 's' : ''} received
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a5179] transition"
              >
                Edit Task
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Task Details</h2>

              <div className="grid grid-cols-2 gap-6 mb-6">
                {(task.budget_min || task.budget_max || task.suggested_price) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Suggested Budget</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {task.budget_min && task.budget_max ? (
                        `${formatCurrency(task.budget_min)} - ${formatCurrency(task.budget_max)}`
                      ) : task.budget_min ? (
                        `From ${formatCurrency(task.budget_min)}`
                      ) : task.budget_max ? (
                        `Up to ${formatCurrency(task.budget_max)}`
                      ) : (
                        formatCurrency(task.suggested_price)
                      )}
                    </div>
                  </div>
                )}
                {task.estimated_duration && (
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

            {/* Bids section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Proposals ({bids.length})
              </h2>
              {bids.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No proposals submitted yet
                </p>
              ) : (
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <div key={bid.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-lg text-gray-900">
                            {bid.profiles?.company_name || bid.profiles?.full_name || 'Subcontractor'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {bid.profiles?.email}
                            {bid.profiles?.phone && ` • ${bid.profiles.phone}`}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Rating: {bid.profiles?.average_rating || 0} ⭐ |
                            Completed: {bid.profiles?.total_projects || 0} projects
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(bid.price)}
                          </div>
                          <div className="text-sm text-gray-600">{bid.duration} days</div>
                          <div className="mt-2">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              bid.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {bid.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {bid.comment && (
                        <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="text-sm font-medium text-gray-700 mb-1">Approach & Comments:</div>
                          <div className="text-sm text-gray-700">{bid.comment}</div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mb-3">
                        Submitted: {new Date(bid.created_at).toLocaleString('en-GB')}
                      </div>

                      {bid.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptBid(bid.id)}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                          >
                            Accept Proposal
                          </button>
                          <button
                            onClick={() => handleRejectBid(bid.id)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {bid.status === 'accepted' && ratingBidId !== bid.id && (
                        <div className="mt-3">
                          <button
                            onClick={() => setRatingBidId(bid.id)}
                            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
                          >
                            ⭐ Rate Subcontractor
                          </button>
                        </div>
                      )}

                      {bid.status === 'accepted' && ratingBidId === bid.id && (
                        <div className="mt-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="text-sm font-semibold text-gray-700 mb-3">Rate this subcontractor&apos;s performance</div>
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rating (1-10) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={ratingValue}
                              onChange={(e) => setRatingValue(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                              placeholder="Enter 1-10"
                            />
                          </div>
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Comment (optional)
                            </label>
                            <textarea
                              value={ratingComment}
                              onChange={(e) => setRatingComment(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                              rows="2"
                              placeholder="Quality of work, professionalism, timeliness..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSubmitRating(bid.id, bid.subcontractor_id)}
                              disabled={submittingRating}
                              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition font-medium"
                            >
                              {submittingRating ? 'Submitting...' : 'Submit Rating'}
                            </button>
                            <button
                              onClick={() => {
                                setRatingBidId(null)
                                setRatingValue('')
                                setRatingComment('')
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Questions section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Questions & Answers ({questions.length})
              </h2>
              {questions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No questions yet</p>
              ) : (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="border-l-4 border-[#1e3a5f] pl-4 py-3 bg-[#1e3a5f]/5">
                      <div className="flex justify-between items-start text-sm mb-2">
                        <div>
                          <span className="font-semibold text-[#1e3a5f]">
                            {q.profiles?.company_name || q.profiles?.full_name || 'Anonymous'}
                          </span>
                          {q.profiles?.email && (
                            <span className="text-gray-500 text-xs ml-2">
                              ({q.profiles.email})
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500">{new Date(q.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="font-semibold text-gray-900 mb-2">
                        Q: {q.question}
                      </div>

                      {q.answer ? (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <span className="text-sm font-medium text-green-800">A: </span>
                          <span className="text-gray-700">{q.answer}</span>
                        </div>
                      ) : answeringQuestionId === q.id ? (
                        <div className="mt-3">
                          <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                            rows="3"
                            placeholder="Type your answer..."
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleSubmitAnswer(q.id)}
                              disabled={submittingAnswer}
                              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a5179] disabled:bg-gray-400 transition"
                            >
                              {submittingAnswer ? 'Submitting...' : 'Submit Answer'}
                            </button>
                            <button
                              onClick={() => {
                                setAnsweringQuestionId(null)
                                setAnswerText('')
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAnsweringQuestionId(q.id)}
                          className="mt-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a5179] transition text-sm"
                        >
                          Answer Question
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Documents */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                Documents ({documents.length})
              </h3>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents available</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
                    >
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="text-sm text-gray-700 group-hover:text-blue-600 flex-1">
                        {doc.file_name}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Task info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Task Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500">Category</div>
                  <div className="font-medium text-gray-900">{category?.name}</div>
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

      {/* Edit Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Edit Task</h2>
            <form onSubmit={handleSaveEdit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Task Name</label>
                  <input
                    type="text"
                    value={editingTask.name}
                    onChange={(e) => setEditingTask({...editingTask, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a5f]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Short Description</label>
                  <input
                    type="text"
                    value={editingTask.short_description || ''}
                    onChange={(e) => setEditingTask({...editingTask, short_description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Full Description</label>
                  <textarea
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a5f]"
                    rows="6"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-2">
                    Budget Range (£) *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Minimum</label>
                      <input
                        type="number"
                        value={editingTask.budget_min || ''}
                        onChange={(e) => setEditingTask({...editingTask, budget_min: e.target.value})}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                        placeholder="10000"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Maximum</label>
                      <input
                        type="number"
                        value={editingTask.budget_max || ''}
                        onChange={(e) => setEditingTask({...editingTask, budget_max: e.target.value})}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                        placeholder="15000"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Set the expected budget range for this task</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-2">
                      Suggested Price (£)
                      <span className="text-sm font-normal text-gray-500 ml-2">(optional - for reference)</span>
                    </label>
                    <input
                      type="number"
                      value={editingTask.suggested_price || ''}
                      onChange={(e) => setEditingTask({...editingTask, suggested_price: e.target.value})}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                      placeholder="12500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-2">
                      Estimated Duration (days)
                    </label>
                    <input
                      type="number"
                      value={editingTask.estimated_duration || ''}
                      onChange={(e) => setEditingTask({...editingTask, estimated_duration: e.target.value})}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                      placeholder="20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a5f]"
                  >
                    <option value="open">Open</option>
                    <option value="closing_soon">Closing Soon</option>
                    <option value="closed">Closed</option>
                    <option value="awarded">Awarded</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Bid Deadline */}
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <label className="block font-bold mb-2 text-yellow-900">
                    💰 Bid Deadline (Proposal Submission Closes)
                  </label>
                  <input
                    type="datetime-local"
                    value={editingTask.bid_deadline ? new Date(editingTask.bid_deadline).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditingTask({...editingTask, bid_deadline: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <p className="text-sm text-yellow-700 mt-2">
                    ⏰ Subcontractors can only submit proposals before this deadline.
                  </p>
                </div>

                {/* Existing Documents */}
                {documents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Documents ({documents.length})</label>
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-700 truncate">{doc.file_name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Delete this document?')) {
                                // Extract file path from URL
                                const urlParts = doc.file_url.split('/')
                                const filePath = `documents/${urlParts[urlParts.length - 1]}`
                                
                                // Delete from storage
                                await supabase.storage
                                  .from('project-files')
                                  .remove([filePath])
                                
                                // Delete from database
                                await supabase
                                  .from('task_documents')
                                  .delete()
                                  .eq('id', doc.id)
                                
                                loadTaskDetails()
                              }
                            }}
                            className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Documents */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Add New Documents (PDF, DWG, Images, etc.)
                  </label>
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/30 hover:bg-blue-50 transition">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files)
                        setNewDocuments([...newDocuments, ...newFiles])
                        e.target.value = ''
                      }}
                      className="w-full px-3 py-2 border border-blue-300 bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] text-sm"
                    />
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      📎 Click &quot;Choose Files&quot; multiple times to add more documents
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      You can select multiple files at once (Ctrl/Cmd + Click) or add them one by one
                    </p>
                  </div>

                  {newDocuments.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-semibold text-green-800 mb-2 flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {newDocuments.length} new file{newDocuments.length > 1 ? 's' : ''} to upload
                      </div>
                      <div className="space-y-2">
                        {newDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900 truncate">{doc.name}</div>
                                <div className="text-xs text-gray-500">{(doc.size / 1024).toFixed(1)} KB</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newDocs = newDocuments.filter((_, i) => i !== index)
                                setNewDocuments(newDocs)
                              }}
                              className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded flex-shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewDocuments([])}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear all new files
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={savingTask}
                  className="flex-1 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a5179] disabled:bg-gray-400"
                >
                  {savingTask ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingTask(task)
                    setNewDocuments([])
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}