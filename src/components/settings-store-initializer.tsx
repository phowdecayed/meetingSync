'use client'

import { useRef } from 'react'
import { useSettingsStore } from '@/store/use-settings-store'

function SettingsStoreInitializer({
  appName,
  appDescription,
  isAllowRegistration,
}: {
  appName: string
  appDescription: string
  isAllowRegistration: boolean
}) {
  const initialized = useRef(false)
  if (!initialized.current) {
    useSettingsStore.setState({
      appName,
      appDescription,
      isAllowRegistration,
      isLoading: false,
    })
    initialized.current = true
  }
  return null
}

export default SettingsStoreInitializer
