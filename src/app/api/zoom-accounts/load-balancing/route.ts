import { NextResponse } from 'next/server'
import { zoomAccountService } from '@/services/zoom-account-service'

export async function GET() {
  try {
    const loadInfo = await zoomAccountService.getAccountLoadBalancing()
    return NextResponse.json(loadInfo)
  } catch (error) {
    console.error('Error getting account load balancing info:', error)
    return NextResponse.json([], { status: 200 }) // Return empty array for graceful degradation
  }
}
