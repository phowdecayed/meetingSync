'use client'

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown, CheckCircle2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & {
    isCompleted?: boolean
  }
>(({ className, isCompleted, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      'group/item border-border/40 bg-card/20 hover:bg-card/50 hover:border-border/70 data-[state=open]:bg-card/70 data-[state=open]:border-primary/40 rounded-xl border backdrop-blur-sm transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-lg data-[state=open]:scale-[1.02] data-[state=open]:shadow-xl',
      isCompleted && 'border-green-500/30 bg-green-50/10 dark:bg-green-950/10',
      className,
    )}
    {...props}
  />
))
AccordionItem.displayName = 'AccordionItem'

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    isCompleted?: boolean
  }
>(({ className, children, isCompleted, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'group/trigger focus-visible:ring-primary/50 hover:bg-accent/20 data-[state=open]:bg-primary/5 flex flex-1 items-center justify-between rounded-t-xl px-6 py-6 text-base font-semibold transition-all duration-400 ease-out hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none data-[state=open]:pb-4',
        isCompleted && 'text-green-700 dark:text-green-400',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {isCompleted && (
          <CheckCircle2 className="animate-in fade-in-0 zoom-in-95 h-5 w-5 text-green-600 duration-300 dark:text-green-400" />
        )}
        {children}
      </div>
      <div className="flex items-center gap-2">
        {isCompleted && (
          <span className="animate-in fade-in-0 slide-in-from-right-2 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600 duration-300 dark:bg-green-950/30 dark:text-green-400">
            Complete
          </span>
        )}
        <ChevronDown className="text-muted-foreground group-hover/trigger:text-foreground group-data-[state=open]/trigger:text-primary h-5 w-5 shrink-0 transition-all duration-400 ease-out group-hover/trigger:scale-110 group-data-[state=open]/trigger:rotate-180" />
      </div>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all duration-400 ease-out"
    {...props}
  >
    <div
      className={cn(
        'animate-in fade-in-0 slide-in-from-top-1 px-6 pt-2 pb-8 duration-400',
        className,
      )}
    >
      <div className="border-border/20 border-t pt-6">{children}</div>
    </div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
