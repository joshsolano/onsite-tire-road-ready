export type UserRole = 'super_admin' | 'company_admin' | 'dispatcher' | 'technician' | 'fleet_manager'

export type JobStatus =
  | 'scheduled'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'waiting_on_customer'
  | 'waiting_on_parts'
  | 'completed'
  | 'report_generated'
  | 'report_sent'
  | 'follow_up_needed'
  | 'cancelled'

export type ServiceType =
  | 'tire_replacement'
  | 'tire_repair'
  | 'rotation'
  | 'inspection'
  | 'emergency_roadside'
  | 'fleet_service'
  | 'other'

export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe'

export type TireIssue =
  | 'low_tread'
  | 'uneven_wear'
  | 'sidewall_damage'
  | 'dry_rot'
  | 'bubble'
  | 'belt_separation'
  | 'nail_screw'
  | 'puncture_sidewall'
  | 'low_pressure_damage'
  | 'heat_damage'
  | 'wrong_size'
  | 'age_concern'
  | 'customer_request'

export type TirePosition =
  | 'front_driver'
  | 'front_passenger'
  | 'rear_driver'
  | 'rear_passenger'
  | 'rear_inner_driver'
  | 'rear_outer_driver'
  | 'rear_inner_passenger'
  | 'rear_outer_passenger'
  | 'spare'
  | 'trailer_axle1_driver'
  | 'trailer_axle1_passenger'
  | 'trailer_axle2_driver'
  | 'trailer_axle2_passenger'
  | 'steer_driver'
  | 'steer_passenger'
  | 'drive_axle1_inner'
  | 'drive_axle1_outer'

export type PhotoType =
  | 'vehicle_front'
  | 'vehicle_rear'
  | 'vehicle_driver_side'
  | 'vehicle_passenger_side'
  | 'tire_before'
  | 'tire_after'
  | 'tire_tread'
  | 'tire_dot'
  | 'damage'
  | 'new_tire_installed'
  | 'final_wheel'
  | 'final_vehicle'

export interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  google_review_url: string | null
  default_report_tone: 'professional' | 'friendly' | 'fun'
  report_approval_required: boolean
  created_at: string
}

export interface User {
  id: string
  company_id: string
  role: UserRole
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface Customer {
  id: string
  company_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  created_at: string
}

export interface Vehicle {
  id: string
  company_id: string
  customer_id: string | null
  fleet_company_id: string | null
  unit_number: string | null
  year: string | null
  make: string | null
  model: string | null
  trim: string | null
  color: string | null
  vin: string | null
  license_plate: string | null
  default_tire_size: string | null
  mileage: number | null
  notes: string | null
  created_at: string
}

export interface Job {
  id: string
  company_id: string
  customer_id: string | null
  vehicle_id: string | null
  assigned_tech_id: string | null
  service_type: ServiceType
  status: JobStatus
  tire_count: number
  scheduled_start: string | null
  arrival_window_start: string | null
  arrival_window_end: string | null
  started_at: string | null
  arrived_at: string | null
  completed_at: string | null
  report_generated_at: string | null
  report_sent_at: string | null
  payment_status: 'pending' | 'invoiced' | 'paid' | 'overdue' | 'waived'
  invoice_number: string | null
  service_city: string | null
  service_state: string | null
  internal_notes: string | null
  customer_notes: string | null
  report_tone: 'professional' | 'friendly' | 'fun'
  created_by: string | null
  created_at: string
  updated_at: string
  // joined fields
  customer?: Customer
  vehicle?: Vehicle
  assigned_tech?: User
  tire_records?: TireRecord[]
  photos?: Photo[]
  checklist_items?: ChecklistItem[]
  report?: Report
}

export interface TireRecord {
  id: string
  job_id: string
  vehicle_id: string | null
  position: TirePosition
  old_brand: string | null
  old_model: string | null
  old_size: string | null
  old_dot: string | null
  old_tread_depth: number | null
  old_issues: TireIssue[]
  risk_level: RiskLevel | null
  estimated_life_left_pct: number | null
  estimated_life_left_text: string | null
  estimated_miles_remaining: number | null
  new_brand: string | null
  new_model: string | null
  new_size: string | null
  new_dot: string | null
  new_tread_depth: number
  psi_after: number | null
  torque_checked: boolean
  tpms_checked: boolean
  valve_stem_replaced: boolean
  wheel_inspected: boolean
  tech_note: string | null
  internal_note: string | null
  created_at: string
  // joined
  photos?: Photo[]
}

export interface Photo {
  id: string
  job_id: string
  tire_record_id: string | null
  vehicle_id: string | null
  position: TirePosition | null
  photo_type: PhotoType
  before_or_after: 'before' | 'after' | 'n/a'
  storage_path: string
  thumbnail_path: string | null
  url: string | null
  thumbnail_url: string | null
  uploaded_by: string | null
  upload_state: 'pending' | 'complete' | 'failed'
  gps_lat: number | null
  gps_lng: number | null
  approved: boolean
  quality_warning: string | null
  show_in_report: boolean
  created_at: string
}

export interface ChecklistItem {
  id: string
  job_id: string
  item_key: string
  label: string
  required: boolean
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  notes: string | null
}

export interface Report {
  id: string
  job_id: string
  company_id: string
  customer_id: string | null
  vehicle_id: string | null
  public_slug: string
  status: 'draft' | 'generated' | 'approved' | 'sent' | 'viewed'
  tone: 'professional' | 'friendly' | 'fun'
  good_call_badges: string[]
  risk_summary: {
    level: RiskLevel
    reasons: string[]
    worst_position: string | null
  } | null
  time_saved_minutes: number | null
  time_saved_breakdown: Record<string, number> | null
  tire_facts: string[]
  warranty_summary: Record<string, unknown> | null
  next_service_date: string | null
  next_service_notes: string | null
  view_count: number
  first_viewed_at: string | null
  last_viewed_at: string | null
  sent_at: string | null
  sent_via: string | null
  sent_to_phone: string | null
  sent_to_email: string | null
  generated_by: string | null
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  company_id: string
  customer_id: string | null
  vehicle_id: string | null
  job_id: string | null
  type: string
  scheduled_for: string
  sent_at: string | null
  status: 'pending' | 'sent' | 'clicked' | 'cancelled' | 'failed'
  channel: 'sms' | 'email' | 'both'
  message: string | null
  booking_link: string | null
  target_phone: string | null
  target_email: string | null
  created_at: string
}

// Display helpers
export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  scheduled:           'Scheduled',
  en_route:            'En Route',
  arrived:             'Arrived',
  in_progress:         'In Progress',
  waiting_on_customer: 'Waiting on Customer',
  waiting_on_parts:    'Waiting on Parts',
  completed:           'Completed',
  report_generated:    'Report Ready',
  report_sent:         'Report Sent',
  follow_up_needed:    'Follow Up Needed',
  cancelled:           'Cancelled',
}

