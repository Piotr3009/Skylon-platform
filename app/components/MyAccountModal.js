'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DeleteAccountModal from './DeleteAccountModal'

export default function MyAccountModal({ isOpen, onClose, user, profile, onUpdate }) {
  const [activeTab, setActiveTab] = useState('settings')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Account Settings
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Personal Info
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  
  // Consent Info
  const [consentData, setConsentData] = useState(null)

  useEffect(() => {
    if (isOpen && profile) {
      setFullName(profile.full_name || '')
      setCompanyName(profile.company_name || '')
      setPhone(profile.phone || '')
      loadConsentData()
    }
  }, [isOpen, profile])

  const loadConsentData = async () => {
    if (!user?.email) return
    
    try {
      const { data } = await supabase
        .from('gdpr_consent_logs')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      setConsentData(data)
    } catch (error) {
      console.error('Error loading consent data:', error)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      setLoading(false)
      return
    }

    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }

    setLoading(false)
  }

  const handlePersonalInfoUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          company_name: companyName,
          phone: phone || null,
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Personal information updated successfully!' })
      onUpdate && onUpdate()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }

    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">My Account</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex">
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 font-medium text-sm transition ${
                  activeTab === 'settings'
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Account Settings
              </button>
              <button
                onClick={() => setActiveTab('personal')}
                className={`px-6 py-3 font-medium text-sm transition ${
                  activeTab === 'personal'
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Personal Info
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-6 py-3 font-medium text-sm transition ${
                  activeTab === 'privacy'
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Privacy & Consent
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {message && (
              <div className={`mb-4 p-3 rounded ${
                message.type === 'success' 
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {message.text}
              </div>
            )}

            {/* Account Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      minLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Email Address</h3>
                  <p className="text-gray-600 mb-2">{user?.email}</p>
                  <p className="text-sm text-gray-500">
                    Contact support to change your email address
                  </p>
                </div>
              </div>
            )}

            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
                <form onSubmit={handlePersonalInfoUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7XXX XXXXXX"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                  >
                    {loading ? 'Updating...' : 'Update Information'}
                  </button>
                </form>
              </div>
            )}

            {/* Privacy & Consent Tab */}
            {activeTab === 'privacy' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Privacy & Consent</h3>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">Consent Accepted</h4>
                      {consentData ? (
                        <>
                          <p className="text-sm text-green-800">
                            You accepted our Privacy Policy and Terms & Conditions on{' '}
                            <strong>{new Date(consentData.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</strong>
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-green-800">
                          Your consent was recorded during registration
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Privacy Policy</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Learn how we collect, use, and protect your personal data
                    </p>
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
                    >
                      View Privacy Policy
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Terms & Conditions</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Review our terms of service and usage guidelines
                    </p>
                    <a
                      href="/terms-conditions"
                      target="_blank"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
                    >
                      View Terms & Conditions
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Your Rights</h4>
                    <p className="text-sm text-blue-800">
                      Under GDPR, you have the right to access, correct, or delete your personal data. 
                      Contact us if you wish to exercise these rights.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete My Account
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        user={user}
      />
    </>
  )
}