import ReferralProgramExplainer from './ReferralProgramExplainer'
import ReferralAccountForm from './referral-account-form'

export default function ReferralProgramPage() {
  return (
    <div className="min-h-screen bg-lando-bg py-12 px-4">
      <div className="space-y-16">
        <ReferralProgramExplainer />
        <div className="flex justify-center">
          <ReferralAccountForm />
        </div>
      </div>
    </div>
  )
}
