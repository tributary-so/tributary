import React, { useState, useEffect } from 'react'
import { Select, SelectItem, Input } from '@heroui/react'
import { Button } from '@heroui/react'
import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { addToast } from '@heroui/react'
import { useSDK, createAndSendTransaction } from '@/lib/client'
import { decodeMemo } from '@tributary-so/sdk'
import type { PaymentGateway } from '@tributary-so/sdk'

export interface ReferralAccountFormData {
  gateway: string
  referralCode: string
}

export interface ReferralAccountFormProps {
  formData: ReferralAccountFormData
  onFormDataChange: (newFormData: ReferralAccountFormProps['formData']) => void
}

export default function ReferralAccountForm({ formData, onFormDataChange }: ReferralAccountFormProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [loading, setLoading] = useState(false)
  const [gateways, setGateways] = useState<Array<{ publicKey: PublicKey; account: PaymentGateway }>>([])
  const [gatewaysLoading, setGatewaysLoading] = useState(false)
  const [gatewaysLoaded, setGatewaysLoaded] = useState(false)
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null)
  const [referralCodeAvailable, setReferralCodeAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    const fetchGateways = async () => {
      if (!sdk || gatewaysLoaded) return
      try {
        setGatewaysLoading(true)
        const gatewayData = await sdk.getAllPaymentGateway()
        setGateways(gatewayData)
        if (gatewayData.length > 0 && !formData.gateway) {
          onFormDataChange({ ...formData, gateway: gatewayData[0].publicKey.toString() })
        }
        setGatewaysLoaded(true)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        addToast({ title: 'Error', description: 'Failed to fetch payment gateways: ' + errorMessage, color: 'danger' })
        console.error('Error fetching payment gateways:', error)
      } finally {
        setGatewaysLoading(false)
      }
    }
    if (sdk && !gatewaysLoaded) {
      fetchGateways()
    }
  }, [sdk, gatewaysLoaded, formData, onFormDataChange])

  useEffect(() => {
    const validateReferralCode = async () => {
      if (!formData.referralCode) {
        setReferralCodeValid(null)
        setReferralCodeAvailable(null)
        return
      }

      // Basic format validation
      const isValidFormat = sdk?.validateReferralCode(formData.referralCode) ?? false
      setReferralCodeValid(isValidFormat)

      if (!isValidFormat || !formData.gateway || !sdk) {
        setReferralCodeAvailable(null)
        return
      }

      // Check if code is available
      try {
        const gatewayPubkey = new PublicKey(formData.gateway)
        const existingAccount = await sdk.getReferralAccountByCode(gatewayPubkey, formData.referralCode)
        setReferralCodeAvailable(!existingAccount) // Available if no existing account
      } catch (error) {
        console.error('Error checking referral code availability:', error)
        setReferralCodeAvailable(null)
      }
    }

    validateReferralCode()
  }, [formData.referralCode, formData.gateway, sdk])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const newData = { ...formData, [name]: value }
    onFormDataChange(newData)
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
      const gateway = new PublicKey(formData.gateway)

      // Create referral account instruction
      const instruction = await sdk.createReferralAccount(gateway, formData.referralCode)

      await createAndSendTransaction([instruction], wallet, connection)
      addToast({
        title: 'Success',
        description: `Referral account created successfully! Your referral code is: ${formData.referralCode}`,
        color: 'success',
      })

      // Reset form
      onFormDataChange({ gateway: formData.gateway, referralCode: '' })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      addToast({ title: 'Error', description: 'Failed to create referral account: ' + errorMessage, color: 'danger' })
      console.error('Error creating referral account:', err)
    } finally {
      setLoading(false)
    }
  }

  const getReferralCodeStatus = () => {
    if (referralCodeValid === false)
      return { color: 'error', message: 'Invalid format (must be 6 alphanumeric characters)' }
    if (referralCodeValid === true && referralCodeAvailable === false)
      return { color: 'warning', message: 'Code already taken' }
    if (referralCodeValid === true && referralCodeAvailable === true) return { color: 'success', message: 'Available!' }
    return null
  }

  const status = getReferralCodeStatus()

  return (
    <div className="max-w-[700px] space-y-4 mt-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Referral Account</h3>
      <p className="text-sm text-gray-600 mb-4">
        Create a referral account to earn rewards when others use your referral code for payments.
      </p>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="gateway" className="text-xs font-medium text-[var(--color-primary)] uppercase mb-1 block">
            Gateway
          </label>
          {gatewaysLoading ? (
            <div className="flex items-center justify-center h-10 border border-[var(--color-primary)] rounded">
              <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Select
              id="gateway"
              name="gateway"
              selectedKeys={formData.gateway ? [formData.gateway] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0] as string
                onFormDataChange({ ...formData, gateway: selectedKey })
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
            className="text-xs font-medium text-[var(--color-primary)] uppercase mb-1 block"
          >
            Referral Code
          </label>
          <Input
            id="referralCode"
            name="referralCode"
            value={formData.referralCode}
            onChange={handleInputChange}
            placeholder="e.g., ABC123"
            maxLength={6}
            className={`w-full ${
              status?.color === 'error'
                ? 'border-red-500'
                : status?.color === 'warning'
                ? 'border-yellow-500'
                : status?.color === 'success'
                ? 'border-green-500'
                : ''
            }`}
            isInvalid={status?.color === 'error' || status?.color === 'warning'}
            errorMessage={status?.message}
            endContent={
              status ? (
                <div className="pointer-events-none flex items-center">
                  <span
                    className={`text-small ${
                      status.color === 'error'
                        ? 'text-red-500'
                        : status.color === 'warning'
                        ? 'text-yellow-500'
                        : status.color === 'success'
                        ? 'text-green-500'
                        : 'text-gray-500'
                    }`}
                  >
                    {status.color === 'error'
                      ? '✗'
                      : status.color === 'warning'
                      ? '⚠'
                      : status.color === 'success'
                      ? '✓'
                      : ''}
                  </span>
                </div>
              ) : null
            }
          />
          <p className="text-xs text-gray-500 mt-1">Must be exactly 6 alphanumeric characters (A-Z, 0-9)</p>
        </div>
      </div>

      <Button
        isDisabled={
          loading ||
          !wallet.connected ||
          !formData.gateway ||
          !formData.referralCode ||
          !referralCodeValid ||
          !referralCodeAvailable
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
