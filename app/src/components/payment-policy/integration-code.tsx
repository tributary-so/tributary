import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { PaymentPolicyFormProps } from './payment-policy-form'

export default function IntegrationCode({ formData }: PaymentPolicyFormProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [buttonHtml, setButtonHtml] = useState(
    '<button class="tributary-subscribe-btn" data-policy-id="your_policy_id">Subscribe Now</button>',
  )
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

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(type)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="max-w-[700px] space-y-4">
      <p className="text-sm text-gray-600">
        Edit the HTML and CSS below. The button preview updates in real-time. The JavaScript code reflects your form
        configuration.
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
  )
}
