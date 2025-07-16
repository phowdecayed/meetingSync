import { NextResponse } from 'next/server'
import packageJson from '../../../../package.json'

export async function GET() {
  try {
    return NextResponse.json({ version: packageJson.version })
  } catch (error) {
    console.error('Error reading package.json:', error)
    return NextResponse.json(
      { error: 'Failed to get app version' },
      { status: 500 },
    )
  }
}
