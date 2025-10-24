'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
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
      console.error('Task error:', taskError)
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

    const { data, error: bidError } = await supabase
      .from('bids')
      .insert([
        {
          task_id: params.taskId,
          subcontractor_id: user.id,
          price: parseFloat(proposalPrice),
          duration: parseInt(proposalDuration),
          comment: proposalComment,
          status: 'pending'
        }
      ])

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
    }, 2000)
  }

  const handleAskQuestion = async (e) => {
    e.preventDefault()

    if (!user) {
      router.push('/login')
      return
    }

    setAskingQuestion(true)

    const { error: questionError } = await supabase
      .from('task_questions')
      .insert([
        {
          task_id: params.taskId,
          user_id: user.id,
          question: questionText
        }
      ])

    if (questionError) {
      console.error('Question error:', questionError)
      setAskingQuestion(false)
      return
    }

    setQuestionText('')
    setShowQuestionForm(false)
    setAskingQuestion(false)
    loadTaskDetails()
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-500">
              <button
                onClick={() => router.push(`/projects/${params.id}`)}
                className="hover:text-blue-600 transition"
              >
                {project?.name}
              </button>
              {' → '}
              <span>{category?.name}</span>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Task Details</h2>

              <div className="grid grid-cols-2 gap-6 mb-6">
                {task.suggested_price && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Suggested Budget</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(task.suggested_price)}
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

            {/* Questions section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
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
                    <div key={q.id} className="border-l-4 border-blue-500 pl-4 py-3">
                      <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span className="font-medium">
                          {q.profiles?.company_name || q.profiles?.full_name || 'Anonymous'}
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
            {canSubmitProposal && !showProposalForm && (
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-2">Ready to bid?</h3>
                <p className="text-blue-100 mb-4 text-sm">
                  Submit your proposal with pricing and timeline
                </p>
                <button
                  onClick={() => setShowProposalForm(true)}
                  className="w-full px-4 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition shadow"
                >
                  Submit Proposal
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
                <h3 className="text-xl font-bold text-gray-900 mb-4">Submit Your Proposal</h3>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                    Proposal submitted successfully!
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
                      {submitting ? 'Submitting...' : 'Submit Proposal'}
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
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
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
    </div>
  )
}
