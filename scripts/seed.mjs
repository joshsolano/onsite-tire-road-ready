import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qknapxdojrcisnwntlyh.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrbmFweGRvanJjaXNud250bHloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI4NjQ2OCwiZXhwIjoyMDkzODYyNDY4fQ.98MfA7qsYcx6PG4Hrv3oXgTqkNXK8mnLKDoZ0QH-aEA'
const COMPANY_ID   = '00000000-0000-0000-0000-000000000001'

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── Seed data ─────────────────────────────────────────────────────────────────

const CUSTOMERS = [
  { first_name: 'Ella',    last_name: 'Vator',      phone: '(210) 555-0101', email: 'ella.vator@email.com' },
  { first_name: 'Mona',    last_name: 'Lott',       phone: '(210) 555-0102', email: 'mona.lott@email.com' },
  { first_name: 'Anita',   last_name: 'Bath',       phone: '(210) 555-0103', email: 'anita.bath@email.com' },
  { first_name: 'Crystal', last_name: 'Clear',      phone: '(210) 555-0104', email: 'crystal.clear@email.com' },
  { first_name: 'Fanny',   last_name: 'Pack',       phone: '(210) 555-0105', email: 'fanny.pack@email.com' },
  { first_name: 'Rhoda',   last_name: 'Camel',      phone: '(210) 555-0106', email: 'rhoda.camel@email.com' },
  { first_name: 'Sue',     last_name: 'Flay',       phone: '(210) 555-0107', email: 'sue.flay@email.com' },
  { first_name: 'Tera',    last_name: 'Byte',       phone: '(210) 555-0108', email: 'tera.byte@email.com' },
  { first_name: 'Barb',    last_name: 'Dwyer',      phone: '(210) 555-0109', email: 'barb.dwyer@email.com' },
  { first_name: 'Gail',    last_name: 'Forcewind',  phone: '(210) 555-0110', email: 'gail.forcewind@email.com' },
  { first_name: 'Carrie',  last_name: 'Oke',        phone: '(210) 555-0111', email: 'carrie.oke@email.com' },
  { first_name: 'Dee',     last_name: 'Zaster',     phone: '(210) 555-0112', email: 'dee.zaster@email.com' },
  { first_name: 'Polly',   last_name: 'Esther',     phone: '(210) 555-0113', email: 'polly.esther@email.com' },
  { first_name: 'Tess',    last_name: 'Tickle',     phone: '(210) 555-0114', email: 'tess.tickle@email.com' },
  { first_name: 'Bea',     last_name: "O'Problem",  phone: '(210) 555-0115', email: 'bea.oproblem@email.com' },
  { first_name: 'Paige',   last_name: 'Turner',     phone: '(210) 555-0116', email: 'paige.turner@email.com' },
  { first_name: 'Emma',    last_name: 'Nator',      phone: '(210) 555-0117', email: 'emma.nator@email.com' },
]

const VEHICLES = [
  { year: '2019', make: 'Toyota',     model: 'Camry',       color: 'Silver',  license_plate: 'TX-ABC123', default_tire_size: '215/55R17' },
  { year: '2021', make: 'Honda',      model: 'CR-V',        color: 'White',   license_plate: 'TX-DEF456', default_tire_size: '235/60R18' },
  { year: '2018', make: 'Ford',       model: 'F-150',       color: 'Black',   license_plate: 'TX-GHI789', default_tire_size: '275/65R18' },
  { year: '2022', make: 'Chevrolet',  model: 'Equinox',     color: 'Blue',    license_plate: 'TX-JKL012', default_tire_size: '225/65R17' },
  { year: '2020', make: 'Jeep',       model: 'Grand Cherokee', color: 'Red',  license_plate: 'TX-MNO345', default_tire_size: '265/60R18' },
  { year: '2017', make: 'Nissan',     model: 'Altima',      color: 'Gray',    license_plate: 'TX-PQR678', default_tire_size: '215/60R16' },
  { year: '2023', make: 'Hyundai',    model: 'Tucson',      color: 'Green',   license_plate: 'TX-STU901', default_tire_size: '235/55R19' },
  { year: '2016', make: 'Kia',        model: 'Sorento',     color: 'White',   license_plate: 'TX-VWX234', default_tire_size: '235/65R17' },
  { year: '2021', make: 'RAM',        model: '1500',        color: 'Black',   license_plate: 'TX-YZA567', default_tire_size: '275/60R20' },
  { year: '2019', make: 'Subaru',     model: 'Outback',     color: 'Brown',   license_plate: 'TX-BCD890', default_tire_size: '225/60R18' },
  { year: '2020', make: 'Tesla',      model: 'Model Y',     color: 'White',   license_plate: 'TX-EFG123', default_tire_size: '255/45R20' },
  { year: '2018', make: 'GMC',        model: 'Sierra',      color: 'Silver',  license_plate: 'TX-HIJ456', default_tire_size: '265/65R18' },
  { year: '2022', make: 'Volkswagen', model: 'Tiguan',      color: 'Blue',    license_plate: 'TX-KLM789', default_tire_size: '235/50R19' },
  { year: '2015', make: 'Toyota',     model: 'Tacoma',      color: 'Gray',    license_plate: 'TX-NOP012', default_tire_size: '265/70R16' },
  { year: '2021', make: 'Ford',       model: 'Explorer',    color: 'Red',     license_plate: 'TX-QRS345', default_tire_size: '255/50R20' },
  { year: '2019', make: 'Honda',      model: 'Pilot',       color: 'White',   license_plate: 'TX-TUV678', default_tire_size: '245/60R18' },
  { year: '2023', make: 'Chevrolet',  model: 'Silverado',   color: 'Black',   license_plate: 'TX-WXY901', default_tire_size: '275/65R20' },
]

