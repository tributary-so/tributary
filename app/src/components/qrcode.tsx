import { useEffect, useRef } from 'react'
import { generateQrCodeImage } from 'dfts-qrcode'

export interface QRCodeProps {
  text: string
  url: string
  size?: string
}

export default function QRCodeGenerator({ text, url, size = '128px' }: QRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!qrRef.current) return

    try {
      const { image } = generateQrCodeImage(url)

      // Clear previous QR code
      qrRef.current.innerHTML = ''

      // Set size and append image
      image.style.width = size
      image.style.height = size
      qrRef.current.appendChild(image)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }, [text, url, size])

  return (
    <div>
      <div ref={qrRef} className="bg-white p-4 rounded-lg -m-5" />
      <a href={url} className="text-xl italic text-gray-400 ml-5 underline underline-offset-4">
        {text}
      </a>
    </div>
  )
}
