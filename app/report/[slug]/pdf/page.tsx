import { redirect } from 'next/navigation'

export default async function PdfRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/api/report/${slug}/pdf`)
}