export const JOB_STATUS_COLOR: Record<JobStatus, string> = {
  scheduled:           'bg-gray-100 text-gray-700',
  en_route:            'bg-blue-100 text-blue-700',
  arrived:             'bg-cyan-100 text-cyan-700',
  in_progress:         'bg-orange-100 text-orange-700',
  waiting_on_customer: 'bg-yellow-100 text-yellow-700',
  waiting_on_parts:    'bg-yellow-100 text-yellow-700',
  completed:           'bg-green-100 text-green-700',
  report_generated:    'bg-purple-100 text-purple-700',
  report_sent:         'bg-indigo-100 text-indigo-700',
  follow_up_needed:    'bg-red-100 text-red-700',
  cancelled:           'bg-gray-100 text-gray-500',
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  low:      'Low',
  moderate: 'Moderate',
  high:     'High',
  severe:   'Severe',
}

export const RISK_COLOR: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low:      { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  moderate: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  high:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  severe:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
}

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  tire_replacement:  'Tire Replacement',
  tire_repair:       'Tire Repair',
  rotation:          'Tire Rotation',
  inspection:        'Tire Inspection',
  emergency_roadside:'Emergency Roadside',
  fleet_service:     'Fleet Service',
  other:             'Other',
}

export const TIRE_POSITION_LABEL: Record<TirePosition, string> = {
  front_driver:           'Front Driver',
  front_passenger:        'Front Passenger',
  rear_driver:            'Rear Driver',
  rear_passenger:         'Rear Passenger',
  rear_inner_driver:      'Rear Inner Driver',
  rear_outer_driver:      'Rear Outer Driver',
  rear_inner_passenger:   'Rear Inner Passenger',
  rear_outer_passenger:   'Rear Outer Passenger',
  spare:                  'Spare',
  trailer_axle1_driver:   'Trailer Axle 1 Driver',
  trailer_axle1_passenger:'Trailer Axle 1 Passenger',
  trailer_axle2_driver:   'Trailer Axle 2 Driver',
  trailer_axle2_passenger:'Trailer Axle 2 Passenger',
  steer_driver:           'Steer Driver',
  steer_passenger:        'Steer Passenger',
  drive_axle1_inner:      'Drive Axle Inner',
  drive_axle1_outer:      'Drive Axle Outer',
}

export const ISSUE_LABEL: Record<TireIssue, string> = {
  low_tread:           'Low Tread',
  uneven_wear:         'Uneven Wear',
  sidewall_damage:     'Sidewall Damage',
  dry_rot:             'Dry Rot',
  bubble:              'Bubble / Bulge',
  belt_separation:     'Belt Separation',
  nail_screw:          'Nail / Screw',
  puncture_sidewall:   'Puncture Near Sidewall',
  low_pressure_damage: 'Low Pressure Damage',
  heat_damage:         'Heat Damage',
  wrong_size:          'Wrong Size',
  age_concern:         'Age Concern',
  customer_request:    'Customer Requested',
}

export const DEFAULT_CHECKLIST_ITEMS: Array<{ key: string; label: string; required: boolean }> = [
  { key: 'old_tires_removed',    label: 'Old tires removed',           required: true },
  { key: 'new_tires_installed',  label: 'New tires installed',          required: true },
  { key: 'pressure_set',         label: 'Tire pressure set',            required: true },
  { key: 'torque_checked',       label: 'Lug nuts torqued',             required: true },
  { key: 'tpms_checked',         label: 'TPMS checked / reset',         required: true },
  { key: 'valve_stems',          label: 'Valve stems checked/replaced',  required: false },
  { key: 'wheels_inspected',     label: 'Wheels inspected',             required: true },
  { key: 'final_photos',         label: 'Final photos taken',           required: true },
  { key: 'area_cleaned',         label: 'Area cleaned up',              required: false },
  { key: 'vehicle_ready',        label: 'Vehicle returned to customer', required: true },
]
