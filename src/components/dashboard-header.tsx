'use client'

import { useSession, signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { LogOut, PlusCircle, Settings, User, Rocket } from 'lucide-react'
import Link from 'next/link'
import { useTourStore } from '@/store/use-tour-store'

export function DashboardHeader() {
  const { data: session } = useSession()
  const user = session?.user
  const { startTour } = useTourStore()

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <header className="bg-background sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-4 md:px-6">
      <SidebarTrigger />

      <div className="flex w-full items-center justify-end gap-4">
        <Link href="/meetings/new" passHref>
          <Button id="new-meeting-button">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
              data-testid="user-avatar-button"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={
                    user?.name
                      ? `https://xsgames.co/randomusers/avatar.php?g=pixel&name=${encodeURIComponent(
                          user.name,
                        )}`
                      : undefined
                  }
                  alt={user?.name ?? ''}
                  data-ai-hint="user avatar"
                />
                <AvatarFallback>{getInitials(user?.name ?? '')}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm leading-none font-medium">{user?.name}</p>
                <p className="text-muted-foreground text-xs leading-none">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={startTour}>
              <Rocket className="mr-2 h-4 w-4" />
              <span>Start Tour</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Link href="/profile" passHref>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
            </Link>
            {user?.role === 'admin' && (
              <Link href="/settings" passHref>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
