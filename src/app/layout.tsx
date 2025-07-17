import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'
import NextAuthSessionProvider from '@/components/auth/session-provider'
import prisma from '@/lib/prisma'
import SettingsStoreInitializer from '@/components/settings-store-initializer'
import { Settings } from '@prisma/client'

async function getSettings(): Promise<Settings | null> {
  try {
    const settings = await prisma.settings.findFirst()
    return settings
  } catch (error) {
    console.error('Failed to fetch settings, using default values:', error)
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()

  return {
    title: settings?.appName ?? 'MeetingSync',
    description:
      settings?.appDescription ??
      'Efficiently manage and schedule your Zoom meetings.',
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const settings = await getSettings()
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <SettingsStoreInitializer
          appName={settings?.appName ?? 'MeetingSync'}
          appDescription={
            settings?.appDescription ??
            'Efficiently manage and schedule your Zoom meetings.'
          }
          isAllowRegistration={settings?.allowRegistration ?? true}
        />
        <NextAuthSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  )
}
