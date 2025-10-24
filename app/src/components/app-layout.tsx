import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import React from 'react'
import { BorderedContainer } from './ui/bordered-container'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <div
        className="flex flex-col"
        style={{
          minHeight: '100vh',
          backgroundColor: '#fff',
        }}
      >
        <AppHeader />
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
              className="flex flex-1 justify-center p-3 sm:p-6"
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
