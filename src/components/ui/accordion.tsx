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
      'group/item border border-border/40 rounded-xl bg-card/20 backdrop-blur-sm transition-all duration-500 ease-out hover:bg-card/50 hover:border-border/70 hover:shadow-lg hover:scale-[1.01] data-[state=open]:bg-card/70 data-[state=open]:border-primary/40 data-[state=open]:shadow-xl data-[state=open]:scale-[1.02]',
      isCompleted && 'border-green-500/30 bg-green-50/10 dark:bg-green-950/10',
      className
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
        'flex flex-1 items-center justify-between py-6 px-6 font-semibold text-base transition-all duration-400 ease-out hover:no-underline group/trigger rounded-t-xl data-[state=open]:pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 hover:bg-accent/20 data-[state=open]:bg-primary/5',
        isCompleted && 'text-green-700 dark:text-green-400',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {isCompleted && (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 animate-in fade-in-0 zoom-in-95 duration-300" />
        )}
        {children}
      </div>
      <div className="flex items-center gap-2">
        {isCompleted && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/30 px-2 py-1 rounded-full animate-in fade-in-0 slide-in-from-right-2 duration-300">
            Complete
          </span>
        )}
        <ChevronDown className="h-5 w-5 shrink-0 transition-all duration-400 ease-out text-muted-foreground group-hover/trigger:text-foreground group-data-[state=open]/trigger:rotate-180 group-data-[state=open]/trigger:text-primary group-hover/trigger:scale-110" />
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
    <div className={cn('px-6 pt-2 pb-8 animate-in fade-in-0 slide-in-from-top-1 duration-400', className)}>
      <div className="border-t border-border/20 pt-6">
        {children}
      </div>
    </div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
