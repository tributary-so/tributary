import PaymentPolicyForm from './payment-policy-form'

export default function PaymentPolicyFeature() {
  return (
    <div 
      style={{
        width: '100%',
        backgroundColor: '#fff',
        fontFamily: 'var(--font-primary)',
        flex: 1,
      }}
    >
      <div className="max-w-[1440px] mx-auto px-[40px]">
        <PaymentPolicyForm />
      </div>
    </div>
  )
}