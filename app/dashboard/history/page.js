'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
}

export default function HistoryPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [completedTasks, setCompletedTasks] = useState([])
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profileData || profileData.role !== 'subcontractor') {
      router.push('/dashboard')
      return
    }

    setProfile(profileData)
    await loadHistory(user.id)
    setLoading(false)
  }

  const loadHistory = async (userId) => {
    // Load ALL bids (pending, negotiation, accepted, rejected)
    const { data: bidsData } = await supabase
      .from('bids')
      .select(`
        *,
        tasks!inner(id, name, status, suggested_price),
        categories!inner(name),
        projects!inner(name, project_image_url)
      `)
      .eq('subcontractor_id', userId)
      .order('created_at', { ascending: false })

    if (bidsData) {
      const formattedTasks = bidsData.map(bid => ({
        id: bid.id,
        task_id: bid.task_id,
        task_name: bid.tasks?.name || 'Unknown Task',
        project_name: bid.projects?.name || 'Unknown Project',
        project_image: bid.projects?.project_image_url,
        category_name: bid.categories?.name || 'Unknown',
        price: bid.price,
        duration: bid.duration,
        bid_status: bid.status, // pending, negotiation, accepted, rejected
        task_status: bid.tasks?.status, // open, assigned, in_progress, completed
        created_at: bid.created_at
      }))
      setCompletedTasks(formattedTasks)
    }

    // Load ratings
    const { data: ratingsData } = await supabase
      .from('task_ratings')
      .select('*, tasks(name), profiles!task_ratings_rated_by_fkey(full_name, company_name)')
      .eq('subcontractor_id', userId)
      .order('created_at', { ascending: false })

    if (ratingsData) setRatings(ratingsData)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const avgRating = profile?.average_rating || 0
  const totalProjects = profile?.total_projects || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <Header
        title="My Project History"
        subtitle="View your completed projects and ratings"
        user={user}
        profile={profile}
        onLogout={handleLogout}
        showHome={true}
        showDashboard={true}
        gradient={true}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm font-medium mb-1">Average Rating</div>
            <div className="text-4xl font-bold text-yellow-600 flex items-center gap-2">
              {avgRating}
              <span className="text-2xl">⭐</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Out of 10</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm font-medium mb-1">Completed Projects</div>
            <div className="text-4xl font-bold text-green-600">{totalProjects}</div>
            <div className="text-xs text-gray-500 mt-1">Total rated tasks</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-gray-600 text-sm font-medium mb-1">All My Proposals</div>
            <div className="text-4xl font-bold text-blue-600">{completedTasks.length}</div>
            <div className="text-xs text-gray-500 mt-1">All statuses included</div>
          </div>
        </div>

        {/* Ratings Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            My Ratings ({ratings.length})
          </h2>

          {ratings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No ratings yet. Complete projects to receive ratings from coordinators.
            </p>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{rating.tasks?.name || 'Task'}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Rated by: {rating.profiles?.full_name || rating.profiles?.company_name || 'Coordinator'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-yellow-600 flex items-center gap-1">
                        {rating.rating}
                        <span className="text-xl">⭐</span>
                      </div>
                      <div className="text-xs text-gray-500">/ 10</div>
                    </div>
                  </div>

                  {rating.comment && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-sm font-medium text-gray-700 mb-1">Feedback:</div>
                      <div className="text-sm text-gray-700">{rating.comment}</div>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(rating.created_at).toLocaleDateString('en-GB')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="text-xl font-bold text-gray-900 mb-4">
              My Proposals History ({completedTasks.length})
            </div>

            {completedTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No proposals yet. Browse available projects and submit proposals to get started.
              </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
                  onClick={() => router.push(`/projects/${task.project_id || task.categories?.project_id}`)}
                >
                  {task.project_image && (
                    <img
                      src={task.project_image}
                      alt={task.project_name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}

                  <div className="mb-2">
                    <div className="font-semibold text-gray-900">{task.task_name}</div>
                    <div className="text-sm text-gray-600 mt-1">{task.project_name}</div>
                    <div className="text-xs text-gray-500 mt-1">{task.category_name}</div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(task.price)}</div>
                      <div className="text-xs text-gray-500">{task.duration} days</div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {/* Bid Status */}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        task.bid_status === 'accepted' ? 'bg-green-100 text-green-800' :
                        task.bid_status === 'negotiation' ? 'bg-orange-100 text-orange-800' :
                        task.bid_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.bid_status}
                      </span>
                      {/* Task Status (only for accepted bids) */}
                      {task.bid_status === 'accepted' && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          task.task_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          task.task_status === 'in_progress' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.task_status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Submitted: {new Date(task.created_at).toLocaleDateString('en-GB')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 