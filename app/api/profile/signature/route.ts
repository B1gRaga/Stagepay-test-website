import { NextRequest, NextResponse } from 'next/server'
import { getAccount, canManage, accountProfileClient } from '@/lib/account'
import { stripTags } from '@/lib/sanitize'

// POST /api/profile/signature  (multipart: signature=<image>, name=<text>)
// The business's signature or stamp, printed on every invoice and receipt
// above an "Authorised by" line, with `name` (e.g. "Neo Kgosi · Director")
// under it. Either part may be sent on its own. Same rules as the logo:
// raster images only, checked by their bytes, kept in the account's own
// folder of the public logos bucket.
// DELETE removes both.

const MAX_BYTES = 1 * 1024 * 1024 // 1 MB
const NAME_MAX = 60

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  'image/png':  b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47,
  'image/jpeg': b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  'image/jpg':  b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  'image/webp': b => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
                  && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
}

export async function POST(req: NextRequest) {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(account)) return NextResponse.json({ error: 'Only the owner or an admin can change the signature' }, { status: 403 })
  const supabase = await accountProfileClient(account)

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('signature')
  const nameRaw = formData.get('name')
  const update: { signature_url?: string; signature_name?: string | null } = {}

  if (typeof nameRaw === 'string') {
    const name = stripTags(nameRaw).slice(0, NAME_MAX)
    update.signature_name = name || null
  }

  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'File must be PNG, JPG, or WebP' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be under 1 MB' }, { status: 400 })
    const bytes = await file.arrayBuffer()
    if (!MAGIC[file.type]?.(new Uint8Array(bytes, 0, 12))) {
      return NextResponse.json({ error: 'File content does not match its declared type' }, { status: 400 })
    }
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const path = `${account.accountId}/signature.${ext}`
    const { error: uploadErr } = await supabase.storage.from('logos').upload(path, bytes, { contentType: file.type, upsert: true })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    // A new query string makes browsers and the PDF renderer fetch the new image, not a cached one.
    update.signature_url = `${publicUrl}?v=${Date.now()}`
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })

  const { error: dbErr } = await supabase.from('profiles').update(update).eq('id', account.accountId)
  if (dbErr) return NextResponse.json({ error: 'Saved file but failed to update profile' }, { status: 500 })
  return NextResponse.json(update)
}

export async function DELETE() {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(account)) return NextResponse.json({ error: 'Only the owner or an admin can change the signature' }, { status: 403 })
  const supabase = await accountProfileClient(account)

  const { data: profile } = await supabase.from('profiles').select('signature_url').eq('id', account.accountId).single()
  if (profile?.signature_url) {
    const path = profile.signature_url.split('/logos/').pop()?.split('?')[0]
    if (path) await supabase.storage.from('logos').remove([path])
  }
  await supabase.from('profiles').update({ signature_url: null, signature_name: null }).eq('id', account.accountId)
  return NextResponse.json({ ok: true })
}
