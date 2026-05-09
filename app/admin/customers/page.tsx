import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const { data: customers } = await supabase
    .from('customers')
    .select('*, vehicles(count)')
    .eq('company_id', profile?.company_id)
    .order('last_name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Link href="/admin/jobs/new" className="btn-primary">+ Create Job</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Name', 'Phone', 'Email', 'Vehicles', 'Added', ''].map(h => (
                <th key={h} className="text-left p-3 font-medium text-gray-500 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!customers?.length && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No customers yet. <Link href="/admin/jobs/new" className="text-red-600">Create a job</Link> to add one.</td></tr>
            )}
            {customers?.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium text-gray-900">{c.last_name}, {c.first_name}</td>
                <td className="p-3 text-gray-600">{c.phone ?? '—'}</td>
                <td className="p-3 text-gray-600">{c.email ?? '—'}</td>
                <td className="p-3 text-gray-600">{(c.vehicles as Array<unknown>)?.length ?? 0}</td>
                <td className="p-3 text-gray-500 text-xs">{formatDate(c.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td className="p-3">
                  <Link href={`/admin/jobs/new`} className="text-red-600 text-xs">New Job →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
