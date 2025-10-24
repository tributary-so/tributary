import { useEffect, useRef } from 'react'
import { generateQrCodeImage } from 'dfts-qrcode'

export interface QRCodeProps {
  text: string
  size?: string
}

export default function QRCodeGenerator({ text = 'https://example.com', size = '128px' }: QRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!qrRef.current) return

    try {
      const { image } = generateQrCodeImage(text)

      // Clear previous QR code
      qrRef.current.innerHTML = ''

      // Set size and append image
      image.style.width = size
      image.style.height = size
      qrRef.current.appendChild(image)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }, [text, size])

  return (
    <div>
      <div ref={qrRef} className="bg-white p-4 rounded-lg -m-5" />
      <a href="{text}" className="text-xs italic text-gray-400 ml-5 underline underline-offset-4">
        {text}
      </a>
    </div>
  )
}
