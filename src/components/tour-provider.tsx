'use client'

import React, { useEffect, useState } from 'react'
import Joyride, { Step, STATUS, CallBackProps } from 'react-joyride'
import { useTourStore } from '@/store/use-tour-store'
import { useTheme } from 'next-themes'
import { useSettingsStore } from '@/store/use-settings-store'

export function TourProvider() {
  const { run, stepIndex, steps, handleJoyrideCallback, setSteps } =
    useTourStore()
  const { theme } = useTheme()
  const { appName } = useSettingsStore()
  const [isMounted, setIsMounted] = useState(false)
  const [runDelayed, setRunDelayed] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (appName) {
      const tourSteps: Step[] = [
        {
          target: 'main[role="main"]',
          content: `Selamat datang di ${appName}! Ini adalah dasbor utama Anda tempat Anda dapat melihat ringkasan aktivitas Anda.`,
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
      setSteps(tourSteps)
    }
  }, [appName, setSteps])

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
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
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
      steps={steps}
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
