'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SubcontractorProfile({ profile, onUpdate, readOnly = false }) {
  const [activeTab, setActiveTab] = useState('registration')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [documents, setDocuments] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  
  // Registration fields
  const [vatNumber, setVatNumber] = useState('')
  const [companyRegNumber, setCompanyRegNumber] = useState('')
  const [registeredAddress, setRegisteredAddress] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [yearsInBusiness, setYearsInBusiness] = useState('')
  const [nin, setNin] = useState('')
  const [utr, setUtr] = useState('')
  const [cisStatus, setCisStatus] = useState('')
  
  // Specialization
  const [specialization, setSpecialization] = useState([])
  const [editingSpec, setEditingSpec] = useState(false)
  
  // Bank fields
  const [bankName, setBankName] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [sortCode, setSortCode] = useState('')
  
  // Insurance list - array of insurance items
  const [insuranceList, setInsuranceList] = useState([])
  const [editingInsurance, setEditingInsurance] = useState(false)
  
  // H&S fields
  const [healthSafetyCert, setHealthSafetyCert] = useState(false)
  const [healthSafetyExpiry, setHealthSafetyExpiry] = useState('')
  const [healthSafetyProvider, setHealthSafetyProvider] = useState('')
  const [editingHS, setEditingHS] = useState(false)
  
  // Certificates fields
  const [tradeQualifications, setTradeQualifications] = useState('')
  const [industryAccreditations, setIndustryAccreditations] = useState('')
  const [editingCerts, setEditingCerts] = useState(false)

  // Available specializations
  const availableSpecializations = [
    'General Construction',
    'Steel Frame Specialist',
    'Plumber',
    'HVAC Installer',
    'Electrician',
    'Fire Protection Specialist',
    'Lift Engineer',
    'Scaffolder',
    'Decorator/Painter',
    'Bricklayer',
    'Joinery Installer',
    'Carpenter',
    'Dry Liner',
    'Plasterer',
    'Basement Specialist',
    'Loft Specialist',
    'Tiler',
    'Floor Specialist',
    'Staircase Specialist',
    'Roofer',
    'Glazier',
    'Groundworks',
    'Drainage Specialist',
    'Renderer'
  ]

  useEffect(() => {
    if (profile) {
      // Registration
      setVatNumber(profile.vat_number || '')
      setCompanyRegNumber(profile.company_registration_number || '')
      setRegisteredAddress(profile.registered_address || '')
      setTradingName(profile.trading_name || '')
      setBusinessType(profile.business_type || '')
      setYearsInBusiness(profile.years_in_business || '')
      setNin(profile.nin || '')
      setUtr(profile.utr || '')
      setCisStatus(profile.cis_status || '')
      
      // Specialization
      setSpecialization(profile.specialization || [])
      
      // Bank
      setBankName(profile.bank_name || '')
      setAccountHolderName(profile.account_holder_name || '')
      setAccountNumber(profile.account_number || '')
      setSortCode(profile.sort_code || '')
      
      // Insurance - load from profile fields
      const loadedInsurance = []
      if (profile.public_liability_insurance) {
        loadedInsurance.push({
          id: 'pl',
          type: 'Public Liability',
          provider: 'Public Liability Insurance',
          amount: profile.public_liability_amount || 0,
          expiry: profile.public_liability_expiry || ''
        })
      }
      if (profile.employers_liability_insurance) {
        loadedInsurance.push({
          id: 'el',
          type: 'Employers Liability',
          provider: 'Employers Liability Insurance',
          amount: 0,
          expiry: profile.employers_liability_expiry || ''
        })
      }
      if (profile.professional_indemnity_insurance) {
        loadedInsurance.push({
          id: 'pi',
          type: 'Professional Indemnity',
          provider: 'Professional Indemnity Insurance',
          amount: 0,
          expiry: profile.professional_indemnity_expiry || ''
        })
      }
      setInsuranceList(loadedInsurance)
      
      // H&S
      setHealthSafetyCert(profile.health_safety_cert || false)
      setHealthSafetyExpiry(profile.health_safety_expiry || '')
      setHealthSafetyProvider(profile.health_safety_provider || '')
      
      // Certificates
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
    let total = 20
    let filled = 0
    
    if (vatNumber) filled++
    if (companyRegNumber) filled++
    if (registeredAddress) filled++
    if (tradingName) filled++
    if (businessType) filled++
    if (yearsInBusiness) filled++
    if (specialization.length > 0) filled++
    if (bankName) filled++
    if (accountHolderName) filled++
    if (accountNumber) filled++
    if (sortCode) filled++
    if (insuranceList.length > 0) filled++
    if (healthSafetyCert && healthSafetyExpiry) filled++
    if (tradeQualifications) filled++
    if (industryAccreditations) filled++
    if (documents.length > 0) filled++
    
    return Math.round((filled / total) * 100)
  }

  const handleSaveRegistration = async () => {
    if (!profile) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        vat_number: vatNumber,
        company_registration_number: companyRegNumber,
        registered_address: registeredAddress,
        trading_name: tradingName,
        business_type: businessType,
        years_in_business: yearsInBusiness ? parseInt(yearsInBusiness) : null,
        nin: nin || null,
        utr: utr || null,
        cis_status: cisStatus || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    setSaving(false)
    if (!error) {
      setEditing(false)
      if (onUpdate) onUpdate()
      alert('Registration details saved!')
    } else {
      alert('Error saving: ' + error.message)
    }
  }

  const handleSaveSpecialization = async () => {
    if (!profile) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        specialization: specialization,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    setSaving(false)
    if (!error) {
      setEditingSpec(false)
      if (onUpdate) onUpdate()
      alert('Specialization saved!')
    } else {
      alert('Error saving: ' + error.message)
    }
  }

  const handleToggleSpecialization = (spec) => {
    if (specialization.includes(spec)) {
      setSpecialization(specialization.filter(s => s !== spec))
    } else {
      setSpecialization([...specialization, spec])
    }
  }

  const handleSaveBank = async () => {
    if (!profile) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        bank_name: bankName,
        account_holder_name: accountHolderName,
        account_number: accountNumber,
        sort_code: sortCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    setSaving(false)
    if (!error) {
      setEditing(false)
      if (onUpdate) onUpdate()
      alert('Bank details saved!')
    } else {
      alert('Error saving: ' + error.message)
    }
  }

  const handleSaveInsurance = async () => {
    if (!profile) return
    setSaving(true)

    // Convert insurance list to profile fields
    const updateData = {
      public_liability_insurance: false,
      public_liability_amount: null,
      public_liability_expiry: null,
      employers_liability_insurance: false,
      employers_liability_expiry: null,
      professional_indemnity_insurance: false,
      professional_indemnity_expiry: null,
      updated_at: new Date().toISOString()
    }

    insuranceList.forEach(ins => {
      if (ins.type === 'Public Liability') {
        updateData.public_liability_insurance = true
        updateData.public_liability_amount = ins.amount
        updateData.public_liability_expiry = ins.expiry
      } else if (ins.type === 'Employers Liability') {
        updateData.employers_liability_insurance = true
        updateData.employers_liability_expiry = ins.expiry
      } else if (ins.type === 'Professional Indemnity') {
        updateData.professional_indemnity_insurance = true
        updateData.professional_indemnity_expiry = ins.expiry
      }
    })

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id)

    setSaving(false)
    if (!error) {
      setEditingInsurance(false)
      if (onUpdate) onUpdate()
      alert('Insurance saved!')
    } else {
      alert('Error saving: ' + error.message)
    }
  }

  const handleSaveHS = async () => {
    if (!profile) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        health_safety_cert: healthSafetyCert,
        health_safety_expiry: healthSafetyExpiry,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    setSaving(false)
    if (!error) {
      setEditingHS(false)
      if (onUpdate) onUpdate()
      alert('H&S details saved!')
    } else {
      alert('Error saving: ' + error.message)
    }
  }

  const handleSaveCerts = async () => {
    if (!profile) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        trade_qualifications: tradeQualifications ? tradeQualifications.split(',').map(q => q.trim()) : [],
        industry_accreditations: industryAccreditations ? industryAccreditations.split(',').map(a => a.trim()) : [],
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    setSaving(false)
    if (!error) {
      setEditingCerts(false)
      if (onUpdate) onUpdate()
      alert('Certificates saved!')
    } else {
      alert('Error saving: ' + error.message)
    }
  }

  const handleAddInsurance = () => {
    setInsuranceList([...insuranceList, {
      id: Date.now().toString(),
      type: 'Public Liability',
      provider: '',
      amount: 0,
      expiry: ''
    }])
  }

  const handleRemoveInsurance = (id) => {
    setInsuranceList(insuranceList.filter(ins => ins.id !== id))
  }

  const handleUpdateInsurance = (id, field, value) => {
    setInsuranceList(insuranceList.map(ins => 
      ins.id === id ? { ...ins, [field]: value } : ins
    ))
  }

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingDoc(true)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('subcontractor-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('subcontractor-documents')
        .getPublicUrl(filePath)

      // Save to database
      const { error: dbError } = await supabase
        .from('subcontractor_documents')
        .insert({
          subcontractor_id: profile.id,
          document_type: 'other',
          document_name: file.name,
          file_url: publicUrl,
          file_size: file.size
        })

      if (dbError) throw dbError

      await loadDocuments()
      alert('Document uploaded successfully!')
    } catch (error) {
      alert('Error uploading document: ' + error.message)
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    const { error } = await supabase
      .from('subcontractor_documents')
      .delete()
      .eq('id', docId)

    if (!error) {
      await loadDocuments()
      alert('Document deleted!')
    } else {
      alert('Error deleting document: ' + error.message)
    }
  }

  const completionPercentage = calculateCompletionPercentage()

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900">Complete Your Profile</h4>
            <p className="text-sm text-blue-700 mt-1">
              Filling out all information increases your rating and shows professionalism to clients.
            </p>
          </div>
        </div>
      </div>

      {/* Completion Bar */}
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

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {['registration', 'specialization', 'bank', 'insurance', 'health_safety', 'certificates', 'documents'].map((tab) => (
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
                {tab === 'specialization' && `Specialization (${specialization.length})`}
                {tab === 'bank' && 'Bank Details'}
                {tab === 'insurance' && `Insurance (${insuranceList.length})`}
                {tab === 'health_safety' && 'Health & Safety'}
                {tab === 'certificates' && 'Certificates'}
                {tab === 'documents' && `Documents (${documents.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* REGISTRATION TAB */}
          {activeTab === 'registration' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Registration Details</h3>
                {!readOnly && !editing ? (
                  <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
                ) : !readOnly && editing ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                    <button onClick={handleSaveRegistration} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : null}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                      <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="GB123456789" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration Number</label>
                      <input type="text" value={companyRegNumber} onChange={(e) => setCompanyRegNumber(e.target.value)} placeholder="12345678" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registered Address</label>
                    <textarea value={registeredAddress} onChange={(e) => setRegisteredAddress(e.target.value)} rows={3} placeholder="Full registered company address" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trading Name</label>
                      <input type="text" value={tradingName} onChange={(e) => setTradingName(e.target.value)} placeholder="Business trading name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                      <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select type</option>
                        <option value="Sole Trader">Sole Trader</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Limited Company">Limited Company</option>
                        <option value="LLP">LLP</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business</label>
                    <input type="number" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} placeholder="5" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  
                  {/* Tax / CIS Section */}
                  <div className="col-span-2 pt-4 border-t mt-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Tax & CIS Details</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">National Insurance Number (NIN)</label>
                    <input type="text" value={nin} onChange={(e) => setNin(e.target.value.toUpperCase())} placeholder="QQ 12 34 56 C" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unique Taxpayer Reference (UTR)</label>
                    <input type="text" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="1234567890" maxLength="10" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CIS Status</label>
                    <select value={cisStatus} onChange={(e) => setCisStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select status...</option>
                      <option value="not_registered">Not Registered</option>
                      <option value="gross">Gross Payment (0%)</option>
                      <option value="net">Standard Deduction (20%)</option>
                      <option value="registered">Registered (30%)</option>
                    </select>
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
                      <p className="font-medium text-gray-900">{tradingName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Business Type</span>
                      <p className="font-medium text-gray-900">{businessType || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Years in Business</span>
                      <p className="font-medium text-gray-900">{yearsInBusiness || '—'}</p>
                    </div>
                    
                    {/* Tax / CIS Section */}
                    <div className="col-span-2 pt-4 border-t mt-2">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">Tax & CIS Details</h4>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">National Insurance Number (NIN)</span>
                      <p className="font-medium text-gray-900">{nin || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Unique Taxpayer Reference (UTR)</span>
                      <p className="font-medium text-gray-900">{utr || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">CIS Status</span>
                      <p className="font-medium text-gray-900">
                        {cisStatus === 'not_registered' ? 'Not Registered' :
                         cisStatus === 'gross' ? 'Gross Payment (0%)' :
                         cisStatus === 'net' ? 'Standard Deduction (20%)' :
                         cisStatus === 'registered' ? 'Registered (30%)' :
                         '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SPECIALIZATION TAB */}
          {activeTab === 'specialization' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Your Specializations</h3>
                {!readOnly && !editingSpec ? (
                  <button onClick={() => setEditingSpec(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
                ) : !readOnly && editingSpec ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingSpec(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                    <button onClick={handleSaveSpecialization} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : null}
              </div>

              {editingSpec ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">Select all specializations that apply to your company:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {availableSpecializations.map((spec) => (
                      <label 
                        key={spec}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                          specialization.includes(spec)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={specialization.includes(spec)}
                          onChange={() => handleToggleSpecialization(spec)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-900">{spec}</span>
                      </label>
                    ))}
                  </div>
                  {specialization.length === 0 && (
                    <p className="text-sm text-red-600 mt-2">⚠️ Please select at least one specialization</p>
                  )}
                </div>
              ) : (
                <div>
                  {specialization.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500">No specializations selected yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {specialization.map((spec) => (
                        <span key={spec} className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BANK DETAILS TAB */}
          {activeTab === 'bank' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Bank Details</h3>
                {!readOnly && !editing ? (
                  <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
                ) : !readOnly && editing ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                    <button onClick={handleSaveBank} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : null}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Barclays" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                    <input type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} placeholder="Company Name or Your Name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="12345678" maxLength={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort Code</label>
                      <input type="text" value={sortCode} onChange={(e) => setSortCode(e.target.value)} placeholder="12-34-56" maxLength={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-sm text-gray-500">Bank Name</span>
                      <p className="font-medium text-gray-900">{bankName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Account Holder</span>
                      <p className="font-medium text-gray-900">{accountHolderName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Account Number</span>
                      <p className="font-medium text-gray-900">{accountNumber ? `****${accountNumber.slice(-4)}` : '—'}</p>
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

          {/* INSURANCE TAB */}
          {activeTab === 'insurance' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Insurance Policies ({insuranceList.length})</h3>
                {!readOnly && !editingInsurance ? (
                  <button onClick={() => setEditingInsurance(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
                ) : !readOnly && editingInsurance ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingInsurance(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                    <button onClick={handleSaveInsurance} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : null}
              </div>

              {editingInsurance ? (
                <div className="space-y-4">
                  {insuranceList.map((ins, index) => (
                    <div key={ins.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-gray-900">Policy #{index + 1}</h4>
                        <button onClick={() => handleRemoveInsurance(ins.id)} className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select 
                            value={ins.type} 
                            onChange={(e) => handleUpdateInsurance(ins.id, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Public Liability">Public Liability</option>
                            <option value="Employers Liability">Employers Liability</option>
                            <option value="Professional Indemnity">Professional Indemnity</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Provider/Name</label>
                          <input 
                            type="text" 
                            value={ins.provider} 
                            onChange={(e) => handleUpdateInsurance(ins.id, 'provider', e.target.value)}
                            placeholder="Insurance provider name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Amount (£)</label>
                          <input 
                            type="number" 
                            value={ins.amount} 
                            onChange={(e) => handleUpdateInsurance(ins.id, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="5000000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                          <input 
                            type="date" 
                            value={ins.expiry} 
                            onChange={(e) => handleUpdateInsurance(ins.id, 'expiry', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={handleAddInsurance}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
                  >
                    + Add Insurance Policy
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {insuranceList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No insurance policies added yet
                    </div>
                  ) : (
                    insuranceList.map((ins, index) => (
                      <div key={ins.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <span className="text-sm text-gray-500">Type</span>
                            <p className="font-medium text-gray-900">{ins.type}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Provider</span>
                            <p className="font-medium text-gray-900">{ins.provider || '—'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Coverage</span>
                            <p className="font-medium text-gray-900">£{ins.amount?.toLocaleString() || '0'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Expires</span>
                            <p className={`font-medium ${new Date(ins.expiry) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                              {ins.expiry ? new Date(ins.expiry).toLocaleDateString('en-GB') : '—'}
                              {ins.expiry && new Date(ins.expiry) < new Date() && ' (EXPIRED)'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* HEALTH & SAFETY TAB */}
          {activeTab === 'health_safety' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Health & Safety</h3>
                {!readOnly && !editingHS ? (
                  <button onClick={() => setEditingHS(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
                ) : !readOnly && editingHS ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingHS(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                    <button onClick={handleSaveHS} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : null}
              </div>

              {editingHS ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <input 
                      type="checkbox" 
                      id="hs-cert"
                      checked={healthSafetyCert} 
                      onChange={(e) => setHealthSafetyCert(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="hs-cert" className="font-medium text-gray-900 cursor-pointer">
                      I have a valid Health & Safety Certificate
                    </label>
                  </div>
                  
                  {healthSafetyCert && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Provider</label>
                        <input 
                          type="text" 
                          value={healthSafetyProvider} 
                          onChange={(e) => setHealthSafetyProvider(e.target.value)}
                          placeholder="e.g. CITB, IOSH"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <input 
                          type="date" 
                          value={healthSafetyExpiry} 
                          onChange={(e) => setHealthSafetyExpiry(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <span className="text-sm text-gray-500">Certificate Status</span>
                        <p className="font-medium text-gray-900">
                          {healthSafetyCert ? (
                            <span className="text-green-600">✓ Valid Certificate</span>
                          ) : (
                            <span className="text-gray-400">No certificate</span>
                          )}
                        </p>
                      </div>
                      {healthSafetyCert && (
                        <>
                          <div>
                            <span className="text-sm text-gray-500">Provider</span>
                            <p className="font-medium text-gray-900">{healthSafetyProvider || '—'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Expires</span>
                            <p className={`font-medium ${healthSafetyExpiry && new Date(healthSafetyExpiry) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                              {healthSafetyExpiry ? new Date(healthSafetyExpiry).toLocaleDateString('en-GB') : '—'}
                              {healthSafetyExpiry && new Date(healthSafetyExpiry) < new Date() && ' (EXPIRED)'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CERTIFICATES TAB */}
          {activeTab === 'certificates' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Trade Qualifications & Accreditations</h3>
                {!readOnly && !editingCerts ? (
                  <button onClick={() => setEditingCerts(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
                ) : !readOnly && editingCerts ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCerts(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                    <button onClick={handleSaveCerts} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : null}
              </div>

              {editingCerts ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trade Qualifications</label>
                    <textarea 
                      value={tradeQualifications} 
                      onChange={(e) => setTradeQualifications(e.target.value)}
                      rows={4}
                      placeholder="Enter qualifications separated by commas (e.g., NVQ Level 3 Carpentry, City & Guilds Plumbing)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple qualifications with commas</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry Accreditations</label>
                    <textarea 
                      value={industryAccreditations} 
                      onChange={(e) => setIndustryAccreditations(e.target.value)}
                      rows={4}
                      placeholder="Enter accreditations separated by commas (e.g., Gas Safe Registered, NICEIC Approved Contractor)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple accreditations with commas</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Trade Qualifications</h4>
                    {tradeQualifications ? (
                      <ul className="list-disc list-inside space-y-1">
                        {tradeQualifications.split(',').map((qual, idx) => (
                          <li key={idx} className="text-gray-700">{qual.trim()}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No qualifications added</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Industry Accreditations</h4>
                    {industryAccreditations ? (
                      <ul className="list-disc list-inside space-y-1">
                        {industryAccreditations.split(',').map((acc, idx) => (
                          <li key={idx} className="text-gray-700">{acc.trim()}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No accreditations added</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Documents ({documents.length})</h3>
                {!readOnly && (
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                    {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                    <input 
                      type="file" 
                      onChange={handleUploadDocument}
                      className="hidden"
                      disabled={uploadingDoc}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                )}
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">{doc.document_name}</p>
                          <p className="text-sm text-gray-500">
                            {doc.document_type?.replace('_', ' ')} • 
                            Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition text-sm"
                        >
                          Download
                        </a>
                        {!readOnly && (
                          <button 
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                          >
                            Delete
                          </button>
                        )}
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