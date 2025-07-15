import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

    // Admin gets all settings
    if (session?.user?.role === 'admin') {
      return NextResponse.json(settings)
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
    const { allowRegistration, defaultRole } = body

    // Validasi input
    if (
      typeof allowRegistration !== 'boolean' ||
      (defaultRole && typeof defaultRole !== 'string')
    ) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const settings = await prisma.settings.findFirst()
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        allowRegistration,
        defaultRole,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 },
    )
  }
}
