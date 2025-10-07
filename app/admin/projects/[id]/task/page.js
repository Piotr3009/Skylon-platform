'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function TaskDetailPage() {
  const [task, setTask] = useState(null)
  const [category, setCategory] = useState(null)
  const [project, setProject] = useState(null)
  const [documents, setDocuments] = useState([])
  const [bids, setBids] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    loadTaskDetails()
  }, [])

  const loadTaskDetails = async () => {
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

    const { data: categoryData } = await supabase
      .from('categories')
      .select('*')
      .eq('id', taskData.category_id)
      .single()

    setCategory(categoryData)

    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()

    setProject(projectData)

    const { data: docsData } = await supabase
      .from('task_documents')
      .select('*')
      .eq('task_id', params.taskId)

    if (docsData) setDocuments(docsData)

    const { data: bidsData } = await supabase
      .from('bids')
      .select('*, profiles(*)')
      .eq('task_id', params.taskId)
      .order('created_at', { ascending: false })

    if (bidsData) setBids(bidsData)

    const { data: questionsData } = await supabase
      .from('task_questions')
      .select('*, profiles(*)')
      .eq('task_id', params.taskId)
      .order('created_at', { ascending: false })

    if (questionsData) setQuestions(questionsData)

    setLoading(false)
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500 mb-1">
                {project?.name} → {category?.name}
              </div>
              <h1 className="text-2xl font-bold">{task.name}</h1>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Task Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <span className={`inline-block px-3 py-1 text-sm rounded mt-1 ${task.status === 'open' ? 'bg-green-100 text-green-800' : task.status === 'assigned' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {task.status}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Budget Range</div>
                  <div className="font-bold">
                    {task.budget_min && task.budget_max ? `£${task.budget_min} - £${task.budget_max}` : task.suggested_price ? `£${task.suggested_price}` : 'Not set'}
                  </div>
                </div>
              </div>
              {task.short_description && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Short Description</div>
                  <div className="text-gray-800">{task.short_description}</div>
                </div>
              )}
              {task.description && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Full Description</div>
                  <div className="text-gray-800 whitespace-pre-wrap">{task.description}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Estimated Duration</div>
                  <div className="font-medium">{task.estimated_duration ? `${task.estimated_duration} days` : 'Not set'}</div>
                </div>
                {task.bid_deadline && (
                  <div>
                    <div className="text-sm text-gray-600">Bid Deadline</div>
                    <div className="font-medium">{new Date(task.bid_deadline).toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Questions ({questions.length})</h2>
              {questions.length === 0 ? (
                <p className="text-gray-500">No questions yet</p>
              ) : (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>{q.profiles?.company_name || q.profiles?.email}</span>
                        <span>{new Date(q.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="font-medium mb-2">Q: {q.question}</div>
                      {q.answer ? (
                        <div className="text-gray-700 bg-gray-50 p-2 rounded">A: {q.answer}</div>
                      ) : (
                        <div className="text-gray-400 italic">Not answered yet</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Bids ({bids.length})</h2>
              {bids.length === 0 ? (
                <p className="text-gray-500">No bids yet</p>
              ) : (
                <div className="space-y-3">
                  {bids.map((bid) => (
                    <div key={bid.id} className="border rounded p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold">{bid.profiles?.company_name || bid.profiles?.email}</div>
                          <div className="text-sm text-gray-500">
                            Rating: {bid.profiles?.average_rating || 0} ⭐ | Projects: {bid.profiles?.total_projects || 0}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600">£{bid.price}</div>
                          <div className="text-sm text-gray-500">{bid.duration} days</div>
                        </div>
                      </div>
                      {bid.comment && <div className="text-sm text-gray-700 mt-2">{bid.comment}</div>}
                      <div className="mt-3">
                        <span className={`px-2 py-1 text-xs rounded ${bid.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : bid.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {bid.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold mb-4">Documents ({documents.length})</h3>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="block p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
                      {doc.file_name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold mb-4">Actions</h3>
              <button onClick={() => alert('Edit functionality coming soon')} className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2">
                Edit Task
              </button>
              <button onClick={() => alert('Delete functionality coming soon')} className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Delete Task
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}