import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'])

export async function POST(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('logo') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'File must be PNG, JPG, SVG or WebP' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${user.id}/logo.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from('logos')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)

  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ logo_url: publicUrl })
    .eq('id', user.id)

  if (dbErr) return NextResponse.json({ error: 'Saved file but failed to update profile' }, { status: 500 })
  return NextResponse.json({ logo_url: publicUrl })
}

export async function DELETE() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('logo_url')
    .eq('id', user.id)
    .single()

  if (profile?.logo_url) {
    const path = profile.logo_url.split('/logos/').pop()
    if (path) await supabase.storage.from('logos').remove([path])
  }

  await supabase.from('profiles').update({ logo_url: null }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
