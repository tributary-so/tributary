import PaymentPolicyForm from './payment-policy-form'

export default function PaymentPolicyFeature() {
  return (
    <div 
      style={{
        width: '100%',
        backgroundColor: '#fff',
        fontFamily: 'var(--font-primary)',
        paddingTop: '40px',
        paddingBottom: '40px',
        flex: 1,
      }}
    >
      <div className="max-w-[1440px] mx-auto px-[40px]">
        <PaymentPolicyForm />
      </div>
    </div>
  )
}