import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userIdToReset = params.id
    if (userIdToReset === session.user.id) {
      return NextResponse.json(
        { error: "Admin cannot reset their own password here." },
        { status: 400 },
      )
    }

    const settings = await prisma.settings.findFirst()
    if (!settings?.defaultResetPassword) {
      return NextResponse.json(
        {
          error:
            'Default reset password is not set in the application settings.',
        },
        { status: 500 },
      )
    }

    const passwordHash = settings.defaultResetPassword

    await prisma.user.update({
      where: { id: userIdToReset },
      data: { passwordHash },
    })

    return NextResponse.json({ message: 'Password has been reset successfully.' })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 },
    )
  }
}
