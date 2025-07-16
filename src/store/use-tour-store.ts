'use client'

import { create } from 'zustand'
import { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride'

interface TourState {
  run: boolean
  steps: Step[]
  stepIndex: number
  startTour: () => void
  stopTour: () => void
  setSteps: (steps: Step[]) => void
  handleJoyrideCallback: (data: CallBackProps) => void
}

const TOUR_COMPLETED_KEY = 'tourCompleted'

export const useTourStore = create<TourState>((set, get) => ({
  run:
    typeof window !== 'undefined' && !localStorage.getItem(TOUR_COMPLETED_KEY),
  steps: [],
  stepIndex: 0,
  startTour: () => {
    set({ run: true, stepIndex: 0 })
  },
  stopTour: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true')
    }
    set({ run: false, stepIndex: 0 })
  },
  setSteps: (steps) => {
    set({ steps })
  },
  handleJoyrideCallback: (data: CallBackProps) => {
    const { action, index, status, type } = data
    const { run, stopTour } = get()

    if (!run) return

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTour()
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1)
      set({ stepIndex: nextStepIndex })
    }
  },
}))
