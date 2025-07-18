import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Zod schema for validation
const zoomCredentialSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  hostKey: z.string().optional(),
})

/**
 * GET handler to fetch Zoom credentials for the settings page.
 * It fetches the raw credentials needed by the UI.
 */
export async function GET() {
  try {
    const credentials = await prisma.zoomCredentials.findMany({
      where: {
        deletedAt: null,
      },
      // Select only the fields needed by the UI, excluding the clientSecret for security
      select: {
        id: true,
        clientId: true,
        accountId: true,
        hostKey: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(credentials)
  } catch (error) {
    console.error('Error fetching Zoom credentials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Zoom credentials' },
      { status: 500 },
    )
  }
}

/**
 * POST handler to create a new Zoom credential.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = zoomCredentialSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { clientId, clientSecret, accountId, hostKey } = validation.data

    // Check for existing credentials to avoid duplicates
    const existing = await prisma.zoomCredentials.findFirst({
      where: { clientId, accountId, deletedAt: null },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Credential with this Client ID and Account ID already exists.' },
        { status: 409 },
      )
    }

    const newCredential = await prisma.zoomCredentials.create({
      data: {
        clientId,
        clientSecret, // Note: Storing secrets should ideally use a vault
        accountId,
        hostKey,
      },
    })

    return NextResponse.json(newCredential, { status: 201 })
  } catch (error) {
    console.error('Error creating Zoom credential:', error)
    return NextResponse.json(
      { error: 'Failed to save Zoom credential' },
      { status: 500 },
    )
  }
}

/**
 * DELETE handler to remove a Zoom credential.
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = z.object({ id: z.string() }).parse(body)

    if (!id) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 })
    }

    // Soft delete the credential
    await prisma.zoomCredentials.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ message: 'Credential deleted successfully' })
  } catch (error) {
    console.error('Error deleting Zoom credential:', error)
    return NextResponse.json(
      { error: 'Failed to delete Zoom credential' },
      { status: 500 },
    )
  }
}
