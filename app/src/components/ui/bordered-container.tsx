import React from 'react'

type BorderSide = 'top' | 'right' | 'bottom' | 'left'
interface BorderedContainerProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  borderSides?: BorderSide[]
  fillHeight?: boolean
}

export function BorderedContainer({
  children,
  className = '',
  style = {},
  borderSides = ['top', 'right', 'bottom', 'left'],
  fillHeight = false,
}: BorderedContainerProps) {
  const borderClasses = borderSides.map((side) => `border-${side.slice(0, 1)}-1`).join(' ')
  const antiBorderClasses = (['top', 'right', 'bottom', 'left'] as BorderSide[])
    .filter((side) => !borderSides.includes(side))
    .map((side) => `border-${side.slice(0, 1)}-0`)
    .join(' ')

  return (
    <div className="w-full" style={fillHeight ? { flex: 1, display: 'flex', flexDirection: 'column' } : {}}>
      <div
        className="px-[3px] sm:px-[40px]"
        style={fillHeight ? { flex: 1, display: 'flex', flexDirection: 'column' } : {}}
      >
        <div
          className={`border border-1 ${borderClasses} ${antiBorderClasses} border-primary ${className}`}
          style={style}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
