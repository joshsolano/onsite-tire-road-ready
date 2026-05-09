import type { TireRecord, TireIssue, RiskLevel } from './types'

// ── Risk Level ────────────────────────────────────────────────────────────────

const STRUCTURAL_ISSUES: TireIssue[] = ['sidewall_damage', 'bubble', 'belt_separation']

const ISSUE_SCORE: Record<TireIssue, number> = {
  sidewall_damage:     10,
  bubble:              10,
  belt_separation:     10,
  puncture_sidewall:   6,
  dry_rot:             5,
  heat_damage:         4,
  low_pressure_damage: 4,
  nail_screw:          3,
  uneven_wear:         3,
  wrong_size:          3,
  age_concern:         2,
  low_tread:           2,
  customer_request:    0,
}

export function calculateRiskLevel(tire: Partial<TireRecord>): RiskLevel {
  const issues = tire.old_issues ?? []
  if (issues.some(i => STRUCTURAL_ISSUES.includes(i as TireIssue))) return 'severe'

  let score = 0
  const depth = tire.old_tread_depth ?? 10

  if (depth < 2)        score += 8
  else if (depth <= 2)  score += 5
  else if (depth <= 3)  score += 3
  else if (depth <= 4)  score += 2
  else if (depth <= 5)  score += 1

  if (tire.old_dot) {
    const age = getDotAge(tire.old_dot)
    if (age >= 10)      score += 4
    else if (age >= 7)  score += 3
    else if (age >= 5)  score += 2
    else if (age >= 3)  score += 1
  }

  for (const issue of issues) {
    score += ISSUE_SCORE[issue as TireIssue] ?? 0
  }

  if (score >= 10) return 'severe'
  if (score >= 6)  return 'high'
  if (score >= 3)  return 'moderate'
  return 'low'
}

function getDotAge(dot: string): number {
  const match = dot.match(/(\d{2})(\d{2})$/)
  if (!match) return 0
  const year = 2000 + parseInt(match[2], 10)
  return new Date().getFullYear() - year
}

// ── Tire Life Left ────────────────────────────────────────────────────────────

const NEW_TIRE_BASELINE = 10
const MIN_SAFE_TREAD = 2
const MILES_PER_32ND = 2500

export interface LifeLeftResult {
  pct: number
  miles_low: number
  miles_high: number
  text: string
  safety_override: string | null
}

export function calculateLifeLeft(tire: Partial<TireRecord>): LifeLeftResult {
  const issues = tire.old_issues ?? []
  const hasStructural = issues.some(i => STRUCTURAL_ISSUES.includes(i as TireIssue))
  const hasDryRot = issues.includes('dry_rot')
  const isOld = tire.old_dot ? getDotAge(tire.old_dot) >= 7 : false

  if (hasStructural) {
    const issueLabel = issues
      .filter(i => STRUCTURAL_ISSUES.includes(i as TireIssue))
      .map(i => i.replace(/_/g, ' '))
      .join(', ')
    return {
      pct: 0,
      miles_low: 0,
      miles_high: 0,
      text: 'Not safe for use regardless of tread depth.',
      safety_override: `This tire had ${issueLabel} — a condition that makes it unsafe to drive on even when tread depth appears to remain.`,
    }
  }

  const depth = Math.max(0, tire.old_tread_depth ?? 0)
  const usableRemaining = Math.max(0, depth - MIN_SAFE_TREAD)
  const totalUsable = NEW_TIRE_BASELINE - MIN_SAFE_TREAD
  const pct = Math.round((usableRemaining / totalUsable) * 100)
  const estMiles = usableRemaining * MILES_PER_32ND
  const miles_low = Math.round(estMiles * 0.7)
  const miles_high = Math.round(estMiles * 1.3)

  let safety_override: string | null = null
  if (hasDryRot || isOld) {
    safety_override = hasDryRot
      ? 'This tire showed dry rot. Rubber degradation can make a tire unsafe even when tread appears adequate.'
      : 'This tire was over 7 years old. Rubber compounds harden over time, affecting safety even when tread remains.'
  }

  let text = ''
  if (pct <= 5)
    text = `Less than 5% of usable tread life remained — approximately ${miles_low.toLocaleString()}–${miles_high.toLocaleString()} miles under normal conditions.`
  else if (pct <= 15)
    text = `Approximately ${pct}% of usable tread life remained — roughly ${miles_low.toLocaleString()}–${miles_high.toLocaleString()} miles.`
  else if (pct <= 30)
    text = `About ${pct}% of usable tread life remained at the time of service.`
  else
    text = `Roughly ${pct}% of usable tread life remained. Replacement was still a smart, proactive decision.`

  return { pct, miles_low, miles_high, text, safety_override }
}

