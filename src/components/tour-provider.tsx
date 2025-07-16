'use client'

import React, { useEffect } from 'react'
import Joyride, { Step } from 'react-joyride'
import { useTourStore } from '@/store/use-tour-store'
import { useTheme } from 'next-themes'

const tourSteps: Step[] = [
  {
    target: 'main[role="main"]',
    content:
      'Selamat datang di MeetingSync! Ini adalah dasbor utama Anda tempat Anda dapat melihat ringkasan aktivitas Anda.',
    disableBeacon: true,
  },
  {
    target: '[aria-label="Sidebar"]',
    content:
      'Gunakan bilah sisi untuk menavigasi di antara berbagai bagian aplikasi, seperti rapat, jadwal Anda, dan pengaturan.',
  },
  {
    target: '#new-meeting-button',
    content:
      'Anda dapat dengan cepat menjadwalkan pertemuan baru dari mana saja menggunakan tombol ini.',
  },
  {
    target: 'button[data-testid="user-avatar-button"]',
    content:
      'Akses profil Anda, keluar, atau mulai tur ini lagi dari menu pengguna.',
  },
]

export function TourProvider() {
  const { run, stepIndex, handleJoyrideCallback, setSteps } = useTourStore()
  const { theme } = useTheme()
  const [isMounted, setIsMounted] = React.useState(false)

  useEffect(() => {
    setIsMounted(true)
    setSteps(tourSteps)
  }, [setSteps])

  if (!isMounted) {
    return null
  }

  return (
    <Joyride
      run={run}
      stepIndex={stepIndex}
      steps={tourSteps}
      callback={handleJoyrideCallback}
      continuous
      showProgress
      showSkipButton
      locale={{
        last: 'Selesai',
        skip: 'Lewati',
        next: 'Lanjut',
        back: 'Kembali',
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#1E90FF', // DodgerBlue, a nice modern blue
          textColor: theme === 'dark' ? '#FFFFFF' : '#333333',
          arrowColor: theme === 'dark' ? '#333333' : '#FFFFFF',
          backgroundColor: theme === 'dark' ? '#333333' : '#FFFFFF',
        },
      }}
    />
  )
}
