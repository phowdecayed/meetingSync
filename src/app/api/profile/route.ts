import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// PUT /api/profile - Memperbarui profil pengguna
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = session.user.id
    const currentUserEmail = session.user.email

    const data = await request.json()
    const { name, email } = data

    if (!name && !email) {
      return NextResponse.json(
        { error: 'Name or email is required' },
        { status: 400 },
      )
    }

    const dataToUpdate: { name?: string; email?: string } = {}
    let emailChanged = false

    if (name && name !== session.user.name) {
      dataToUpdate.name = name
    }

    if (email && email !== currentUserEmail) {
      // Periksa apakah email baru sudah digunakan
      const existingUser = await prisma.user.findUnique({
        where: { email: email },
      })
      if (existingUser && existingUser.id !== currentUserId) {
        return NextResponse.json(
          { error: 'Email is already in use by another account.' },
          { status: 409 }, // 409 Conflict
        )
      }
      dataToUpdate.email = email
      emailChanged = true
    }

    // Jika tidak ada yang perlu diupdate, kembalikan sukses
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ message: 'No changes detected.' })
    }

    // Update user di database
    await prisma.user.update({
      where: { id: currentUserId },
      data: dataToUpdate,
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      emailChanged,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 },
    )
  }
}
