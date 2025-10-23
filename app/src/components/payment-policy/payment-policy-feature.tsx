import { useState } from 'react'
import PaymentPolicyForm, { PaymentPolicyFormData } from './payment-policy-form'
import IntegrationCode from './integration-code'

export default function PaymentPolicyFeature() {
  const [formData, setFormData] = useState<PaymentPolicyFormData>({
    tokenMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    recipient: '',
    gateway: '',
    amount: '',
    intervalSeconds: '2592000',
    memo: '',
    frequency: 'monthly',
    autoRenew: true,
    approvalAmount: '',
  })

  const handleFormDataChange = (newFormData: typeof formData) => {
    setFormData(newFormData)
  }

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#fff',
        fontFamily: 'var(--font-primary)',
        flex: 1,
      }}
    >
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-secondary)' }}>
            Payment Policy Setup
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4 max-w-6xl mx-auto">
          <div className="w-full md:w-1/2">
            <PaymentPolicyForm formData={formData} onFormDataChange={handleFormDataChange} />
          </div>
          <div className="relative w-full md:w-1/2">
            <IntegrationCode formData={formData} />
          </div>
        </div>
      </div>
    </div>
  )
}
