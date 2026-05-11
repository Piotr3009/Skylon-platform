'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

const formatCurrency = (value) => {
  if (!value || Number.isNaN(value)) return '—'
  return `£${Number(value).toLocaleString('en-GB')}`
}

export default function SubcontractorsPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [subcontractors, setSubcontractors] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedSub, setSelectedSub] = useState(null)
  const [subHistory, setSubHistory] = useState({ ratings: [], bids: [], loading: true })
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    totalBids: 0,
    avgRating: 0
  })
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

    setUser(user)
    setProfile(profileData)
    await loadSubcontractors()
  }

  const loadSubcontractors = async () => {
    try {
      // Fetch all subcontractors
      const { data: subcontractorsData, error: subError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'subcontractor')
        .order('created_at', { ascending: false })

      if (subError) throw subError

      // For each subcontractor, get their pending bids count and documents
      const enrichedData = await Promise.all(
        subcontractorsData.map(async (sub) => {
          // Get pending bids count
          const { count: pendingCount } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('subcontractor_id', sub.id)
            .eq('status', 'pending')

          // Get documents
          const { data: documents } = await supabase
            .from('subcontractor_documents')
            .select('*')
            .eq('subcontractor_id', sub.id)
            .order('uploaded_at', { ascending: false })

          return {
            ...sub,
            pendingBids: pendingCount || 0,
            documents: documents || []
          }
        })
      )

      setSubcontractors(enrichedData)

      // Calculate stats
      const totalSubs = enrichedData.length
      const verifiedCount = enrichedData.filter(s => s.email_verified).length
      const totalBidsCount = enrichedData.reduce((sum, s) => sum + s.pendingBids, 0)
      
      // Get real average from task_ratings + archived_task_ratings
      const { data: allActiveRatings } = await supabase
        .from('task_ratings')
        .select('rating')
      const { data: allArchivedRatings } = await supabase
        .from('archived_task_ratings')
        .select('rating')
      
      const allRatingsForAvg = [...(allActiveRatings || []), ...(allArchivedRatings || [])]
      const avgRating = allRatingsForAvg.length > 0
        ? allRatingsForAvg.reduce((sum, r) => sum + r.rating, 0) / allRatingsForAvg.length
        : 0

      setStats({
        total: totalSubs,
        verified: verifiedCount,
        totalBids: totalBidsCount,
        avgRating: avgRating.toFixed(1)
      })

      setLoading(false)
    } catch (error) {
      console.error('Error loading subcontractors:', error)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getDocumentUrl = (fileUrl) => {
    if (!fileUrl) return '#'
    
    // If it's already a full URL, return it
    if (fileUrl.startsWith('http')) return fileUrl
    
    // Otherwise construct Supabase storage URL
    const { data } = supabase.storage
      .from('subcontractor-documents')
      .getPublicUrl(fileUrl)
    
    return data.publicUrl
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' })
  }

  const isExpired = (dateString) => {
    if (!dateString) return false
    return new Date(dateString) < new Date()
  }

  const handleDeleteSubcontractor = async (subId, subName) => {
    if (!confirm(`Are you sure you want to delete "${subName || 'this subcontractor'}"?\n\nThis will permanently delete:\n- Their profile\n- All their bids\n- All their documents\n\nThis action cannot be undone.`)) {
      return
    }

    setDeleting(subId)

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: subId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete subcontractor')
      }

      // Refresh list
      await loadSubcontractors()
      alert('Subcontractor deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      alert('Error deleting subcontractor: ' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleViewHistory = async (sub) => {
    setSelectedSub(sub)
    setShowHistoryModal(true)
    setSubHistory({ ratings: [], bids: [], loading: true })

    // Load ratings (active)
    const { data: ratingsData } = await supabase
      .from('task_ratings')
      .select('*, tasks(name, status), profiles!task_ratings_rated_by_fkey(full_name)')
      .eq('subcontractor_id', sub.id)
      .order('created_at', { ascending: false })

    // Load archived ratings
    const { data: archivedRatingsData } = await supabase
      .from('archived_task_ratings')
      .select('*, archived_tasks(name), profiles!archived_task_ratings_rated_by_fkey(full_name)')
      .eq('subcontractor_id', sub.id)
      .order('original_created_at', { ascending: false })

    const allRatings = [
      ...(ratingsData || []).map(r => ({
        id: r.id,
        taskName: r.tasks?.name || 'Task',
        rating: r.rating,
        comment: r.comment,
        ratedBy: r.profiles?.full_name || 'Coordinator',
        date: r.created_at,
        archived: false
      })),
      ...(archivedRatingsData || []).map(r => ({
        id: 'a-' + r.id,
        taskName: r.archived_tasks?.name || 'Task',
        rating: r.rating,
        comment: r.comment,
        ratedBy: r.profiles?.full_name || 'Coordinator',
        date: r.original_created_at,
        archived: true
      }))
    ]

    // Load accepted bids (active)
    const { data: bidsData } = await supabase
      .from('bids')
      .select('*, tasks(name, status)')
      .eq('subcontractor_id', sub.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    // Load archived accepted bids
    const { data: archivedBidsData } = await supabase
      .from('archived_bids')
      .select('*, archived_tasks(name, status), archived_projects(name)')
      .eq('subcontractor_id', sub.id)
      .eq('status', 'accepted')
      .order('original_created_at', { ascending: false })

    const allBids = [
      ...(bidsData || []).map(b => ({
        id: b.id,
        taskName: b.tasks?.name || 'Task',
        taskStatus: b.tasks?.status || 'unknown',
        price: b.price,
        duration: b.duration,
        date: b.created_at,
        archived: false
      })),
      ...(archivedBidsData || []).map(b => ({
        id: 'a-' + b.id,
        taskName: b.archived_tasks?.name || 'Task',
        projectName: b.archived_projects?.name || '',
        taskStatus: b.archived_tasks?.status || 'completed',
        price: b.price,
        duration: b.duration,
        date: b.original_created_at,
        archived: true
      }))
    ]

    setSubHistory({ ratings: allRatings, bids: allBids, loading: false })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{`
        .details-cell {
          max-width: 250px;
        }
        details summary {
          cursor: pointer;
          user-select: none;
        }
        details summary::-webkit-details-marker {
          display: none;
        }
        .navy-header {
          background: linear-gradient(to right, #1e3a5f, #2a5179, #1e3a5f) !important;
          border-bottom: 1px solid #163050;
          position: relative;
          z-index: 10;
        }
        .navy-table-header {
          background: linear-gradient(to right, #1e3a5f, #2a5179) !important;
        }
        .navy-table-header th {
          color: white !important;
        }
      `}</style>

      {/* Header */}
      <header className="navy-header shadow-lg">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Skylon" className="h-10" />
              <div>
                <h1 className="text-2xl font-bold text-white">Subcontractors Management</h1>
                <p className="text-sm text-white/80 mt-1">View and manage all registered subcontractors</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/specializations')}
                className="px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg hover:bg-white/30 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Specializations
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                Home
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-sm font-medium text-gray-600">Total Subcontractors</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-sm font-medium text-gray-600">Verified Email</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.verified}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="text-sm font-medium text-gray-600">Active Bids</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalBids}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-sm font-medium text-gray-600">Avg Rating</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.avgRating}</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, company, email, specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="navy-table-header text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Company / Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Specialization</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Stats</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pending Bids</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Company Details</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subcontractors
                  .filter(sub => {
                    if (!searchTerm) return true
                    const term = searchTerm.toLowerCase()
                    return (
                      (sub.company_name || '').toLowerCase().includes(term) ||
                      (sub.full_name || '').toLowerCase().includes(term) ||
                      (sub.email || '').toLowerCase().includes(term) ||
                      (sub.phone || '').toLowerCase().includes(term) ||
                      (sub.specialization || []).some(s => s.toLowerCase().includes(term))
                    )
                  })
                  .map((sub) => (
                  <tr 
                    key={sub.id} 
                    className={`hover:bg-gray-50 ${sub.pendingBids > 0 ? 'bg-yellow-50' : ''}`}
                  >
                    {/* Company / Contact */}
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">
                        {sub.company_name || sub.full_name || 'No name'}
                      </div>
                      {sub.full_name && sub.company_name && (
                        <div className="text-sm text-gray-600">{sub.full_name}</div>
                      )}
                      <div className="text-sm text-gray-500">{sub.email}</div>
                      {sub.phone && (
                        <div className="text-sm text-gray-500">{sub.phone}</div>
                      )}
                    </td>

                    {/* Email Status */}
                    <td className="px-4 py-4">
                      {sub.email_verified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ✗ Not Verified
                        </span>
                      )}
                    </td>

                    {/* Specialization */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {sub.specialization && sub.specialization.length > 0 ? (
                          sub.specialization.map((spec, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {spec}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No specialization</span>
                        )}
                      </div>
                    </td>

                    {/* Stats */}
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-500">★</span>
                          <span className="font-semibold">
                            {sub.average_rating ? Number(sub.average_rating).toFixed(1) : '0.0'}
                          </span>
                        </div>
                        <div className="text-gray-600">Projects: {sub.total_projects || 0}</div>
                        <div className="text-gray-600">Earned: {formatCurrency(sub.total_earned)}</div>
                      </div>
                    </td>

                    {/* Pending Bids */}
                    <td className="px-4 py-4">
                      {sub.pendingBids > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                          {sub.pendingBids} pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-600">
                          0 pending
                        </span>
                      )}
                    </td>

                    {/* Company Details */}
                    <td className="px-4 py-4 details-cell">
                      <details className="text-sm">
                        <summary className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <span>▶</span> View Details
                        </summary>
                        <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                          {/* Registration */}
                          <div>
                            <div className="font-semibold text-gray-700">Registration:</div>
                            {sub.vat_number && (
                              <div className="text-gray-600">VAT: {sub.vat_number}</div>
                            )}
                            {sub.company_registration_number && (
                              <div className="text-gray-600">Reg: {sub.company_registration_number}</div>
                            )}
                            {sub.years_in_business && (
                              <div className="text-gray-600">Years: {sub.years_in_business}</div>
                            )}
                            {!sub.vat_number && !sub.company_registration_number && (
                              <div className="text-gray-400">Not provided</div>
                            )}
                          </div>

                          {/* Tax / CIS */}
                          <div>
                            <div className="font-semibold text-gray-700">Tax / CIS:</div>
                            {sub.nin && (
                              <div className="text-gray-600">NIN: {sub.nin}</div>
                            )}
                            {sub.utr && (
                              <div className="text-gray-600">UTR: {sub.utr}</div>
                            )}
                            {sub.cis_status && (
                              <div className="text-gray-600">
                                CIS: <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  sub.cis_status === 'verified' ? 'bg-green-100 text-green-800' :
                                  sub.cis_status === 'gross' ? 'bg-blue-100 text-blue-800' :
                                  sub.cis_status === 'net' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {sub.cis_status === 'not_registered' ? 'Not Registered' :
                                   sub.cis_status === 'gross' ? 'Gross (0%)' :
                                   sub.cis_status === 'net' ? 'Net (20%)' :
                                   sub.cis_status === 'verified' ? 'Verified' :
                                   sub.cis_status}
                                </span>
                              </div>
                            )}
                            {!sub.nin && !sub.utr && !sub.cis_status && (
                              <div className="text-gray-400">Not provided</div>
                            )}
                          </div>

                          {/* Insurance */}
                          <div>
                            <div className="font-semibold text-gray-700">Insurance:</div>
                            {sub.public_liability_insurance ? (
                              <div className={isExpired(sub.public_liability_expiry) ? 'text-red-600' : 'text-gray-600'}>
                                {isExpired(sub.public_liability_expiry) ? '✗' : '✓'} Public Liability
                                {sub.public_liability_amount && ` (${formatCurrency(sub.public_liability_amount)})`}
                                {sub.public_liability_expiry && ` - expires ${formatDate(sub.public_liability_expiry)}`}
                                {isExpired(sub.public_liability_expiry) && ' - EXPIRED'}
                              </div>
                            ) : (
                              <div className="text-gray-400">✗ No Public Liability</div>
                            )}

                            {sub.employers_liability_insurance ? (
                              <div className={isExpired(sub.employers_liability_expiry) ? 'text-red-600' : 'text-gray-600'}>
                                {isExpired(sub.employers_liability_expiry) ? '✗' : '✓'} Employers Liability
                                {sub.employers_liability_expiry && ` - expires ${formatDate(sub.employers_liability_expiry)}`}
                                {isExpired(sub.employers_liability_expiry) && ' - EXPIRED'}
                              </div>
                            ) : (
                              <div className="text-gray-400">✗ No Employers Liability</div>
                            )}

                            {sub.professional_indemnity_insurance ? (
                              <div className={isExpired(sub.professional_indemnity_expiry) ? 'text-red-600' : 'text-gray-600'}>
                                {isExpired(sub.professional_indemnity_expiry) ? '✗' : '✓'} Professional Indemnity
                                {sub.professional_indemnity_expiry && ` - expires ${formatDate(sub.professional_indemnity_expiry)}`}
                                {isExpired(sub.professional_indemnity_expiry) && ' - EXPIRED'}
                              </div>
                            ) : (
                              <div className="text-gray-400">✗ No Professional Indemnity</div>
                            )}
                          </div>

                          {/* Certificates */}
                          <div>
                            <div className="font-semibold text-gray-700">Certificates:</div>
                            {sub.health_safety_cert ? (
                              <div className={isExpired(sub.health_safety_expiry) ? 'text-red-600' : 'text-gray-600'}>
                                {isExpired(sub.health_safety_expiry) ? '✗' : '✓'} Health & Safety
                                {sub.health_safety_expiry && ` - expires ${formatDate(sub.health_safety_expiry)}`}
                                {isExpired(sub.health_safety_expiry) && ' - EXPIRED'}
                              </div>
                            ) : (
                              <div className="text-gray-400">✗ No H&S Certificate</div>
                            )}
                          </div>

                          {/* Documents */}
                          <div>
                            <div className="font-semibold text-gray-700">
                              Documents ({sub.documents.length}):
                            </div>
                            {sub.documents.length > 0 ? (
                              sub.documents.map((doc) => (
                                <a
                                  key={doc.id}
                                  href={getDocumentUrl(doc.file_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline block"
                                >
                                  📄 {doc.document_name}
                                </a>
                              ))
                            ) : (
                              <div className="text-gray-400">No documents uploaded</div>
                            )}
                          </div>

                          {/* Bank Details */}
                          <div>
                            <div className="font-semibold text-gray-700">Bank Details:</div>
                            {sub.bank_name ? (
                              <>
                                <div className="text-gray-600">Bank: {sub.bank_name}</div>
                                {sub.account_number && (
                                  <div className="text-gray-600">
                                    Account: ****{sub.account_number.slice(-4)}
                                  </div>
                                )}
                                {sub.sort_code && (
                                  <div className="text-gray-600">Sort: {sub.sort_code}</div>
                                )}
                              </>
                            ) : (
                              <div className="text-gray-400">Not provided</div>
                            )}
                          </div>
                        </div>
                      </details>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleViewHistory(sub)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                        >
                          📊 History
                        </button>
                        <button
                          onClick={() => handleDeleteSubcontractor(sub.id, sub.company_name || sub.full_name)}
                          disabled={deleting === sub.id}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400 transition"
                        >
                          {deleting === sub.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border border-yellow-200"></div>
            <span className="text-gray-600">Has pending bids</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600">✗</span>
            <span className="text-gray-600">Expired or missing documentation</span>
          </div>
        </div>

        {/* No subcontractors message */}
        {subcontractors.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No subcontractors registered yet.
          </div>
        )}
      </div>

      {/* Subcontractor History Modal */}
      {showHistoryModal && selectedSub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedSub.company_name || selectedSub.full_name}
                  </h2>
                  {selectedSub.company_name && selectedSub.full_name && (
                    <p className="text-sm text-gray-500">{selectedSub.full_name} • {selectedSub.email}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              {/* Stats - calculated from loaded data */}
              {(() => {
                const allRatings = subHistory.ratings || []
                const avgRating = allRatings.length > 0 
                  ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1)
                  : '0.0'
                const completedBids = (subHistory.bids || []).filter(b => b.taskStatus === 'completed')
                const totalTurnover = completedBids.reduce((sum, b) => sum + Number(b.price || 0), 0)

                return (
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-600">{avgRating}</div>
                      <div className="text-xs text-yellow-700">Rating ⭐</div>
                      <div className="text-[10px] text-yellow-600 mt-1">({allRatings.length} reviews)</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                      <div className="text-2xl font-bold text-green-600">{completedBids.length}</div>
                      <div className="text-xs text-green-700">Completed</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalTurnover)}</div>
                      <div className="text-xs text-blue-700">Turnover</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600">{(subHistory.bids || []).length}</div>
                      <div className="text-xs text-purple-700">Accepted</div>
                    </div>
                  </div>
                )
              })()}

              {/* Specializations */}
              {selectedSub.specialization && selectedSub.specialization.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Specializations</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedSub.specialization.map((spec, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {subHistory.loading ? (
                <div className="text-center py-8 text-gray-500">Loading history...</div>
              ) : (
                <>
                  {/* Accepted Work - FIRST, more prominent */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Accepted Work ({(subHistory.bids || []).length})
                    </h3>
                    {(subHistory.bids || []).length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">No accepted work yet</p>
                    ) : (
                      <div className="space-y-2">
                        {subHistory.bids.map((b) => (
                          <div key={b.id} className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300">
                            <div>
                              <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                                {b.taskName}
                                {b.archived && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-500 rounded">Archived</span>
                                )}
                              </div>
                              {b.projectName && (
                                <div className="text-xs text-gray-500">{b.projectName}</div>
                              )}
                              <div className="text-[10px] text-gray-400 mt-1">
                                {b.duration} days • {new Date(b.date).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm text-gray-900">{formatCurrency(b.price)}</div>
                              <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                                b.taskStatus === 'completed' ? 'bg-green-100 text-green-700' :
                                b.taskStatus === 'assigned' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {b.taskStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ratings - collapsible */}
                  <details className="mb-6">
                    <summary className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span>⭐ Ratings ({(subHistory.ratings || []).length})</span>
                      <span className="text-xs text-gray-500">Click to expand</span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {(subHistory.ratings || []).length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 text-center">No ratings yet</p>
                      ) : (
                        subHistory.ratings.map((r) => (
                          <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div>
                              <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                                {r.taskName}
                                {r.archived && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-500 rounded">Archived</span>
                                )}
                              </div>
                              {r.comment && (
                                <div className="text-xs text-gray-500 mt-1">{r.comment}</div>
                              )}
                              <div className="text-[10px] text-gray-400 mt-1">
                                by {r.ratedBy} • {new Date(r.date).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                            <div className="text-xl font-bold text-yellow-600 flex items-center gap-1">
                              {r.rating}<span className="text-sm">⭐</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}