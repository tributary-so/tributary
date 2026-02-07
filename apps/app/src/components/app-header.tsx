import { useState, useEffect, useRef } from 'react'
import { WalletButton } from '@/components/solana/solana-provider'
import { Link, useNavigate } from 'react-router'
import { useWallet } from '@solana/wallet-adapter-react'
import { BorderedContainer } from '@/components/ui/bordered-container'
import { ClusterUiSelect } from './cluster/cluster-ui'

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AppHeader() {
  const { connected } = useWallet()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPresentationsOpen, setIsPresentationsOpen] = useState(false)
  const [isMobilePresentationsOpen, setIsMobilePresentationsOpen] = useState(false)
  const presentationsRef = useRef<HTMLDivElement>(null)
  const mobilePresentationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (presentationsRef.current && !presentationsRef.current.contains(event.target as Node)) {
        setIsPresentationsOpen(false)
      }
      if (mobilePresentationsRef.current && !mobilePresentationsRef.current.contains(event.target as Node)) {
        setIsMobilePresentationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNavClick = (path: string) => {
    navigate(path)
    setIsMenuOpen(false)
    setIsPresentationsOpen(false)
    setIsMobilePresentationsOpen(false)
  }

  const buttonClass =
    'flex items-center justify-center gap-2 px-3 py-1.5 border border-[var(--color-primary)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-all duration-200 cursor-pointer uppercase text-sm'

  const dropdownItemClass =
    'w-full text-left px-3 py-2 hover:bg-[var(--color-primary)] hover:text-white transition-all duration-200 cursor-pointer uppercase text-sm'

  return (
    <div className="relative z-50 pt-[2px] sm:pt-[23px]" style={{ fontFamily: 'var(--font-primary)' }}>
      <BorderedContainer
        borderSides={['top', 'right', 'left']}
        className="relative flex items-center justify-between"
        style={{
          height: '40px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
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

        <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-2">
            <div ref={presentationsRef} className="relative">
              <button
                onClick={() => setIsPresentationsOpen(!isPresentationsOpen)}
                className={`${buttonClass} bg-warning-300 text-black`}
                style={{ fontFamily: 'var(--font-secondary)' }}
                aria-expanded={isPresentationsOpen}
                aria-haspopup="true"
              >
                Hackathons
                <ChevronDown
                  className={`transition-transform duration-200 ${isPresentationsOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isPresentationsOpen && (
                <div
                  className="absolute top-full left-0 mt-1 min-w-full bg-white border border-[var(--color-primary)] rounded shadow-lg z-50"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <button
                    onClick={() => handleNavClick('/hackathon')}
                    className={dropdownItemClass}
                    style={{ fontFamily: 'var(--font-secondary)' }}
                    role="menuitem"
                  >
                    Cypherpunk
                  </button>
                  <button
                    onClick={() => handleNavClick('/x402')}
                    className={dropdownItemClass}
                    style={{ fontFamily: 'var(--font-secondary)' }}
                    role="menuitem"
                  >
                    x402
                  </button>
                </div>
              )}
            </div>
            <a
              type="button"
              target="_blank"
              rel="noopener noreferrer"
              href="https://docs.tributary.so/"
              className={buttonClass}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Docs
            </a>
            <button
              onClick={() => handleNavClick('/referral')}
              className={buttonClass}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Referral Program
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

        <div className="hidden md:flex items-center gap-2">
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
          <ClusterUiSelect />
        </div>

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

      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-[3px] right-[3px] bg-white border border-[var(--color-primary)] border-t-0 z-40">
          <div className="flex flex-col p-4 gap-2">
            <div ref={mobilePresentationsRef} className="relative">
              <button
                onClick={() => setIsMobilePresentationsOpen(!isMobilePresentationsOpen)}
                className={`${buttonClass} bg-warning-300 text-black w-full justify-between`}
                style={{ fontFamily: 'var(--font-secondary)' }}
                aria-expanded={isMobilePresentationsOpen}
                aria-haspopup="true"
              >
                Hackathons
                <ChevronDown
                  className={`transition-transform duration-200 ${isMobilePresentationsOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isMobilePresentationsOpen && (
                <div
                  className="mt-1 bg-white border border-[var(--color-primary)] rounded"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <button
                    onClick={() => handleNavClick('/hackathon')}
                    className={`${dropdownItemClass} justify-start`}
                    style={{ fontFamily: 'var(--font-secondary)' }}
                    role="menuitem"
                  >
                    Cypherpunk
                  </button>
                  <button
                    onClick={() => handleNavClick('/x402')}
                    className={`${dropdownItemClass} justify-start`}
                    style={{ fontFamily: 'var(--font-secondary)' }}
                    role="menuitem"
                  >
                    x402
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => handleNavClick('/docs')}
              className={`${buttonClass} w-full justify-start`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Docs
            </button>
            <button
              onClick={() => handleNavClick('/referral')}
              className={`${buttonClass} w-full justify-start`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              Referral Program
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
