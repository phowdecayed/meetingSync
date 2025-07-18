'use client'

import { AlertTriangle, Clock, Users, MapPin } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ConflictInfo, ConflictType } from '@/types/conflict-detection'

// Re-export for backward compatibility
export type { ConflictInfo }

interface ConflictIndicatorProps {
  conflicts: ConflictInfo[]
  className?: string
  onSuggestionClick?: (suggestion: string) => void
}

const conflictIcons = {
  [ConflictType.OVERLAP]: Clock,
  [ConflictType.ROOM_CONFLICT]: MapPin,
  [ConflictType.MISSING_ROOM]: MapPin,
  [ConflictType.INVALID_TYPE]: AlertTriangle,
  [ConflictType.ZOOM_CAPACITY]: Users,
  // Legacy support for old conflict types
  room_unavailable: MapPin,
  participant_busy: Users,
}

const severityStyles = {
  warning: {
    container:
      'border-amber-200/60 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/30 backdrop-blur-sm',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  error: {
    container:
      'border-red-200/60 bg-red-50/50 dark:border-red-800/60 dark:bg-red-950/30 backdrop-blur-sm',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
}

export function ConflictIndicator({
  conflicts,
  className,
  onSuggestionClick,
}: ConflictIndicatorProps) {
  if (!conflicts.length) return null

  const hasErrors = conflicts.some((c) => c.severity === 'error')
  const hasWarnings = conflicts.some((c) => c.severity === 'warning')

  return (
    <div
      className={cn(
        'animate-in slide-in-from-top-2 space-y-3 duration-300',
        className,
      )}
    >
      {conflicts.map((conflict, index) => {
        const Icon = conflictIcons[conflict.type]
        const styles = severityStyles[conflict.severity]

        return (
          <Alert
            key={index}
            className={cn(
              'transform transition-all duration-300 ease-in-out hover:scale-[1.01] hover:shadow-sm',
              'animate-in fade-in-0 slide-in-from-left-1',
              styles.container,
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Icon
              className={cn(
                'h-4 w-4 transition-transform duration-200 hover:scale-110',
                styles.icon,
              )}
            />
            <AlertDescription className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-foreground font-medium transition-colors duration-200">
                    {conflict.message}
                  </p>

                  {conflict.conflictingMeetings &&
                    conflict.conflictingMeetings.length > 0 && (
                      <div className="animate-in slide-in-from-top-1 mt-3 space-y-2 duration-200">
                        <p className="text-muted-foreground text-sm font-medium">
                          Conflicting meetings:
                        </p>
                        <div className="space-y-2">
                          {conflict.conflictingMeetings.map((meeting, idx) => (
                            <div
                              key={idx}
                              className="bg-background/70 border-border/50 hover:bg-background/90 hover:border-border rounded-md border p-3 text-sm transition-all duration-200"
                              style={{ animationDelay: `${(idx + 1) * 50}ms` }}
                            >
                              <div className="text-foreground font-medium">
                                {meeting.title}
                              </div>
                              <div className="text-muted-foreground mt-1 text-xs">
                                {meeting.time}
                              </div>
                              {meeting.participants &&
                                meeting.participants.length > 0 && (
                                  <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                                    <Users className="h-3 w-3" />
                                    <span>
                                      {meeting.participants.join(', ')}
                                    </span>
                                  </div>
                                )}
                              {meeting.room && (
                                <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                  <MapPin className="h-3 w-3" />
                                  <span>{meeting.room}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                <Badge
                  variant="secondary"
                  className={cn(
                    'transition-all duration-200 hover:scale-105',
                    styles.badge,
                  )}
                >
                  {conflict.severity === 'error' ? 'Blocking' : 'Warning'}
                </Badge>
              </div>

              {conflict.suggestions && conflict.suggestions.length > 0 && (
                <div className="animate-in slide-in-from-bottom-1 space-y-3 duration-300">
                  <p className="text-foreground text-sm font-medium">
                    Quick fixes:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {conflict.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-95"
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
        <div className="text-muted-foreground animate-in fade-in-0 bg-muted/30 mt-2 rounded-md p-2 text-xs duration-500">
          {hasErrors && (
            <span className="font-medium text-red-600 dark:text-red-400">
              ⚠ Blocking issues must be resolved before saving
            </span>
          )}
          {hasErrors && hasWarnings && ' • '}
          {hasWarnings && !hasErrors && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              ⚠ Warnings can be ignored but may affect meeting quality
            </span>
          )}
        </div>
      )}
    </div>
  )
}
