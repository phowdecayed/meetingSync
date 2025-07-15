import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET /api/settings - Ambil pengaturan umum aplikasi (Publik)
export async function GET() {
  try {
    const session = await auth()
    let settings = await prisma.settings.findFirst()

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          allowRegistration: true,
          defaultRole: 'member',
        },
      })
    }

    // Admin gets all settings, but we don't want to expose the password hash
    if (session?.user?.role === 'admin') {
      const { defaultResetPassword, ...safeSettings } = settings
      return NextResponse.json(safeSettings)
    }

    // Public only gets safe settings
    return NextResponse.json({
      allowRegistration: settings.allowRegistration,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    )
  }
}

// PUT /api/settings - Update pengaturan umum aplikasi (hanya admin)
export async function PUT(request: Request) {
  try {
    const session = await auth()
    // Hanya admin yang bisa mengubah pengaturan
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { allowRegistration, defaultRole, defaultResetPassword } = body

    const settings = await prisma.settings.findFirst()
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    const dataToUpdate: {
      allowRegistration?: boolean
      defaultRole?: string
      defaultResetPassword?: string
    } = {}

    if (typeof allowRegistration === 'boolean') {
      dataToUpdate.allowRegistration = allowRegistration
    }
    if (typeof defaultRole === 'string') {
      dataToUpdate.defaultRole = defaultRole
    }
    if (typeof defaultResetPassword === 'string' && defaultResetPassword) {
      if (defaultResetPassword.length < 8) {
        return NextResponse.json(
          { error: 'Default password must be at least 8 characters' },
          { status: 400 },
        )
      }
      dataToUpdate.defaultResetPassword = await bcrypt.hash(
        defaultResetPassword,
        10,
      )
    }

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: dataToUpdate,
    })

    const { defaultResetPassword: _, ...safeUpdatedSettings } = updated

    return NextResponse.json(safeUpdatedSettings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 },
    )
  }
}
