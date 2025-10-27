'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SubcontractorProfile({ profile, onUpdate }) {
  const [activeTab, setActiveTab] = useState('registration')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [documents, setDocuments] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  
  const [vatNumber, setVatNumber] = useState('')
  const [companyRegNumber, setCompanyRegNumber] = useState('')
  const [registeredAddress, setRegisteredAddress] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [yearsInBusiness, setYearsInBusiness] = useState('')
  
  const [bankName, setBankName] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [sortCode, setSortCode] = useState('')
  
  const [publicLiability, setPublicLiability] = useState(false)
  const [publicLiabilityAmount, setPublicLiabilityAmount] = useState('')
  const [publicLiabilityExpiry, setPublicLiabilityExpiry] = useState('')
  const [employersLiability, setEmployersLiability] = useState(false)
  const [employersLiabilityExpiry, setEmployersLiabilityExpiry] = useState('')
  const [professionalIndemnity, setProfessionalIndemnity] = useState(false)
  const [professionalIndemnityExpiry, setProfessionalIndemnityExpiry] = useState('')
  
  const [healthSafetyCert, setHealthSafetyCert] = useState(false)
  const [healthSafetyExpiry, setHealthSafetyExpiry] = useState('')
  const [tradeQualifications, setTradeQualifications] = useState('')
  const [industryAccreditations, setIndustryAccreditations] = useState('')

  useEffect(() => {
    if (profile) {
      setVatNumber(profile.vat_number || '')
      setCompanyRegNumber(profile.company_registration_number || '')
      setRegisteredAddress(profile.registered_address || '')
      setTradingName(profile.trading_name || '')
      setBusinessType(profile.business_type || '')
      setYearsInBusiness(profile.years_in_business || '')
      setBankName(profile.bank_name || '')
      setAccountHolderName(profile.account_holder_name || '')
      setAccountNumber(profile.account_number || '')
      setSortCode(profile.sort_code || '')
      setPublicLiability(profile.public_liability_insurance || false)
      setPublicLiabilityAmount(profile.public_liability_amount || '')
      setPublicLiabilityExpiry(profile.public_liability_expiry || '')
      setEmployersLiability(profile.employers_liability_insurance || false)
      setEmployersLiabilityExpiry(profile.employers_liability_expiry || '')
      setProfessionalIndemnity(profile.professional_indemnity_insurance || false)
      setProfessionalIndemnityExpiry(profile.professional_indemnity_expiry || '')
      setHealthSafetyCert(profile.health_safety_cert || false)
      setHealthSafetyExpiry(profile.health_safety_expiry || '')
      setTradeQualifications(profile.trade_qualifications?.join(', ') || '')
      setIndustryAccreditations(profile.industry_accreditations?.join(', ') || '')
      loadDocuments()
    }
  }, [profile])

  const loadDocuments = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('subcontractor_documents')
      .select('*')
      .eq('subcontractor_id', profile.id)
      .order('uploaded_at', { ascending: false })
    
    if (data) setDocuments(data)
  }

  const calculateCompletionPercentage = () => {
    let total = 15
    let filled = 0
    
    if (vatNumber) filled++
    if (companyRegNumber) filled++
    if (registeredAddress) filled++
    if (tradingName) filled++
    if (businessType) filled++
    if (yearsInBusiness) filled++
    if (bankName) filled++
    if (accountHolderName) filled++
    if (accountNumber) filled++
    if (sortCode) filled++
    if (publicLiability && publicLiabilityExpiry) filled++
    if (employersLiability && employersLiabilityExpiry) filled++
    if (professionalIndemnity && professionalIndemnityExpiry) filled++
    if (healthSafetyCert && healthSafetyExpiry) filled++
    if (tradeQualifications || industryAccreditations) filled++
    
    return Math.round((filled / total) * 100)
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    
    const { error } = await supabase
      .from('profiles')
      .update({
        vat_number: vatNumber || null,
        company_registration_number: companyRegNumber || null,
        registered_address: registeredAddress || null,
        trading_name: tradingName || null,
        business_type: businessType || null,
        years_in_business: yearsInBusiness ? parseInt(yearsInBusiness) : null,
        bank_name: bankName || null,
        account_holder_name: accountHolderName || null,
        account_number: accountNumber || null,
        sort_code: sortCode || null,
        public_liability_insurance: publicLiability,
        public_liability_amount: publicLiabilityAmount ? parseFloat(publicLiabilityAmount) : null,
        public_liability_expiry: publicLiabilityExpiry || null,
        employers_liability_insurance: employersLiability,
        employers_liability_expiry: employersLiabilityExpiry || null,
        professional_indemnity_insurance: professionalIndemnity,
        professional_indemnity_expiry: professionalIndemnityExpiry || null,
        health_safety_cert: healthSafetyCert,
        health_safety_expiry: healthSafetyExpiry || null,
        trade_qualifications: tradeQualifications ? tradeQualifications.split(',').map(q => q.trim()).filter(Boolean) : [],
        industry_accreditations: industryAccreditations ? industryAccreditations.split(',').map(a => a.trim()).filter(Boolean) : []
      })
      .eq('id', profile.id)
    
    setSaving(false)
    
    if (!error) {
      setEditing(false)
      if (onUpdate) onUpdate()
      alert('Profile updated successfully!')
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Delete this document?')) return
    
    await supabase
      .from('subcontractor_documents')
      .delete()
      .eq('id', docId)
    
    loadDocuments()
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-xl text-gray-500">Loading profile...</div>
      </div>
    )
  }

  const completionPercentage = calculateCompletionPercentage()

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Complete Your Profile</h3>
            <p className="text-sm text-blue-800">
              Wypełnienie dokumentów podnosi Twój rating oraz pokazuje profesjonalizm firmy.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Profile Completion</span>
          <span className="text-sm font-bold text-blue-600">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {['registration', 'documents'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'registration' && 'Registration'}
                {tab === 'documents' && `Documents (${documents.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'registration' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Registration Details</h3>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                      <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="GB123456789" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration</label>
                      <input type="text" value={companyRegNumber} onChange={(e) => setCompanyRegNumber(e.target.value)} placeholder="12345678" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trading Name</label>
                    <input type="text" value={tradingName} onChange={(e) => setTradingName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-sm text-gray-500">VAT Number</span>
                      <p className="font-medium text-gray-900">{vatNumber || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Company Registration</span>
                      <p className="font-medium text-gray-900">{companyRegNumber || '—'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Documents ({documents.length})</h3>
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No documents yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                      </div>
                      <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-600">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}