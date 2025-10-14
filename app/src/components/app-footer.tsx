export function AppFooter() {
  return (
    <div 
      className="w-full"
      style={{
        fontFamily: 'var(--font-primary)',
        marginTop: 'auto',
        marginBottom: '21px',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-[40px]">
        <div 
          className="border-r border-b border-l flex items-center justify-between"
          style={{
            borderColor: 'var(--color-primary)',
            boxSizing: 'border-box',
            height: '40px',
            fontSize: '14px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          {/* Copyright */}
          <div style={{ textTransform: 'uppercase' }}>
            ( 2025 TRIBUTARY ALL RIGHTS RESERVED )
          </div>
          
          {/* Legal Section */}
          <div className="flex items-center gap-2">
            <div style={{ textTransform: 'uppercase' }}>( LEGAL</div>
            <a 
              href="#" 
              className="relative cursor-pointer group"
              style={{ textTransform: 'uppercase' }}
            >
              TERMS OF USE
              <span 
                className="absolute bottom-[-2px] left-0 h-[1px] w-0 bg-[var(--color-primary)] transition-all duration-300 group-hover:w-full"
              />
            </a>
            <div>/</div>
            <a 
              href="#" 
              className="relative cursor-pointer group"
              style={{ textTransform: 'uppercase' }}
            >
              PRIVACY POLICY
              <span 
                className="absolute bottom-[-2px] left-0 h-[1px] w-0 bg-[var(--color-primary)] transition-all duration-300 group-hover:w-full"
              />
            </a>
            <div style={{ textTransform: 'uppercase' }}>)</div>
          </div>

          {/* Social Section */}
          <div className="flex items-center gap-2">
            <div style={{ textTransform: 'uppercase' }}>( SOCIAL</div>
            <a 
              href="https://twitter.com" 
              target="_blank"
              rel="noopener noreferrer"
              className="relative cursor-pointer group"
              style={{ textTransform: 'uppercase' }}
            >
              X
              <span 
                className="absolute bottom-[-2px] left-0 h-[1px] w-0 bg-[var(--color-primary)] transition-all duration-300 group-hover:w-full"
              />
            </a>
            <div>/</div>
            <a 
              href="#" 
              className="relative cursor-pointer group"
              style={{ textTransform: 'uppercase' }}
            >
              COLOSSEUM
              <span 
                className="absolute bottom-[-2px] left-0 h-[1px] w-0 bg-[var(--color-primary)] transition-all duration-300 group-hover:w-full"
              />
            </a>
            <div style={{ textTransform: 'uppercase' }}>)</div>
          </div>
        </div>
      </div>
    </div>
  )
}