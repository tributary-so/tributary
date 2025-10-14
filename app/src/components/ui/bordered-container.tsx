import React from 'react'

interface BorderedContainerProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  borderSides?: ('top' | 'right' | 'bottom' | 'left')[]
  fillHeight?: boolean
}

export function BorderedContainer({
  children,
  className = '',
  style = {},
  borderSides = ['top', 'right', 'bottom', 'left'],
  fillHeight = false,
}: BorderedContainerProps) {
  const borderClasses = borderSides.map((side) => `border-${side.slice(0, 1)}`).join(' ')

  return (
    <div className="w-full" style={fillHeight ? { flex: 1, display: 'flex', flexDirection: 'column' } : {}}>
      <div className="px-[40px]" style={fillHeight ? { flex: 1, display: 'flex', flexDirection: 'column' } : {}}>
        <div className={`${borderClasses} border-[var(--color-primary)] ${className}`} style={style}>
          {children}
        </div>
      </div>
    </div>
  )
}
