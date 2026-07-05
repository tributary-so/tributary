import { useState } from 'react'
import PaymentPolicyForm, { PaymentPolicyFormData } from './policy-inputs'
import IntegrationCode from './integration-snippet'

export default function PaymentPolicyFeature() {
  const [formData, setFormData] = useState<PaymentPolicyFormData>({
    policyType: 'subscription',
    tokenMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    recipient: '',
    gateway: '',
    amount: '',
    intervalSeconds: '2592000',
    memo: '',
    frequency: 'monthly',
    autoRenew: true,
    maxRenewals: '',
    approvalAmount: '',
    referralCode: '',
    successUrl: '',
    cancelUrl: '',
    milestoneAmounts: ['', '', '', ''],
    milestoneDates: Array.from({ length: 4 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() + 1 + i)
      return date
    }),
    dueDateRequired: true,
    signerType: 'none' as const,
    totalMilestones: '1',
    maxAmountPerPeriod: '',
    maxChunkAmount: '',
    periodLengthSeconds: '2592000',
    oneTimeDueDate: null,
    oneTimeExpiryDate: null,
    upToValidAfter: null,
    upToDeadline: null,
  })

  const [lineItemsActive, setLineItemsActive] = useState(false)

  const handleFormDataChange = (newFormData: typeof formData) => {
    setFormData(newFormData)
  }

  const policyStyle =
    formData.policyType === 'subscription'
      ? 'border-l-subscription-600'
      : formData.policyType === 'milestone'
      ? 'border-l-milestone-600'
      : formData.policyType === 'payasyougo'
      ? 'border-l-payasyougo-600'
      : formData.policyType === 'onetime'
      ? 'border-l-onetime-600'
      : 'border-l-upto-600'

  return (
    <div className="w-full flex-1 bg-background font-sans">
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground font-mono">Payment Policy Setup</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Create a new recurring payment policy and get integration code.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto">
          <div className="w-full md:w-1/2">
            <div className={`border-l-4 ${policyStyle} pl-4`}>
              <PaymentPolicyForm
                formData={formData}
                onFormDataChange={handleFormDataChange}
                lineItemsActive={lineItemsActive}
              />
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <IntegrationCode formData={formData} onLineItemsActive={setLineItemsActive} />
          </div>
        </div>
      </div>
    </div>
  )
}
