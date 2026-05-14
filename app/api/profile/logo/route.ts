import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

// SVG intentionally excluded — SVG files can contain <script> tags which
// would execute as stored XSS when the logo is rendered on public invoices.
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

// Magic bytes for raster formats. Checked against actual file bytes, not the
// browser-supplied Content-Type, which an attacker can freely set to anything.
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  'image/png':  b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47,
  'image/jpeg': b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  'image/jpg':  b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  'image/webp': b => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
                  && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
}

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
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'File must be PNG, JPG, or WebP' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const header = new Uint8Array(bytes, 0, 12)
  if (!MAGIC[file.type]?.(header)) {
    return NextResponse.json({ error: 'File content does not match its declared type' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${user.id}/logo.${ext}`

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
