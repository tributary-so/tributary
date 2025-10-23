import { useState } from 'react'
import { WalletButton } from '@/components/solana/solana-provider'
import { Link, useNavigate } from 'react-router'
import { useWallet } from '@solana/wallet-adapter-react'
import { BorderedContainer } from '@/components/ui/bordered-container'

export function AppHeader() {
  const { connected } = useWallet()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleNavClick = (path: string) => {
    navigate(path)
    setIsMenuOpen(false)
  }

  const buttonClass =
    'flex items-center justify-center gap-2 px-3 py-1.5 border border-[var(--color-primary)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-all duration-200 cursor-pointer uppercase text-sm'

  return (
    <div className="relative z-50 pt-[3px] sm:pt-[20px]" style={{ fontFamily: 'var(--font-primary)' }}>
      <BorderedContainer
        borderSides={['top', 'right', 'left']}
        className="relative flex items-center justify-between"
        style={{
          height: '40px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        {/* Logo - Left */}
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <div
            className="rounded-full"
            style={{
              height: '10px',
              width: '10px',
              backgroundColor: 'var(--color-primary)',
            }}
          />
          <div
            style={{
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              fontSize: '14px',
            }}
          >
            Tributary
          </div>
        </Link>

        {/* Center Section */}
        <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavClick('/hackathon')}
              className={`${buttonClass} bg-warning-300 text-black`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Hackathon
            </button>
            <button
              onClick={() => handleNavClick('/about')}
              className={buttonClass}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              About
            </button>
            <button
              onClick={() => handleNavClick('/docs')}
              className={buttonClass}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Docs
            </button>
            <button
              onClick={() => handleNavClick('/quickstart')}
              className={`${buttonClass} bg-primary text-white`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Quick Start
            </button>
          </div>
        </div>

        {/* Right Section - Desktop */}
        <div className="hidden md:flex items-center gap-2">
          {/* Wallet/Dashboard/Account Button */}
          {!connected ? (
            <WalletButton />
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/account')}
                className={buttonClass}
                style={{ fontFamily: 'var(--font-secondary)', fontSize: '13px' }}
              >
                Dashboard
              </button>
              <WalletButton />
            </div>
          )}
        </div>

        {/* Burger Menu - Mobile */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col justify-center items-center w-8 h-8"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-current transition-transform duration-200 ${
              isMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-0.5'
            }`}
          ></span>
          <span
            className={`block w-5 h-0.5 bg-current transition-opacity duration-200 ${
              isMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          ></span>
          <span
            className={`block w-5 h-0.5 bg-current transition-transform duration-200 ${
              isMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'
            }`}
          ></span>
        </button>
      </BorderedContainer>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border border-[var(--color-primary)] border-t-0 z-40">
          <div className="flex flex-col p-4 gap-2">
            <button
              onClick={() => handleNavClick('/hackathon')}
              className={`${buttonClass} bg-warning-300 text-black w-full justify-start`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Hackathon
            </button>
            <button
              onClick={() => handleNavClick('/about')}
              className={`${buttonClass} w-full justify-start`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              About
            </button>
            <button
              onClick={() => handleNavClick('/docs')}
              className={`${buttonClass} w-full justify-start`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Docs
            </button>
            <button
              onClick={() => handleNavClick('/quickstart')}
              className={`${buttonClass} bg-primary text-white w-full justify-start`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Quick Start
            </button>
            <div className="border-t border-[var(--color-primary)] pt-2 mt-2">
              {!connected ? (
                <WalletButton />
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleNavClick('/account')}
                    className={`${buttonClass} w-full justify-start`}
                    style={{ fontFamily: 'var(--font-secondary)', fontSize: '13px' }}
                  >
                    Dashboard
                  </button>
                  <WalletButton />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
