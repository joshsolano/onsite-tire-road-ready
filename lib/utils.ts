import type { Job, User } from './types'

export function formatDate(iso: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', opts ?? {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return phone
}

export function vehicleLabel(job: Job): string {
  const v = job.vehicle
  if (!v) return 'Vehicle'
  const parts = [v.year, v.make, v.model].filter(Boolean)
  return parts.length ? parts.join(' ') : 'Vehicle'
}

export function techName(user: User | null | undefined): string {
  if (!user) return 'Unassigned'
  return `${user.first_name} ${user.last_name}`
}

export function customerName(job: Job): string {
  const c = job.customer
  if (!c) return 'Customer'
  return `${c.first_name} ${c.last_name}`
}

export function reportCompletenessPercent(job: Job): number {
  const checks = [
    (job.photos?.filter(p => p.before_or_after === 'before').length ?? 0) >= 2,
    (job.photos?.filter(p => p.before_or_after === 'after').length ?? 0) >= 2,
    (job.tire_records?.length ?? 0) > 0,
    job.tire_records?.every(t => t.old_tread_depth != null) ?? false,
    job.tire_records?.every(t => t.new_brand != null) ?? false,
    (job.checklist_items?.filter(c => c.required && c.completed).length ?? 0) ===
    (job.checklist_items?.filter(c => c.required).length ?? 1),
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

export function missingItems(job: Job): string[] {
  const missing: string[] = []
  const beforePhotos = job.photos?.filter(p => p.before_or_after === 'before').length ?? 0
  const afterPhotos  = job.photos?.filter(p => p.before_or_after === 'after').length ?? 0

  if (beforePhotos < 2) missing.push('Before photos required (at least 2)')
  if (afterPhotos < 2)  missing.push('After photos required (at least 2)')
  if (!job.tire_records?.length) missing.push('Tire data not entered')
  if (job.tire_records?.some(t => t.old_tread_depth == null)) missing.push('Tread depth missing on one or more tires')
  if (job.tire_records?.some(t => !t.new_brand)) missing.push('New tire brand missing on one or more positions')

  const requiredChecklist = job.checklist_items?.filter(c => c.required) ?? []
  const incompleteChecklist = requiredChecklist.filter(c => !c.completed)
  if (incompleteChecklist.length > 0)
    missing.push(`${incompleteChecklist.length} required checklist item${incompleteChecklist.length > 1 ? 's' : ''} incomplete`)

  return missing
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
