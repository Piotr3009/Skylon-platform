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
      const avgRating = enrichedData.length > 0
        ? enrichedData.reduce((sum, s) => sum + (Number(s.average_rating) || 0), 0) / enrichedData.length
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
                {subcontractors.map((sub) => (
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
                      <button
                        onClick={() => handleDeleteSubcontractor(sub.id, sub.company_name || sub.full_name)}
                        disabled={deleting === sub.id}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400 transition"
                      >
                        {deleting === sub.id ? 'Deleting...' : 'Delete'}
                      </button>
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
    </div>
  )
}