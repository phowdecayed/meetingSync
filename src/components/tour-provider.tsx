'use client'

import React, { useEffect } from 'react'
import Joyride, { Step, STATUS, CallBackProps } from 'react-joyride'
import { useTourStore } from '@/store/use-tour-store'
import { useTheme } from 'next-themes'

const tourSteps: Step[] = [
  {
    target: 'main[role="main"]',
    content:
      'Selamat datang di MeetingSync! Ini adalah dasbor utama Anda tempat Anda dapat melihat ringkasan aktivitas Anda.',
    disableBeacon: true,
    placement: 'center',
  },
  {
    target: 'div[data-slot="sidebar"]',
    content:
      'Gunakan bilah sisi untuk menavigasi di antara berbagai bagian aplikasi, seperti rapat, jadwal Anda, dan pengaturan.',
    placement: 'right',
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
  const [runDelayed, setRunDelayed] = React.useState(false)

  useEffect(() => {
    setIsMounted(true)
    setSteps(tourSteps)
  }, [setSteps])

  useEffect(() => {
    if (run && isMounted) {
      // When the store wants to run the tour, wait a bit for the UI to settle
      const timer = setTimeout(() => {
        setRunDelayed(true)
      }, 500) // A generous 500ms delay

      return () => clearTimeout(timer)
    }
  }, [run, isMounted])

  const handleLocalCallback = (data: CallBackProps) => {
    const { status } = data
    handleJoyrideCallback(data) // Pass data to the store's handler

    // When the tour is over, reset our local state
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunDelayed(false)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <Joyride
      run={runDelayed}
      stepIndex={stepIndex}
      steps={tourSteps}
      callback={handleLocalCallback}
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