// ── Time Saved ───────────────────────────────────────────────────────────────

export interface TimeSavedResult {
  total_minutes: number
  hours_display: string
  breakdown: Array<{ label: string; minutes: number }>
  headline: string
  trips_avoided: number
  waiting_rooms_avoided: number
}

const TIME_COMPONENTS = [
  { key: 'drive_to_shop',    label: 'Drive to tire shop avoided',     minutes: 25 },
  { key: 'shop_wait',        label: 'Wait at the shop avoided',        minutes: 60 },
  { key: 'paperwork',        label: 'Check-in and checkout avoided',   minutes: 15 },
  { key: 'return_trip',      label: 'Return trip avoided',             minutes: 25 },
  { key: 'scheduling',       label: 'Schedule coordination avoided',   minutes: 20 },
  { key: 'workday',          label: 'Workday interruption avoided',    minutes: 30 },
]

const SERVICE_BASE: Record<string, { low: number; high: number }> = {
  tire_replacement_1:  { low: 90,  high: 120 },
  tire_replacement_2:  { low: 120, high: 150 },
  tire_replacement_4:  { low: 150, high: 240 },
  tire_repair:         { low: 60,  high: 90  },
  rotation:            { low: 60,  high: 75  },
  inspection:          { low: 30,  high: 45  },
  emergency_roadside:  { low: 180, high: 300 },
  fleet_service:       { low: 60,  high: 120 },
  default:             { low: 90,  high: 150 },
}

export function calculateTimeSaved(serviceType: string, tireCount: number): TimeSavedResult {
  let key = serviceType
  if (serviceType === 'tire_replacement') {
    key = tireCount <= 1 ? 'tire_replacement_1'
        : tireCount <= 2 ? 'tire_replacement_2'
        : 'tire_replacement_4'
  }
  const range = SERVICE_BASE[key] ?? SERVICE_BASE.default
  const total = Math.round((range.low + range.high) / 2)
  const hours = (total / 60).toFixed(1)

  return {
    total_minutes: total,
    hours_display: hours,
    breakdown: TIME_COMPONENTS,
    headline: `You saved approximately ${hours} hours today by choosing mobile tire service.`,
    trips_avoided: 2,
    waiting_rooms_avoided: 1,
  }
}

// ── Good Call Badges ─────────────────────────────────────────────────────────

export function selectGoodCallBadges(tires: Partial<TireRecord>[]): string[] {
  const badges = new Set<string>()
  badges.add('Road Ready Again')

  for (const tire of tires) {
    const issues = tire.old_issues ?? []
    const risk = tire.risk_level ?? calculateRiskLevel(tire)
    const depth = tire.old_tread_depth ?? 10

    if (issues.some(i => STRUCTURAL_ISSUES.includes(i as TireIssue))) {
      badges.add('Avoided a Dangerous Situation')
      badges.add('No Tow Truck Needed')
    }
    if (depth <= 4) badges.add('Replaced Before Failure')
    if (depth <= 4 || issues.includes('uneven_wear')) badges.add('Improved Wet Traction')
    if (risk === 'high' || risk === 'severe') {
      badges.add('Reduced Roadside Risk')
      badges.add('Better Stopping Confidence')
    }
    if (issues.includes('nail_screw') || issues.includes('puncture_sidewall')) {
      badges.add('Handled Before It Got Worse')
    }
    if (risk === 'moderate' || risk === 'low') {
      badges.add('Proactive Maintenance')
    }
  }

  const priority = [
    'Avoided a Dangerous Situation',
    'No Tow Truck Needed',
    'Replaced Before Failure',
    'Reduced Roadside Risk',
    'Better Stopping Confidence',
    'Improved Wet Traction',
    'Handled Before It Got Worse',
    'Proactive Maintenance',
    'Road Ready Again',
  ]

  return priority.filter(b => badges.has(b)).slice(0, 5)
}

