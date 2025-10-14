import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import React from 'react'
import { BorderedContainer } from './ui/bordered-container'

export function AppLayout({
  children,
  links,
}: {
  children: React.ReactNode
  links: { label: string; path: string }[]
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <div
        className="flex flex-col"
        style={{
          minHeight: '100vh',
          backgroundColor: '#fff',
        }}
      >
        <AppHeader links={links} />
        <main className="flex-grow" style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <BorderedContainer
              borderSides={['right', 'left']}
              className="flex justify-center"
              style={{
                padding: '32px',
                flex: 1,
              }}
              fillHeight={true}
            >
              {children}
            </BorderedContainer>
          </div>
        </main>
        <AppFooter />
      </div>
      <Toaster />
    </ThemeProvider>
  )
}

