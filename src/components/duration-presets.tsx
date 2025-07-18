'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DurationPresetsProps {
  value: number
  onChange: (duration: number) => void
  className?: string
}

const DURATION_PRESETS = [
  { label: '15min', value: 15 },
  { label: '30min', value: 30 },
  { label: '1hr', value: 60 },
  { label: '2hr', value: 120 },
]

export function DurationPresets({
  value,
  onChange,
  className,
}: DurationPresetsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {DURATION_PRESETS.map((preset) => (
        <Button
          key={preset.value}
          type="button"
          variant={value === preset.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(preset.value)}
          className={cn(
            'transition-all duration-200 hover:scale-105',
            'h-auto px-3 py-1.5 text-xs font-medium',
            value === preset.value && 'ring-primary/20 shadow-md ring-2',
          )}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
