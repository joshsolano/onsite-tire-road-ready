'use client'

import { useState } from 'react'

export default function AssignJobsButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function run() {
    setState('loading')
    const res = await fetch('/api/admin/assign-jobs', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error ?? 'Something went wrong')
      setState('error')
    } else {
      setMessage(data.assigned > 0 ? `Assigned ${data.assigned} job${data.assigned !== 1 ? 's' : ''} to technicians` : data.message)
      setState('done')
    }
    setTimeout(() => setState('idle'), 4000)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={state === 'loading'}
        className="btn-secondary text-sm py-2 px-4 disabled:opacity-50"
      >
        {state === 'loading' ? 'Assigning…' : 'Auto-assign Jobs'}
      </button>
      {message && (
        <span className={`text-xs font-medium ${state === 'error' ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
