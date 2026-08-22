import { useCallback } from 'react'
import { generateQrCodeImage } from 'dfts-qrcode'

export interface QRCodeProps {
  text: string
  url: string
  size?: string
}

export default function QRCodeGenerator({ text, url, size = '128px' }: QRCodeProps) {
  const setQrRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return

      try {
        const { image } = generateQrCodeImage(url)
        node.innerHTML = ''
        image.style.width = size
        image.style.height = size
        node.appendChild(image)
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    },
    [url, size],
  )

  return (
    <div>
      <div ref={setQrRef} className="bg-white p-4 -m-5" />
      <a href={url} className="text-xl italic text-muted-foreground ml-5 underline underline-offset-4">
        {text}
      </a>
    </div>
  )
}
