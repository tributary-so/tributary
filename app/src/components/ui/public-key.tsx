import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { Button } from '@heroui/react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface PublicKeyProps {
  publicKey: PublicKey
  className?: string
}

export function PublicKeyComponent({ publicKey, className = '' }: PublicKeyProps) {
  const [copying, setCopying] = useState(false)

  const shortenPublicKey = (key: PublicKey) => {
    const keyStr = key.toString()
    return `${keyStr.slice(0, 4)}...${keyStr.slice(-4)}`
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publicKey.toBase58())
      setCopying(true)
      setTimeout(() => {
        setCopying(false)
      }, 2000)
    } catch (_err) {
      toast.error('Copying to clipboard failed!')
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {copying ? (
        <span className="text-xs sm:text-sm text-green-500 flex items-center gap-1.5">
          <Check size={16} className="text-green-500" />
          Copied!
        </span>
      ) : (
        <>
          <span className="font-mono text-sm">{shortenPublicKey(publicKey)}</span>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={copyToClipboard}
            className="ml-1 min-w-unit-6 w-unit-6 h-unit-6"
            title="Copy full public key"
          >
            <Copy size={13} className="text-gray-500 hover:text-gray-700" />
          </Button>
        </>
      )}
    </span>
  )
}
