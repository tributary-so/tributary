import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import React from 'react'

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
          {children}
        </main>
        <AppFooter />
      </div>
      <Toaster />
    </ThemeProvider>
  )
}