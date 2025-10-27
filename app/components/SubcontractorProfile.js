'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SubcontractorProfile({ profile, onUpdate }) {
  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-xl text-gray-500">Loading profile...</div>
      </div>
    )
  }

  const [activeTab, setActiveTab] = useState('registration')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [documents, setDocuments] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  
  // Company Registration
  const [vatNumber, setVatNumber] = useState(profile.vat_number || '')
  const [companyRegNumber, setCompanyRegNumber] = useState(profile.company_registration_number || '')
  const [registeredAddress, setRegisteredAddress] = useState(profile.registered_address || '')
  const [tradingName, setTradingName] = useState(profile.trading_name || '')
  const [businessType, setBusinessType] = useState(profile.business_type || '')
  const [yearsInBusiness, setYearsInBusiness] = useState(profile.years_in_business || '')
  
  // Payment Details
  const [bankName, setBankName] = useState(profile.bank_name || '')
  const [accountHolderName, setAccountHolderName] = useState(profile.account_holder_name || '')
  const [accountNumber, setAccountNumber] = useState(profile.account_number || '')
  const [sortCode, setSortCode] = useState(profile.sort_code || '')
  
  // Insurance
  const [publicLiability, setPublicLiability] = useState(profile.public_liability_insurance || false)
  const [publicLiabilityAmount, setPublicLiabilityAmount] = useState(profile.public_liability_amount || '')
  const [publicLiabilityExpiry, setPublicLiabilityExpiry] = useState(profile.public_liability_expiry || '')
  const [employersLiability, setEmployersLiability] = useState(profile.employers_liability_insurance || false)
  const [employersLiabilityExpiry, setEmployersLiabilityExpiry] = useState(profile.employers_liability_expiry || '')
  const [professionalIndemnity, setProfessionalIndemnity] = useState(profile.professional_indemnity_insurance || false)
  const [professionalIndemnityExpiry, setProfessionalIndemnityExpiry] = useState(profile.professional_indemnity_expiry || '')
  
  // Qualifications
  const [healthSafetyCert, setHealthSafetyCert] = useState(profile.health_safety_cert || false)
  const [healthSafetyExpiry, setHealthSafetyExpiry] = useState(profile.health_safety_expiry || '')
  const [tradeQualifications, setTradeQualifications] = useState(profile.trade_qualifications?.join(', ') || '')
  const [industryAccreditations, setIndustryAccreditations] = useState(profile.industry_accreditations?.join(', ') || '')

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    const { data } = await supabase
      .from('subcontractor_documents')
      .select('*')
      .eq('subcontractor_id', profile.id)
      .order('uploaded_at', { ascending: false })
    
    if (data) setDocuments(data)
  }

  const calculateCompletionPercentage = () => {
    let total = 0
    let filled = 0
    
    total += 6
    if (vatNumber) filled++
    if (companyRegNumber) filled++
    if (registeredAddress) filled++
    if (tradingName) filled++
    if (businessType) filled++
    if (yearsInBusiness) filled++
    
    total += 4
    if (bankName) filled++
    if (accountHolderName) filled++
    if (accountNumber) filled++
    if (sortCode) filled++
    
    total += 3
    if (publicLiability && publicLiabilityExpiry) filled++
    if (employersLiability && employersLiabilityExpiry) filled++
    if (professionalIndemnity && professionalIndemnityExpiry) filled++
    
    total += 2
    if (healthSafetyCert && healthSafetyExpiry) filled++
    if (tradeQualifications || industryAccreditations) filled++
    
    return Math.round((filled / total) * 100)
  }

  const handleSave = async () => {
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

  const handleFileUpload = async (e, documentType) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum 10MB.')
      return
    }
    
    setUploadingDoc(true)
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `subcontractor-docs/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file)
    
    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setUploadingDoc(false)
      return
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath)
    
    const { error: dbError } = await supabase
      .from('subcontractor_documents')
      .insert([{
        subcontractor_id: profile.id,
        document_type: documentType,
        document_name: file.name,
        file_url: publicUrl,
        file_size: file.size
      }])
    
    if (dbError) {
      alert('Database error: ' + dbError.message)
    } else {
      loadDocuments()
    }
    
    setUploadingDoc(false)
  }

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Delete this document?')) return
    
    const { error } = await supabase
      .from('subcontractor_documents')
      .delete()
      .eq('id', docId)
    
    if (!error) {
      loadDocuments()
    }
  }

  const getDocumentsByType = (type) => {
    return documents.filter(doc => doc.document_type === type)
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
              To zwiększa Twoje szanse na otrzymanie projektów.
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
            {['registration', 'payment', 'insurance', 'qualifications', 'documents'].map((tab) => (
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
                {tab === 'payment' && 'Payment Details'}
                {tab === 'insurance' && 'Insurance'}
                {tab === 'qualifications' && 'Qualifications'}
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
                  <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Edit
                  </button>
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
                      <input
                        type="text"
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        placeholder="GB123456789"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration Number</label>
                      <input
                        type="text"
                        value={companyRegNumber}
                        onChange={(e) => setCompanyRegNumber(e.target.value)}
                        placeholder="12345678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registered Address</label>
                    <textarea
                      value={registeredAddress}
                      onChange={(e) => setRegisteredAddress(e.target.value)}
                      rows="3"
                      placeholder="Full registered business address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trading Name</label>
                      <input
                        type="text"
                        value={tradingName}
                        onChange={(e) => setTradingName(e.target.value)}
                        placeholder="Trading name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select type</option>
                        <option value="Sole Trader">Sole Trader</option>
                        <option value="Limited Company">Limited Company</option>
                        <option value="Partnership">Partnership</option>
                        <option value="LLP">LLP</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business</label>
                    <input
                      type="number"
                      value={yearsInBusiness}
                      onChange={(e) => setYearsInBusiness(e.target.value)}
                      placeholder="5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
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
                    <div className="col-span-2">
                      <span className="text-sm text-gray-500">Registered Address</span>
                      <p className="font-medium text-gray-900">{registeredAddress || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Trading Name</span>
                      <p className="font-medium text-gray-900">{tradingName || profile.company_name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Business Type</span>
                      <p className="font-medium text-gray-900">{businessType || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Years in Business</span>
                      <p className="font-medium text-gray-900">{yearsInBusiness || '—'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
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

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-6">
                <p className="text-sm text-yellow-800">
                  🔒 <strong>Private Information</strong> - Only you and project coordinators can see these details
                </p>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Barclays, HSBC, Lloyds"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Full name on account"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="12345678"
                        maxLength="8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort Code</label>
                      <input
                        type="text"
                        value={sortCode}
                        onChange={(e) => setSortCode(e.target.value)}
                        placeholder="12-34-56"
                        maxLength="8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500">Bank Name</span>
                    <p className="font-medium text-gray-900">{bankName || '—'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Account Holder</span>
                    <p className="font-medium text-gray-900">{accountHolderName || '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-sm text-gray-500">Account Number</span>
                      <p className="font-medium text-gray-900">{accountNumber ? '****' + accountNumber.slice(-4) : '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Sort Code</span>
                      <p className="font-medium text-gray-900">{sortCode || '—'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'insurance' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Insurance</h3>
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
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        checked={publicLiability}
                        onChange={(e) => setPublicLiability(e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label className="ml-2 font-medium text-gray-900">Public Liability Insurance</label>
                    </div>
                    {publicLiability && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Coverage Amount (£)</label>
                          <input
                            type="number"
                            value={publicLiabilityAmount}
                            onChange={(e) => setPublicLiabilityAmount(e.target.value)}
                            placeholder="5000000"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Expiry Date</label>
                          <input
                            type="date"
                            value={publicLiabilityExpiry}
                            onChange={(e) => setPublicLiabilityExpiry(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                    <div className="mt-3 ml-6">
                      <label className="block text-sm text-gray-700 mb-1">Upload Certificate (optional)</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'public_liability_insurance')}
                        disabled={uploadingDoc}
                        className="text-sm"
                      />
                      {getDocumentsByType('public_liability_insurance').map(doc => (
                        <div key={doc.id} className="mt-2 flex items-center justify-between text-sm">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600">{doc.document_name}</a>
                          <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-600">Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        checked={employersLiability}
                        onChange={(e) => setEmployersLiability(e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label className="ml-2 font-medium text-gray-900">Employers Liability Insurance</label>
                    </div>
                    {employersLiability && (
                      <div className="ml-6">
                        <label className="block text-sm text-gray-700 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={employersLiabilityExpiry}
                          onChange={(e) => setEmployersLiabilityExpiry(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    )}
                    <div className="mt-3 ml-6">
                      <label className="block text-sm text-gray-700 mb-1">Upload Certificate (optional)</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'employers_liability_insurance')}
                        disabled={uploadingDoc}
                        className="text-sm"
                      />
                      {getDocumentsByType('employers_liability_insurance').map(doc => (
                        <div key={doc.id} className="mt-2 flex items-center justify-between text-sm">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600">{doc.document_name}</a>
                          <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-600">Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        checked={professionalIndemnity}
                        onChange={(e) => setProfessionalIndemnity(e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label className="ml-2 font-medium text-gray-900">Professional Indemnity Insurance</label>
                    </div>
                    {professionalIndemnity && (
                      <div className="ml-6">
                        <label className="block text-sm text-gray-700 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={professionalIndemnityExpiry}
                          onChange={(e) => setProfessionalIndemnityExpiry(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    )}
                    <div className="mt-3 ml-6">
                      <label className="block text-sm text-gray-700 mb-1">Upload Certificate (optional)</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'professional_indemnity_insurance')}
                        disabled={uploadingDoc}
                        className="text-sm"
                      />
                      {getDocumentsByType('professional_indemnity_insurance').map(doc => (
                        <div key={doc.id} className="mt-2 flex items-center justify-between text-sm">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600">{doc.document_name}</a>
                          <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-600">Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="font-medium">Public Liability</span>
                    <span className={publicLiability ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                      {publicLiability ? `✓ £${publicLiabilityAmount?.toLocaleString()}` : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="font-medium">Employers Liability</span>
                    <span className={employersLiability ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                      {employersLiability ? '✓ Active' : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="font-medium">Professional Indemnity</span>
                    <span className={professionalIndemnity ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                      {professionalIndemnity ? '✓ Active' : 'Not provided'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'qualifications' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Qualifications & Certifications</h3>
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
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        checked={healthSafetyCert}
                        onChange={(e) => setHealthSafetyCert(e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label className="ml-2 font-medium text-gray-900">Health & Safety Certificate (CSCS, etc.)</label>
                    </div>
                    {healthSafetyCert && (
                      <div className="ml-6">
                        <label className="block text-sm text-gray-700 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={healthSafetyExpiry}
                          onChange={(e) => setHealthSafetyExpiry(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    )}
                    <div className="mt-3 ml-6">
                      <label className="block text-sm text-gray-700 mb-1">Upload Certificate (optional)</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'health_safety_certificate')}
                        disabled={uploadingDoc}
                        className="text-sm"
                      />
                      {getDocumentsByType('health_safety_certificate').map(doc => (
                        <div key={doc.id} className="mt-2 flex items-center justify-between text-sm">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600">{doc.document_name}</a>
                          <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-600">Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trade Qualifications (separate with commas)
                    </label>
                    <textarea
                      value={tradeQualifications}
                      onChange={(e) => setTradeQualifications(e.target.value)}
                      rows="3"
                      placeholder="e.g. NVQ Level 3 Electrical, City & Guilds 2365"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Example: NVQ Level 3, City & Guilds 2365, HNC Building Studies</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry Accreditations (separate with commas)
                    </label>
                    <textarea
                      value={industryAccreditations}
                      onChange={(e) => setIndustryAccreditations(e.target.value)}
                      rows="3"
                      placeholder="e.g. NICEIC, Gas Safe, CHAS"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Example: NICEIC Approved, Gas Safe Registered, CHAS Accredited</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500">Health & Safety</span>
                    <p className="font-medium text-gray-900">
                      {healthSafetyCert ? `✓ Certified (expires: ${healthSafetyExpiry})` : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Trade Qualifications</span>
                    <p className="font-medium text-gray-900">{tradeQualifications || '—'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Industry Accreditations</span>
                    <p className="font-medium text-gray-900">{industryAccreditations || '—'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">All Documents ({documents.length})</h3>
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No documents uploaded yet</p>
                  <p className="text-sm text-gray-400 mt-2">Upload documents in the relevant tabs above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{doc.document_name}</p>
                        <p className="text-sm text-gray-500 capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-400">Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-GB')}</p>
                      </div>
                      <div className="flex gap-3">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" 
                           className="text-blue-600 hover:text-blue-700 font-medium">
                          View
                        </a>
                        <button onClick={() => handleDeleteDocument(doc.id)}
                                className="text-red-600 hover:text-red-700 font-medium">
                          Delete
                        </button>
                      </div>
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