// ── Tire Facts ────────────────────────────────────────────────────────────────

const GENERIC_FACTS = [
  'Your tires are the only part of your vehicle touching the road. Each contact patch is roughly the size of your hand.',
  'Tire pressure changes about 1 psi for every 10°F change in temperature.',
  'Rotating tires regularly helps them wear more evenly and last longer.',
  'A tire can still hold air and still be unsafe — tread depth, age, and condition all matter.',
  'Most manufacturers recommend replacing tires after 6–10 years regardless of tread depth.',
]

export function selectTireFacts(tires: Partial<TireRecord>[]): string[] {
  const facts: string[] = []
  const allIssues = tires.flatMap(t => t.old_issues ?? [])

  if (allIssues.includes('uneven_wear'))
    facts.push('The uneven wear pattern found on your tire can point to an alignment, suspension, or tire pressure issue worth checking.')
  if (allIssues.includes('sidewall_damage') || allIssues.includes('bubble'))
    facts.push('Sidewall damage and bubbles are among the few tire issues that cannot be safely repaired — replacement is the only safe option.')
  if (allIssues.includes('nail_screw') || allIssues.includes('puncture_sidewall'))
    facts.push('Small punctures can sometimes be repaired, but location matters. Damage too close to the sidewall means replacement is the safer call.')
  if (allIssues.includes('age_concern') || tires.some(t => t.old_dot && getDotAge(t.old_dot) >= 5))
    facts.push('Rubber compounds harden over time. Your tire\'s age was a factor in this service — even tires that look fine can have reduced performance after 5–7 years.')
  if (allIssues.includes('low_tread') || tires.some(t => (t.old_tread_depth ?? 10) <= 4))
    facts.push('Your old tire was close to the end of its usable tread life. Worn tread reduces grip — especially during rain, braking, and quick turns.')
  if (allIssues.includes('dry_rot'))
    facts.push('Dry rot weakens the rubber structure of a tire from the inside out. A tire with dry rot can fail without warning, even at low speeds.')

  const generic = GENERIC_FACTS.filter(f => !facts.includes(f))
  facts.push(generic[Math.floor(Math.random() * generic.length)])

  return facts.slice(0, 3)
}

// ── Next Service Date ────────────────────────────────────────────────────────

export function calculateNextServiceDate(serviceDate: string): {
  rotation_date: string
  inspection_date: string
  annual_date: string
} {
  const base = new Date(serviceDate)
  const addMonths = (d: Date, m: number) => {
    const r = new Date(d)
    r.setMonth(r.getMonth() + m)
    return r.toISOString().split('T')[0]
  }
  return {
    rotation_date:   addMonths(base, 5),
    inspection_date: addMonths(base, 6),
    annual_date:     addMonths(base, 12),
  }
}

// ── Overall risk from multiple tires ────────────────────────────────────────

const RISK_ORDER: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, severe: 3 }

export function worstRisk(risks: RiskLevel[]): RiskLevel {
  return risks.reduce((worst, r) =>
    RISK_ORDER[r] > RISK_ORDER[worst] ? r : worst
  , 'low' as RiskLevel)
}

export function getRiskReasons(tires: Partial<TireRecord>[]): string[] {
  const reasons: string[] = []
  const allIssues = tires.flatMap(t => t.old_issues ?? [])
  const depths = tires.map(t => t.old_tread_depth ?? 10).filter(d => d < 5)

  if (depths.length > 0)
    reasons.push(`Tread depth below safe threshold on ${depths.length} tire${depths.length > 1 ? 's' : ''}`)
  if (allIssues.includes('sidewall_damage')) reasons.push('Sidewall damage detected')
  if (allIssues.includes('bubble'))          reasons.push('Bubble or bulge present')
  if (allIssues.includes('belt_separation')) reasons.push('Belt separation detected')
  if (allIssues.includes('dry_rot'))         reasons.push('Dry rot / rubber degradation')
  if (allIssues.includes('uneven_wear'))     reasons.push('Uneven wear pattern')
  if (allIssues.includes('nail_screw'))      reasons.push('Nail or screw puncture')
  if (allIssues.includes('age_concern'))     reasons.push('Tire age concern')

  return reasons
}
