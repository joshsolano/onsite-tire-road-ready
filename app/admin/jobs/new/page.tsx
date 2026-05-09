'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Customer, Vehicle, User } from '@/lib/types'
import Link from 'next/link'

export default function NewJobPage() {
  const router = useRouter()
  const supabase = createClient()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles,  setVehicles]  = useState<Vehicle[]>([])
  const [techs,     setTechs]     = useState<User[]>([])
  const [companyId, setCompanyId] = useState('')

  const [form, setForm] = useState({
    customer_id:      '',
    vehicle_id:       '',
    assigned_tech_id: '',
    service_type:     'tire_replacement',
    tire_count:       4,
    scheduled_start:  '',
    service_city:     '',
    service_state:    '',
    internal_notes:   '',
    report_tone:      'friendly',
  })

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // New customer/vehicle modals
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [showNewVehicle,  setShowNewVehicle]  = useState(false)
  const [newCustomer, setNewCustomer] = useState({ first_name:'', last_name:'', phone:'', email:'' })
  const [newVehicle,  setNewVehicle]  = useState({ year:'', make:'', model:'', color:'', license_plate:'', default_tire_size:'' })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!profile) return
      setCompanyId(profile.company_id)

      const [custRes, techRes] = await Promise.all([
        supabase.from('customers').select('*').eq('company_id', profile.company_id).order('last_name'),
        supabase.from('users').select('*').eq('company_id', profile.company_id).eq('role', 'technician').eq('is_active', true),
      ])
      setCustomers(custRes.data ?? [])
      setTechs(techRes.data ?? [])
    }
    load()
  }, [supabase])

  useEffect(() => {
    if (!form.customer_id) { setVehicles([]); return }
    supabase.from('vehicles').select('*').eq('customer_id', form.customer_id)
      .then(({ data }) => setVehicles(data ?? []))
  }, [form.customer_id, supabase])

  async function createCustomer() {
    const { data, error } = await supabase.from('customers')
      .insert({ ...newCustomer, company_id: companyId })
      .select().single()
    if (error) { alert(error.message); return }
    setCustomers(prev => [...prev, data])
    setForm(f => ({ ...f, customer_id: data.id }))
    setShowNewCustomer(false)
    setNewCustomer({ first_name:'', last_name:'', phone:'', email:'' })
  }

  async function createVehicle() {
    const { data, error } = await supabase.from('vehicles')
      .insert({ ...newVehicle, company_id: companyId, customer_id: form.customer_id })
      .select().single()
    if (error) { alert(error.message); return }
    setVehicles(prev => [...prev, data])
    setForm(f => ({ ...f, vehicle_id: data.id }))
    setShowNewVehicle(false)
    setNewVehicle({ year:'', make:'', model:'', color:'', license_plate:'', default_tire_size:'' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      ...form,
      company_id:       companyId,
      created_by:       user?.id,
      vehicle_id:       form.vehicle_id       || null,
      assigned_tech_id: form.assigned_tech_id || null,
      scheduled_start:  form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
      tire_count:       Number(form.tire_count),
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs').insert(payload).select().single()

    if (jobError) {
      setError(jobError.message)
      setLoading(false)
      return
    }

    // Create default checklist items
    const { DEFAULT_CHECKLIST_ITEMS } = await import('@/lib/types')
    await supabase.from('checklist_items').insert(
      DEFAULT_CHECKLIST_ITEMS.map(item => ({
        job_id: job.id,
        item_key: item.key,
        label: item.label,
        required: item.required,
      }))
    )

    // Log status history
    await supabase.from('job_status_history').insert({
      job_id: job.id,
      status: 'scheduled',
      changed_by: user?.id,
      note: 'Job created',
    })

    router.push(`/admin/jobs/${job.id}`)
  }

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/jobs" className="text-gray-400 hover:text-gray-700">← Jobs</Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Job</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Customer</h2>
          <div className="flex gap-2">
            <select value={form.customer_id} onChange={e => set('customer_id', e.target.value)}
              className="input-field flex-1">
              <option value="">Select customer…</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.last_name}, {c.first_name} {c.phone ? `· ${c.phone}` : ''}</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowNewCustomer(true)}
              className="btn-secondary px-3 text-sm whitespace-nowrap">+ New</button>
          </div>

          {showNewCustomer && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <h3 className="text-sm font-semibold">New Customer</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                <input placeholder="First name" value={newCustomer.first_name}
                  onChange={e => setNewCustomer(p => ({...p, first_name: e.target.value}))}
                  className="input-field" />
                <input placeholder="Last name" value={newCustomer.last_name}
                  onChange={e => setNewCustomer(p => ({...p, last_name: e.target.value}))}
                  className="input-field" />
              </div>
              <input placeholder="Phone" value={newCustomer.phone}
                onChange={e => setNewCustomer(p => ({...p, phone: e.target.value}))}
                className="input-field" />
              <input placeholder="Email" value={newCustomer.email}
                onChange={e => setNewCustomer(p => ({...p, email: e.target.value}))}
                className="input-field" />
              <div className="flex gap-2">
                <button type="button" onClick={createCustomer} className="btn-primary text-sm px-4 py-2">Save</button>
                <button type="button" onClick={() => setShowNewCustomer(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
              </div>
            </div>
          )}

          {/* Vehicle */}
          {form.customer_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
              <div className="flex gap-2">
                <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}
                  className="input-field flex-1">
                  <option value="">Select vehicle…</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} {v.license_plate ? `· ${v.license_plate}` : ''}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowNewVehicle(true)}
                  className="btn-secondary px-3 text-sm whitespace-nowrap">+ New</button>
              </div>
            </div>
          )}

          {showNewVehicle && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <h3 className="text-sm font-semibold">New Vehicle</h3>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                <input placeholder="Year" value={newVehicle.year}
                  onChange={e => setNewVehicle(p => ({...p, year: e.target.value}))}
                  className="input-field" />
                <input placeholder="Make" value={newVehicle.make}
                  onChange={e => setNewVehicle(p => ({...p, make: e.target.value}))}
                  className="input-field" />
                <input placeholder="Model" value={newVehicle.model}
                  onChange={e => setNewVehicle(p => ({...p, model: e.target.value}))}
                  className="input-field" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                <input placeholder="Color" value={newVehicle.color}
                  onChange={e => setNewVehicle(p => ({...p, color: e.target.value}))}
                  className="input-field" />
                <input placeholder="License plate" value={newVehicle.license_plate}
                  onChange={e => setNewVehicle(p => ({...p, license_plate: e.target.value}))}
                  className="input-field" />
              </div>
              <input placeholder="Tire size (e.g. 235/65R17)" value={newVehicle.default_tire_size}
                onChange={e => setNewVehicle(p => ({...p, default_tire_size: e.target.value}))}
                className="input-field" />
              <div className="flex gap-2">
                <button type="button" onClick={createVehicle} className="btn-primary text-sm px-4 py-2">Save</button>
                <button type="button" onClick={() => setShowNewVehicle(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Job Details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Job Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select value={form.service_type} onChange={e => set('service_type', e.target.value)} className="input-field">
                <option value="tire_replacement">Tire Replacement</option>
                <option value="tire_repair">Tire Repair</option>
                <option value="rotation">Tire Rotation</option>
                <option value="inspection">Inspection</option>
                <option value="emergency_roadside">Emergency Roadside</option>
                <option value="fleet_service">Fleet Service</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tire Count</label>
              <select value={form.tire_count} onChange={e => set('tire_count', Number(e.target.value))} className="input-field">
                {[1,2,3,4,5,6,8].map(n => <option key={n} value={n}>{n} tire{n>1?'s':''}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Technician</label>
              <select value={form.assigned_tech_id} onChange={e => set('assigned_tech_id', e.target.value)} className="input-field">
                <option value="">Unassigned</option>
                {techs.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Start</label>
              <input type="datetime-local" value={form.scheduled_start}
                onChange={e => set('scheduled_start', e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service City</label>
              <input value={form.service_city} onChange={e => set('service_city', e.target.value)}
                placeholder="San Antonio" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input value={form.service_state} onChange={e => set('service_state', e.target.value)}
                placeholder="TX" className="input-field" maxLength={2} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Tone</label>
            <select value={form.report_tone} onChange={e => set('report_tone', e.target.value)} className="input-field">
              <option value="friendly">Friendly (recommended)</option>
              <option value="professional">Professional</option>
              <option value="fun">Fun</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)}
              className="input-field min-h-[80px]" placeholder="Notes visible to admin and tech only…" />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading || !form.customer_id} className="btn-primary">
            {loading ? <span className="spinner" /> : 'Create Job'}
          </button>
          <Link href="/admin/jobs" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
