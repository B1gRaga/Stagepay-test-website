// "Scan to verify": every invoice and receipt PDF carries a QR code that opens
// the invoice's own page on StagePay, which shows who issued it, the amount
// and whether it is paid. A forged invoice has no page to open; a forged
// receipt opens a page that says it is not paid. The code is the invoice's
// public link (a 128-bit token), so it gives away nothing a holder of the PDF
// didn't already have.
import QRCode from 'qrcode'

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://getstagepay.co').replace(/\/$/, '')
}

// The link the QR code opens. ?v=1 makes the page lead with "Verified".
export function verifyUrl(publicToken: string) {
  return `${appUrl()}/invoice/${publicToken}?v=1`
}

export type QrPath = { size: number; path: string }

// The QR code as one SVG path (one square per dark module), for drawing with
// a Path element in the PDF at any size: viewBox 0 0 size size.
export function qrPath(text: string): QrPath {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const size = qr.modules.size
  const data = qr.modules.data
  let path = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) path += `M${x} ${y}h1v1h-1z`
    }
  }
  return { size, path }
}
