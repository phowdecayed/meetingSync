'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import type { User } from '@/lib/data'

interface UserComboboxProps {
  allUsers: User[]
  selectedUsers: string[] // array of emails
  onChange: (selectedUsers: string[]) => void
  className?: string
}

export function UserCombobox({
  allUsers,
  selectedUsers,
  onChange,
  className,
}: UserComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (email: string) => {
    const newSelection = selectedUsers.includes(email)
      ? selectedUsers.filter((u) => u !== email)
      : [...selectedUsers, email]
    onChange(newSelection)
  }

  const selectedUserObjects = allUsers.filter((u) =>
    selectedUsers.includes(u.email),
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-auto min-h-10 w-full justify-between', className)}
        >
          <div className="flex flex-wrap gap-1">
            {selectedUserObjects.length > 0 ? (
              selectedUserObjects.map((user) => (
                <Badge
                  variant="secondary"
                  key={user.id}
                  className="mr-1"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSelect(user.email)
                  }}
                >
                  {user.name}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">
                Select participants...
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search users by name or email..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {allUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.email}
                  onSelect={(currentValue) => {
                    handleSelect(currentValue)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedUsers.includes(user.email)
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                  />
                  <div>
                    <p>{user.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {user.email}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
