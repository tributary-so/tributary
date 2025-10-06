import PaymentGatewayForm from './payment-gateway-form'
import { PaymentGatewayList } from './payment-gateway-list'

export default function GatewayFeature() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <PaymentGatewayForm />
        <PaymentGatewayList />
      </div>
    </div>
  )
}
