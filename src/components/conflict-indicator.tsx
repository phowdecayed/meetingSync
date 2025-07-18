'use client'

import { AlertTriangle, Clock, Users, MapPin } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConflictInfo {
  type: 'overlap' | 'room_unavailable' | 'participant_busy'
  severity: 'warning' | 'error'
  message: string
  suggestions?: string[]
  conflictingMeetings?: Array<{
    title: string
    time: string
    participants?: string[]
    room?: string
  }>
}

interface ConflictIndicatorProps {
  conflicts: ConflictInfo[]
  className?: string
  onSuggestionClick?: (suggestion: string) => void
}

const conflictIcons = {
  overlap: Clock,
  room_unavailable: MapPin,
  participant_busy: Users,
}

const severityStyles = {
  warning: {
    container: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  error: {
    container: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
}

export function ConflictIndicator({ 
  conflicts, 
  className,
  onSuggestionClick 
}: ConflictIndicatorProps) {
  if (!conflicts.length) return null

  const hasErrors = conflicts.some(c => c.severity === 'error')
  const hasWarnings = conflicts.some(c => c.severity === 'warning')

  return (
    <div className={cn('space-y-3', className)}>
      {conflicts.map((conflict, index) => {
        const Icon = conflictIcons[conflict.type]
        const styles = severityStyles[conflict.severity]
        
        return (
          <Alert key={index} className={cn('transition-all duration-200', styles.container)}>
            <Icon className={cn('h-4 w-4', styles.icon)} />
            <AlertDescription className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{conflict.message}</p>
                  
                  {conflict.conflictingMeetings && conflict.conflictingMeetings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-muted-foreground">Conflicting meetings:</p>
                      {conflict.conflictingMeetings.map((meeting, idx) => (
                        <div key={idx} className="text-sm bg-background/50 rounded p-2 border">
                          <div className="font-medium">{meeting.title}</div>
                          <div className="text-muted-foreground">{meeting.time}</div>
                          {meeting.participants && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Participants: {meeting.participants.join(', ')}
                            </div>
                          )}
                          {meeting.room && (
                            <div className="text-xs text-muted-foreground">
                              Room: {meeting.room}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <Badge variant="secondary" className={styles.badge}>
                  {conflict.severity === 'error' ? 'Blocking' : 'Warning'}
                </Badge>
              </div>
              
              {conflict.suggestions && conflict.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {conflict.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onSuggestionClick?.(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )
      })}
      
      {(hasErrors || hasWarnings) && (
        <div className="text-xs text-muted-foreground">
          {hasErrors && (
            <span className="text-red-600 dark:text-red-400">
              ⚠ Blocking issues must be resolved before saving
            </span>
          )}
          {hasErrors && hasWarnings && ' • '}
          {hasWarnings && !hasErrors && (
            <span className="text-amber-600 dark:text-amber-400">
              ⚠ Warnings can be ignored but may affect meeting quality
            </span>
          )}
        </div>
      )}
    </div>
  )
}