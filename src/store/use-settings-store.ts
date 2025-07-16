import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface SettingsState {
  appName: string
  appDescription: string
  isAllowRegistration: boolean
  isLoading: boolean
  fetchSettings: () => Promise<void>
  setSettings: (settings: Partial<SettingsState>) => void
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set) => ({
        appName: 'MeetingSync',
        appDescription: 'Efficiently manage and schedule your Zoom meetings.',
        isAllowRegistration: true,
        isLoading: true,
        fetchSettings: async () => {
          try {
            set({ isLoading: true })
            const response = await fetch('/api/settings')
            const data = await response.json()
            set({
              appName: data.appName,
              appDescription: data.appDescription,
              isAllowRegistration: data.allowRegistration,
              isLoading: false,
            })
          } catch (error) {
            console.error('Failed to fetch settings:', error)
            set({ isLoading: false })
          }
        },
        setSettings: (settings) => set(settings),
      }),
      {
        name: 'settings-storage',
      },
    ),
  ),
)
