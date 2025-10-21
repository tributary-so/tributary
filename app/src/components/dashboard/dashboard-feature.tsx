import { useLocation } from 'react-router'
import { useState, useEffect } from 'react'

export default function DashboardFeature() {
  const location = useLocation()
  const [content, setContent] = useState('home')

  useEffect(() => {
    if (location.pathname === '/about') {
      setContent('about')
    } else if (location.pathname === '/demo') {
      setContent('demo')
    } else if (location.pathname === '/docs') {
      setContent('docs')
    } else {
      setContent('home')
    }
  }, [location.pathname])

  const solanaLinks = [
    { label: 'Solana Docs', href: 'https://docs.solana.com/' },
    { label: 'Solana Cookbook', href: 'https://solana.com/developers/cookbook/' },
    { label: 'Solana Faucet', href: 'https://faucet.solana.com/' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '2rem',
      }}
    >
      {content === 'home' && (
        <div
          style={{
            fontSize: '32px',
            lineHeight: '38px',
            fontFamily: 'var(--font-secondary)',
            textAlign: 'center',
            maxWidth: '372px',
          }}
        >
          <p style={{ margin: 0 }}>Accept and manage crypto subscriptions</p>
          <p style={{ margin: 0 }}>in minutes</p>
        </div>
      )}

      {content === 'about' && (
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: '32px',
              fontFamily: 'var(--font-secondary)',
              marginBottom: '24px',
              color: 'var(--color-primary)',
            }}
          >
            About Tributary
          </h2>

          <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '32px' }}>
            Enable truly automated recurring payments on Solana. Users sign once, payments flow seamlessly.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              textAlign: 'left',
            }}
          >
            <div style={{ padding: '16px', background: '#f5f7f7', borderRadius: '8px' }}>
              <strong>SaaS Platforms</strong>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>Software subscriptions</p>
            </div>

            <div style={{ padding: '16px', background: '#f5f7f7', borderRadius: '8px' }}>
              <strong>Content Creators</strong>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>Fan subscriptions</p>
            </div>

            <div style={{ padding: '16px', background: '#f5f7f7', borderRadius: '8px' }}>
              <strong>DeFi Protocols</strong>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>Strategy fees</p>
            </div>

            <div style={{ padding: '16px', background: '#f5f7f7', borderRadius: '8px' }}>
              <strong>E-commerce</strong>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>Product subscriptions</p>
            </div>
          </div>
        </div>
      )}

      {content === 'demo' && (
        <div style={{ maxWidth: '700px' }}>
          <h2
            style={{
              fontSize: '32px',
              fontFamily: 'var(--font-secondary)',
              marginBottom: '24px',
              color: 'var(--color-primary)',
              textAlign: 'center',
            }}
          >
            Quick Demo
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>Quick Start</h3>
              <pre
                style={{
                  background: '#1a1d29',
                  color: '#7ee787',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  overflow: 'auto',
                  margin: 0,
                }}
              >
                {`npm install @tributary/sdk

const tributary = new Tributary({
  connection: new Connection(RPC),
  wallet: userWallet
});

const sub = await tributary
  .createSubscription({
    amount: new BN(5_000_000),
    interval: PaymentInterval.Monthly,
    recipient: 'wallet-address'
  });`}
              </pre>
            </div>

            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>Key Features</h3>
              <div
                style={{
                  background: '#f5f7f7',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: '1.8',
                }}
              >
                <div style={{ marginBottom: '8px' }}>✓ Full TypeScript support</div>
                <div style={{ marginBottom: '8px' }}>✓ Open source & auditable</div>
                <div style={{ marginBottom: '8px' }}>✓ Real-time webhooks</div>
                <div>✓ Analytics dashboard</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {content === 'docs' && (
        <div style={{ maxWidth: '500px', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: '32px',
              fontFamily: 'var(--font-secondary)',
              marginBottom: '24px',
              color: 'var(--color-primary)',
            }}
          >
            Documentation
          </h2>

          <div
            style={{
              background: '#f5f7f7',
              padding: '24px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <p style={{ fontSize: '16px', margin: 0 }}>Comprehensive docs coming soon!</p>
          </div>

          <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>Get started with Solana:</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {solanaLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'white',
                  border: '1px solid var(--color-primary)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'inherit',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary)'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.color = 'inherit'
                }}
              >
                {link.label}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6L9 6M9 6L6 3M9 6L6 9" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
