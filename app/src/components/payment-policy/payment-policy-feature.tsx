import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import PaymentPolicyForm from './payment-policy-form'

export default function PaymentPolicyFeature() {
  const [selectedFilter, setSelectedFilter] = useState('Form')
  const [showDropdown, setShowDropdown] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [buttonHtml, setButtonHtml] = useState(
    '<button class="tributary-subscribe-btn" data-policy-id="your_policy_id">Subscribe Now</button>',
  )
  const [buttonCss, setButtonCss] = useState(`.tributary-subscribe-btn {
  padding: 8px 16px;
  border: 1px solid #000970;
  border-radius: 4px;
  background: transparent;
  color: #000970;
  font-family: 'Denim', sans-serif;
  font-size: 14px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tributary-subscribe-btn:hover {
  background: #000970;
  color: white;
}`)

  const filterOptions = [
    { label: 'Form', value: 'form' },
    { label: 'Integration Code', value: 'integration' },
  ]

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(type)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Get form data from localStorage or use defaults for integration code
  const getFormData = () => {
    try {
      const stored = localStorage.getItem('payment-policy-form-data')
      return stored
        ? JSON.parse(stored)
        : {
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
          }
    } catch {
      return {
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
      }
    }
  }

  const formData = getFormData()

  const jsCode = `<script src="https://cdn.tributary.io/v1/tributary.js"></script>
<script>
  Tributary.init({
    tokenMint: '${formData.tokenMint}',
    recipient: '${formData.recipient}',
    gateway: '${formData.gateway}',
    amount: '${formData.amount}',
    intervalSeconds: ${formData.intervalSeconds},
    memo: '${formData.memo}',
    frequency: '${formData.frequency}',
    autoRenew: ${formData.autoRenew},
    maxRenewals: ${formData.maxRenewals || 'null'},
    approvalAmount: '${formData.approvalAmount}',
    network: 'mainnet'
  })
</script>`

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
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-secondary)' }}>
                Payment Policy Setup
              </h2>
              <p className="text-sm text-gray-600">Create a new recurring payment policy and get integration code.</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded cursor-pointer border border-[var(--color-primary)]"
              >
                {selectedFilter}
                <svg className="w-3 h-3" viewBox="0 0 8 8" fill="currentColor">
                  <path d="M0 2L4 6L8 2" />
                </svg>
              </button>
              {showDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-[180px] z-50">
                  {filterOptions.map((option) => (
                    <div
                      key={option.value}
                      className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50"
                      style={{
                        backgroundColor: selectedFilter === option.label ? '#edefef' : 'transparent',
                        fontWeight: selectedFilter === option.label ? 600 : 400,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFilter(option.label)
                        setShowDropdown(false)
                      }}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedFilter === 'Form' && <PaymentPolicyForm />}

        {selectedFilter === 'Integration Code' && (
          <div className="max-w-[700px] space-y-4">
            <p className="text-sm text-gray-600">
              Edit the HTML and CSS below. The button preview updates in real-time. The JavaScript code reflects your
              form configuration.
            </p>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-xs uppercase font-semibold mb-2 text-gray-600">Preview</p>
              <div className="flex items-center justify-center p-4 bg-white border border-gray-200 rounded">
                <div dangerouslySetInnerHTML={{ __html: `<style>${buttonCss}</style>${buttonHtml}` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-t">
                <span className="text-xs font-semibold uppercase text-gray-600">HTML</span>
                <button
                  onClick={() => copyCode(buttonHtml, 'html')}
                  className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-200 transition-colors"
                  style={{ borderColor: 'var(--color-primary)' }}
                >
                  {copiedCode === 'html' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={buttonHtml}
                onChange={(e) => setButtonHtml(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-t-0 border-gray-200 rounded-b text-xs resize-none focus:outline-none"
                rows={3}
              />
            </div>

            <div>
              <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-t">
                <span className="text-xs font-semibold uppercase text-gray-600">CSS</span>
                <button
                  onClick={() => copyCode(buttonCss, 'css')}
                  className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-200 transition-colors"
                  style={{ borderColor: 'var(--color-primary)' }}
                >
                  {copiedCode === 'css' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={buttonCss}
                onChange={(e) => setButtonCss(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-t-0 border-gray-200 rounded-b text-xs resize-none focus:outline-none"
                rows={12}
              />
            </div>

            <div>
              <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-t">
                <span className="text-xs font-semibold uppercase text-gray-600">JavaScript</span>
                <button
                  onClick={() => copyCode(jsCode, 'js')}
                  className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-200 transition-colors"
                  style={{ borderColor: 'var(--color-primary)' }}
                >
                  {copiedCode === 'js' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 bg-gray-50 border border-t-0 border-gray-200 rounded-b overflow-x-auto text-xs">
                {jsCode}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