const SERVICE_TYPES = [
  'tire_replacement','tire_replacement','tire_replacement','tire_replacement',
  'tire_replacement','rotation','tire_repair','inspection',
  'tire_replacement','emergency_roadside','tire_replacement','tire_replacement',
  'rotation','tire_replacement','tire_replacement','tire_replacement','tire_replacement',
]

const TIRE_BRANDS_OLD  = ['Goodyear','Michelin','Bridgestone','Cooper','Firestone','Pirelli','Continental','Hankook']
const TIRE_BRANDS_NEW  = ['Michelin','Goodyear','Continental','BF Goodrich','Yokohama','Toyo','Falken','Cooper']
const TIRE_MODELS_OLD  = ['Assurance','Defender','Turanza','CS5','Destination','Cinturato','CrossContact','Kinergy']
const TIRE_MODELS_NEW  = ['Defender2','AssuranceCS','ExtremeContact','Trail-Terrain','BluEarth','Open Country','Wildpeak','Kinergy GT']

const ISSUES_POOL = ['low_tread','sidewall_cracking','uneven_wear','weather_cracking','low_tread']

const DEFAULT_CHECKLIST = [
  { item_key: 'vehicle_inspection',      label: 'Vehicle inspection complete',          required: true },
  { item_key: 'old_tires_documented',    label: 'Old tires documented and photographed', required: true },
  { item_key: 'new_tires_installed',     label: 'New tires installed correctly',         required: true },
  { item_key: 'torque_verified',         label: 'Lug nuts torqued to spec',              required: true },
  { item_key: 'psi_checked',            label: 'Tire pressure set and verified',         required: true },
  { item_key: 'tpms_reset',             label: 'TPMS reset and verified',                required: false },
  { item_key: 'valve_stems_checked',    label: 'Valve stems inspected/replaced',         required: false },
  { item_key: 'wheels_inspected',       label: 'Wheels and rims inspected',              required: false },
  { item_key: 'customer_walkthrough',   label: 'Customer walkthrough complete',           required: true },
  { item_key: 'area_cleaned',          label: 'Work area cleaned up',                    required: false },
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function makeTireRecords(jobId, tireCount, serviceType) {
  const positions = ['front_driver','front_passenger','rear_driver','rear_passenger',
                     'rear_inner_driver','rear_outer_driver','rear_inner_passenger','rear_outer_passenger']
  const records = []

  for (let i = 0; i < tireCount; i++) {
    const oldDepth   = rand(2, 6)
    const issues     = oldDepth <= 3 ? [pick(ISSUES_POOL)] : (Math.random() > 0.6 ? [pick(ISSUES_POOL)] : [])
    const psi        = rand(32, 38)
    const oldBrand   = pick(TIRE_BRANDS_OLD)
    const oldModel   = pick(TIRE_MODELS_OLD)
    const newBrand   = pick(TIRE_BRANDS_NEW)
    const newModel   = pick(TIRE_MODELS_NEW)

    // risk calculation (simplified)
    const structural = ['sidewall_damage','bubble','belt_separation']
    const hasStructural = issues.some(i => structural.includes(i))
    const score = (oldDepth <= 2 ? 40 : oldDepth <= 4 ? 25 : 10)
               + (issues.length * 15)
    const riskLevel = hasStructural ? 'severe'
                    : score >= 40 ? 'high'
                    : score >= 25 ? 'moderate' : 'low'

    // life left
    const usable = Math.max(0, oldDepth - 2)
    const pct    = Math.round((usable / 8) * 100)
    const milesHigh = Math.round(pct * 100)
    const lifeText  = pct <= 10 ? 'Critical — replace immediately'
                    : pct <= 25 ? 'Low — replace soon'
                    : pct <= 50 ? 'Moderate — monitor closely'
                    : 'Good — within acceptable range'

    records.push({
      job_id:                    jobId,
      position:                  positions[i],
      old_brand:                 serviceType === 'rotation' ? newBrand : oldBrand,
      old_model:                 serviceType === 'rotation' ? newModel : oldModel,
      old_size:                  VEHICLES[i % VEHICLES.length].default_tire_size,
      old_dot:                   `${rand(10,52).toString().padStart(2,'0')}${rand(15,24)}`,
      old_tread_depth:           oldDepth,
      old_issues:                issues,
      new_brand:                 serviceType === 'rotation' ? oldBrand : newBrand,
      new_model:                 serviceType === 'rotation' ? oldModel : newModel,
      new_size:                  VEHICLES[i % VEHICLES.length].default_tire_size,
      new_tread_depth:           10,
      psi_after:                 psi,
      torque_checked:            true,
      tpms_checked:              Math.random() > 0.3,
      valve_stem_replaced:       Math.random() > 0.5,
      wheel_inspected:           true,
      risk_level:                riskLevel,
      estimated_life_left_pct:   pct,
      estimated_life_left_text:  lifeText,
      estimated_miles_remaining: milesHigh,
    })
  }
  return records
}

function makeReport(job, company_id, customer_id, vehicle_id, tireRecords) {
  const risks = tireRecords.map(t => t.risk_level)
  const riskOrder = { severe: 4, high: 3, moderate: 2, low: 1 }
  const topRisk = risks.reduce((a, b) => riskOrder[a] >= riskOrder[b] ? a : b, 'low')

  const reasons = []
  if (tireRecords.some(t => t.old_tread_depth <= 3)) reasons.push('Critically low tread depth found on one or more tires')
  if (tireRecords.some(t => t.old_issues?.includes('uneven_wear'))) reasons.push('Uneven wear pattern indicating alignment issues')
  if (tireRecords.some(t => t.old_issues?.includes('sidewall_cracking'))) reasons.push('Sidewall cracking from age and UV exposure')
  if (tireRecords.some(t => t.old_issues?.includes('weather_cracking'))) reasons.push('Weather cracking reducing structural integrity')
  if (reasons.length === 0) reasons.push('Tires were within acceptable wear range')

  const timeSavedMap = { tire_replacement: 125, rotation: 90, tire_repair: 75, inspection: 60, emergency_roadside: 150, fleet_service: 180, other: 90 }
  const timeSaved = timeSavedMap[job.service_type] ?? 90

  const badges = ['Professional mobile service', 'No shop visit needed', 'Service at your location']
  if (tireRecords.some(t => t.torque_checked)) badges.push('Torque verified to spec')
  if (tireRecords.some(t => t.tpms_checked))   badges.push('TPMS reset and verified')

  const facts = [
    'Tires should be rotated every 5,000–7,500 miles to maximize even wear.',
    'Proper tire pressure improves fuel economy by up to 3%.',
    `Your tires were inflated to ${tireRecords[0]?.psi_after ?? 35} PSI — check monthly.`,
    'The minimum safe tread depth is 2/32". A penny test can help you check.',
  ]

  const completedAt = job.completed_at
  const rotationDate = new Date(completedAt)
  rotationDate.setMonth(rotationDate.getMonth() + 5)
  const inspectionDate = new Date(completedAt)
  inspectionDate.setMonth(inspectionDate.getMonth() + 6)

  return {
    job_id:               job.id,
    company_id,
    customer_id,
    vehicle_id,
    status:               'generated',
    tone:                 'friendly',
    good_call_badges:     badges.slice(0, 5),
    risk_summary:         { level: topRisk, reasons, worst_position: tireRecords[0]?.position ?? null },
    time_saved_minutes:   timeSaved,
    time_saved_breakdown: { 'Drive to shop avoided': 25, 'Wait at shop avoided': 60, 'Check-in and checkout': 15, 'Return trip avoided': 25 },
    tire_facts:           facts,
    next_service_date:    rotationDate.toISOString().split('T')[0],
    next_service_notes:   `Recommended rotation around ${rotationDate.toISOString().split('T')[0]}. Full inspection around ${inspectionDate.toISOString().split('T')[0]}.`,
    generated_by:         null,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding test data...\n')

  // 1. Create customers
  const { data: customers, error: custErr } = await sb
    .from('customers')
    .insert(CUSTOMERS.map(c => ({ ...c, company_id: COMPANY_ID })))
    .select()

  if (custErr) { console.error('❌ Customers:', custErr.message); process.exit(1) }
  console.log(`✓ Created ${customers.length} customers`)

  // 2. Create vehicles
  const vehicleInserts = customers.map((c, i) => ({
    ...VEHICLES[i],
    company_id:  COMPANY_ID,
    customer_id: c.id,
  }))
  const { data: vehicles, error: vehErr } = await sb.from('vehicles').insert(vehicleInserts).select()
  if (vehErr) { console.error('❌ Vehicles:', vehErr.message); process.exit(1) }
  console.log(`✓ Created ${vehicles.length} vehicles`)

  // 3. Create jobs
  const now = new Date()
  const jobInserts = customers.map((c, i) => {
    const daysAgo = rand(1, 30)
    const completed = new Date(now)
    completed.setDate(completed.getDate() - daysAgo)
    const tireCount = [2, 4, 4, 4, 4, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4][i]
    return {
      company_id:      COMPANY_ID,
      customer_id:     c.id,
      vehicle_id:      vehicles[i].id,
      service_type:    SERVICE_TYPES[i],
      status:          'report_generated',
      tire_count:      tireCount,
      scheduled_start: completed.toISOString(),
      started_at:      completed.toISOString(),
      completed_at:    completed.toISOString(),
      report_generated_at: completed.toISOString(),
      service_city:    'San Antonio',
      service_state:   'TX',
      report_tone:     'friendly',
    }
  })

  const { data: jobs, error: jobErr } = await sb.from('jobs').insert(jobInserts).select()
  if (jobErr) { console.error('❌ Jobs:', jobErr.message); process.exit(1) }
  console.log(`✓ Created ${jobs.length} jobs`)

  // 4. Create tire records
  for (const job of jobs) {
    const records = makeTireRecords(job.id, job.tire_count, job.service_type)
    const { error } = await sb.from('tire_records').insert(records)
    if (error) console.error(`  ❌ Tire records for job ${job.id}:`, error.message)
  }
  console.log('✓ Created tire records')

  // 5. Create checklist items (all completed)
  const checklistInserts = []
  for (const job of jobs) {
    for (const item of DEFAULT_CHECKLIST) {
      checklistInserts.push({ job_id: job.id, ...item, completed: true })
    }
  }
  const { error: checkErr } = await sb.from('checklist_items').insert(checklistInserts)
  if (checkErr) console.error('❌ Checklist:', checkErr.message)
  else console.log('✓ Created checklist items')

  // 6. Job status history
  const historyInserts = jobs.map(j => ({
    job_id: j.id, status: 'report_generated', note: 'Seeded test job'
  }))
  await sb.from('job_status_history').insert(historyInserts)
  console.log('✓ Created status history')

  // 7. Create reports
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    const { data: tireRecords } = await sb.from('tire_records').select('*').eq('job_id', job.id)
    const reportData = makeReport(job, COMPANY_ID, customers[i].id, vehicles[i].id, tireRecords ?? [])
    // Generate URL-safe slug (no +, /, or = chars)
    const slug = Buffer.from(crypto.randomBytes ? crypto.randomBytes(12) : Math.random().toString()).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
    const { data: report, error } = await sb.from('reports').insert({ ...reportData, public_slug: slug }).select('public_slug').single()
    if (error) console.error(`  ❌ Report for ${customers[i].first_name}:`, error.message)
    else console.log(`  ✓ Report for ${customers[i].first_name} ${customers[i].last_name} → /report/${report.public_slug}`)
  }

  console.log('\n✅ Seed complete!')
}

seed().catch(console.error)
