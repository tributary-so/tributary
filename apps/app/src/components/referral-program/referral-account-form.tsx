import React, { useState, useEffect, useRef } from 'react'
import { Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { Select, SelectItem, Input } from '@heroui/react'
import { Button } from '@heroui/react'
import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { addToast } from '@heroui/react'
import { useSDK, createAndSendTransaction } from '@/lib/client'
import { decodeMemo } from '@tributary-so/sdk'
import type { PaymentGateway } from '@tributary-so/sdk'

export interface ReferralAccountFormProps {
  initialGateway?: string
  initialReferralCode?: string
  onGatewayChange?: (gatewayPubkey: string) => void
}

export default function ReferralAccountForm({
  initialGateway,
  initialReferralCode,
  onGatewayChange,
}: ReferralAccountFormProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [loading, setLoading] = useState(false)
  const [gateway, setGateway] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [gateways, setGateways] = useState<Array<{ publicKey: PublicKey; account: PaymentGateway }>>([])
  const [gatewaysLoading, setGatewaysLoading] = useState(false)
  const [gatewaysLoaded, setGatewaysLoaded] = useState(false)
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null)
  const [referralCodeAvailable, setReferralCodeAvailable] = useState<boolean | null>(null)
  const [validating, setValidating] = useState(false)
  const [referrerCode, setReferrerCode] = useState('')
  const [referrerValid, setReferrerValid] = useState<boolean | null>(null)
  const [validatingReferrer, setValidatingReferrer] = useState(false)
  const lastValidatedRef = useRef<string>('')
  const lastReferrerValidatedRef = useRef<string>('')

  useEffect(() => {
    const fetchGateways = async () => {
      if (!sdk || gatewaysLoaded) return
      try {
        setGatewaysLoading(true)
        const gatewayData = await sdk.getAllPaymentGateway()
        setGateways(gatewayData)
        const gatewayToUse = initialGateway || (gatewayData.length > 0 ? gatewayData[0].publicKey.toString() : '')
        setGateway(gatewayToUse)
        setGatewaysLoaded(true)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        addToast({ title: 'Error', description: 'Failed to fetch payment gateways: ' + errorMessage, color: 'danger' })
        console.error('Error fetching payment gateways:', error)
      } finally {
        setGatewaysLoading(false)
        setGatewaysLoaded(true)
      }
    }
    if (sdk && !gatewaysLoaded) {
      fetchGateways()
    }
  }, [sdk, gatewaysLoaded, gateway, initialGateway])

  useEffect(() => {
    if (initialReferralCode && !referralCode) {
      setReferralCode(initialReferralCode)
    }
  }, [initialReferralCode, referralCode])

  useEffect(() => {
    const validateReferralCode = async () => {
      if (referralCode.length !== 6) {
        setReferralCodeValid(null)
        setReferralCodeAvailable(null)
        setValidating(false)
        lastValidatedRef.current = ''
        return
      }

      const validationKey = `${referralCode}-${gateway}`
      if (validationKey === lastValidatedRef.current) {
        return
      }

      setValidating(true)
      lastValidatedRef.current = validationKey

      // Basic format validation
      const isValidFormat = sdk?.validateReferralCode(referralCode) ?? false
      setReferralCodeValid(isValidFormat)

      if (!isValidFormat || !gateway || !sdk) {
        setReferralCodeAvailable(null)
        setValidating(false)
        return
      }

      // Check if code is available
      try {
        const gatewayPubkey = new PublicKey(gateway)
        const existingAccount = await sdk.getReferralAccountByCode(gatewayPubkey, referralCode)
        setReferralCodeAvailable(!existingAccount) // Available if no existing account
      } catch (error) {
        console.error('Error checking referral code availability:', error)
        setReferralCodeAvailable(null)
      } finally {
        setValidating(false)
      }
    }

    validateReferralCode()
  }, [referralCode, gateway, sdk])

  useEffect(() => {
    const validateReferrerCode = async () => {
      if (!referrerCode) {
        setReferrerValid(null)
        setValidatingReferrer(false)
        return
      }

      const validationKey = `${referrerCode}-${gateway}`
      if (validationKey === lastReferrerValidatedRef.current) {
        return
      }

      setValidatingReferrer(true)
      lastReferrerValidatedRef.current = validationKey

      if (referrerCode.length !== 6 || !sdk?.validateReferralCode(referrerCode)) {
        setReferrerValid(false)
        setValidatingReferrer(false)
        return
      }

      if (!gateway || !sdk) {
        setReferrerValid(null)
        setValidatingReferrer(false)
        return
      }

      try {
        const gatewayPubkey = new PublicKey(gateway)
        const referrerAccount = await sdk.getReferralAccountByCode(gatewayPubkey, referrerCode)
        setReferrerValid(!!referrerAccount)
      } catch (error) {
        console.error('Error validating referrer code:', error)
        setReferrerValid(false)
      } finally {
        setValidatingReferrer(false)
      }
    }

    validateReferrerCode()
  }, [referrerCode, gateway, sdk])

  const handleReferralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReferralCode(e.target.value)
  }

  const handleReferrerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReferrerCode(e.target.value)
  }

  const handleSubmit = async () => {
    if (!wallet.publicKey || !wallet.connected) {
      addToast({ title: 'Error', description: 'Please connect your wallet', color: 'danger' })
      return
    }
    if (!sdk) {
      addToast({ title: 'Error', description: 'SDK not available', color: 'danger' })
      return
    }
    if (!referralCodeValid || !referralCodeAvailable) {
      addToast({ title: 'Error', description: 'Please enter a valid and available referral code', color: 'danger' })
      return
    }

    setLoading(true)
    try {
      let referrerPubkey: PublicKey | undefined
      if (referrerValid && referrerCode) {
        const gatewayPubkey = new PublicKey(gateway)
        const referrerAccount = await sdk.getReferralAccountByCode(gatewayPubkey, referrerCode)
        if (referrerAccount) {
          referrerPubkey = referrerAccount.owner
        }
      }

      const instruction = await sdk.createReferralAccount(new PublicKey(gateway), referralCode, referrerPubkey)

      await createAndSendTransaction([instruction], wallet, connection)
      addToast({
        title: 'Success',
        description: `Referral account created successfully! Your referral code is: ${referralCode}`,
        color: 'success',
      })

      // Reset form
      setReferralCode('')
      setReferrerCode('')
      setReferrerValid(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      addToast({ title: 'Error', description: 'Failed to create referral account: ' + errorMessage, color: 'danger' })
      console.error('Error creating referral account:', err)
    } finally {
      setLoading(false)
    }
  }

  const getReferralCodeStatus = () => {
    if (validating) return { color: 'validating', message: 'Validating...' }
    if (referralCodeValid === false)
      return { color: 'error', message: 'Invalid format (must be 6 alphanumeric characters)' }
    if (referralCodeValid === true && referralCodeAvailable === false)
      return { color: 'warning', message: 'Code already taken' }
    if (referralCodeValid === true && referralCodeAvailable === true) return { color: 'success', message: 'Available!' }
    return null
  }

  const status = getReferralCodeStatus()

  return (
    <div className="max-w-[700px] space-y-4 p-6 border border-border  bg-muted/30">
      <h3 className="text-xl font-semibold text-foreground mb-4">Create Referral Account</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create a referral account to earn rewards when others use your referral code for payments.
      </p>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="gateway" className="text-xs font-medium text-(--color-primary) uppercase mb-1 block">
            Gateway
          </label>
          {gatewaysLoading ? (
            <div className="flex items-center justify-center h-10 border border-(--color-primary) ">
              <Loader2 className="w-4 h-4 text-(--color-primary) animate-spin" />
            </div>
          ) : (
            <Select
              id="gateway"
              name="gateway"
              selectedKeys={gateway ? [gateway] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0] as string
                setGateway(selectedKey)
                onGatewayChange?.(selectedKey)
              }}
              placeholder="Select gateway"
              required
              className="w-full"
            >
              {gateways.map((gateway) => (
                <SelectItem key={gateway.publicKey.toString()} description={`${decodeMemo(gateway.account.url)}`}>
                  {decodeMemo(gateway.account.name)}
                </SelectItem>
              ))}
            </Select>
          )}
        </div>

        <div>
          <label
            htmlFor="referralCode"
            className="text-xs font-medium text-(--color-primary) uppercase mb-1 block"
          >
            Referral Code
          </label>
          <Input
            id="referralCode"
            name="referralCode"
            value={referralCode}
            onChange={handleReferralChange}
            placeholder="e.g., ABC123"
            maxLength={6}
            className={`w-full ${
              status?.color === 'error'
                ? 'border-overdue-500'
                : status?.color === 'warning'
                ? 'border-milestone-500'
                : status?.color === 'success'
                ? 'border-status-active-500'
                : status?.color === 'validating'
                ? 'border-policy-400'
                : ''
            }`}
            isInvalid={status?.color === 'error' || status?.color === 'warning'}
            errorMessage={status?.color !== 'validating' ? status?.message : undefined}
            endContent={
              status ? (
                <div className="pointer-events-none flex items-center">
                  {status.color === 'validating' ? (
                    <Loader2 className="w-4 h-4 text-policy-400 animate-spin" />
                  ) : (
                    <span
                      className={`text-small ${
                        status.color === 'error'
                          ? 'text-overdue-500'
                          : status.color === 'warning'
                          ? 'text-milestone-500'
                          : status.color === 'success'
                          ? 'text-status-active-500'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {status.color === 'error' ? (
                        <X className="w-4 h-4" />
                      ) : status.color === 'warning' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : status.color === 'success' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        ''
                      )}
                    </span>
                  )}
                </div>
              ) : null
            }
          />
          {status?.color === 'validating' ? (
            <p className="text-xs text-policy-500 mt-1">Validating...</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Must be exactly 6 alphanumeric characters (A-Z, 0-9)</p>
          )}
        </div>

        <div>
          <label
            htmlFor="referrerCode"
            className="text-xs font-medium text-(--color-primary) uppercase mb-1 block"
          >
            Referrer Code
          </label>
          <Input
            id="referrerCode"
            name="referrerCode"
            value={referrerCode}
            onChange={handleReferrerChange}
            placeholder="e.g., XYZ789 (optional)"
            maxLength={6}
            className={`w-full ${
              referrerValid === false
                ? 'border-overdue-500'
                : referrerValid === true
                ? 'border-status-active-500'
                : validatingReferrer
                ? 'border-policy-400'
                : ''
            }`}
            isInvalid={referrerValid === false}
            errorMessage={referrerValid === false ? 'Invalid referrer code' : undefined}
            endContent={
              validatingReferrer || referrerValid !== null ? (
                <div className="pointer-events-none flex items-center">
                  {validatingReferrer ? (
                    <Loader2 className="w-4 h-4 text-policy-400 animate-spin" />
                  ) : (
                    <span
                      className={`text-small ${
                        referrerValid === false
                          ? 'text-overdue-500'
                          : referrerValid === true
                          ? 'text-status-active-500'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {referrerValid === false ? (
                        <X className="w-4 h-4" />
                      ) : referrerValid === true ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        ''
                      )}
                    </span>
                  )}
                </div>
              ) : null
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            Optional: Enter the referral code of the person who referred you
          </p>
        </div>
      </div>

      <Button
        isDisabled={
          loading || !wallet.connected || !gateway || !referralCode || !referralCodeValid || !referralCodeAvailable
        }
        className="w-full mt-6 text-sm uppercase text-white"
        color="primary"
        isLoading={loading}
        onClick={handleSubmit}
      >
        {loading ? 'Creating...' : 'Create Referral Account'}
      </Button>
    </div>
  )
}
