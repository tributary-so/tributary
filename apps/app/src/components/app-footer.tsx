import { BorderedContainer } from '@/components/ui/bordered-container'

export function AppFooter() {
  return (
    <div className="pb-[3px] sm:pb-[23px]">
      <BorderedContainer
        borderSides={['right', 'bottom', 'left']}
        className="flex flex-col md:flex-row items-center justify-center md:justify-between"
        style={{
          boxSizing: 'border-box',
          minHeight: '40px',
          fontSize: '12px',
          padding: '8px 16px',
        }}
      >
        {/* Copyright */}
        <div className="text-center md:text-left uppercase">(2025 TRIBUTARY ALL RIGHTS RESERVED)</div>

        {/* Legal Section */}
        {/* <div className="flex items-center justify-center gap-2 mt-2 md:mt-0"> */}
        {/*   <div style={{ textTransform: 'uppercase' }}>( LEGAL</div> */}
        {/*   <a href="#" className="relative cursor-pointer group uppercase"> */}
        {/*     TERMS OF USE */}
        {/*     <span className="absolute bottom-[-2px] left-0 h-[1px] w-0 bg-[var(--color-primary)] transition-all duration-300 group-hover:w-full" /> */}
        {/*   </a> */}
        {/*   <div>/</div> */}
        {/*   <a href="#" className="relative cursor-pointer group uppercase"> */}
        {/*     PRIVACY POLICY */}
        {/*     <span className="absolute bottom-[-2px] left-0 h-[1px] w-0 bg-[var(--color-primary)] transition-all duration-300 group-hover:w-full" /> */}
        {/*   </a> */}
        {/*   <div style={{ textTransform: 'uppercase' }}>)</div> */}
        {/* </div> */}

        {/* Social Section */}
        <div className="flex items-center justify-center gap-2 mt-2 md:mt-0">
          <div>(</div>
          <a
            href="https://x.com/tributaryso"
            target="_blank"
            rel="noopener noreferrer"
            className="relative cursor-pointer group uppercase"
          >
            X
            <span className="absolute bottom-[-2px] left-0 h-[1px] w-0 bg-[var(--color-primary)] transition-all duration-300 group-hover:w-full" />
          </a>
          <div>/</div>
          <a
            href="https://t.me/tributary_so"
            target="_blank"
            rel="noopener noreferrer"
            className="relative cursor-pointer group uppercase"
          >
            Telegram
            <span className="absolute bottom-[-2px] left-0 h-[1px] w-0 bg-[var(--color-primary)] transition-all duration-300 group-hover:w-full" />
          </a>
          <div>/</div>
          <a
            href="https://arena.colosseum.org/projects/explore/tributary-1"
            className="relative cursor-pointer group uppercase"
          >
            COLOSSEUM
            <span className="absolute bottom-[-2px] left-0 h-[1px] w-0 bg-[var(--color-primary)] transition-all duration-300 group-hover:w-full" />
          </a>
          <div>)</div>
        </div>
      </BorderedContainer>
    </div>
  )
}
