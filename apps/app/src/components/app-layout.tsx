import React from 'react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-grow" style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </main>
  )
}
