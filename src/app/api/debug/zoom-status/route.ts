import { NextResponse } from 'next/server'
import { checkSystemHealth, getSystemStats } from '@/lib/system-health'
import { zoomAccountService } from '@/services/zoom-account-service'

export async function GET() {
  try {
    // Get comprehensive system health status
    const healthStatus = await checkSystemHealth()
    const systemStats = await getSystemStats()
    
    // Test Zoom account service
    let zoomServiceStatus = {
      working: false,
      accounts: [],
      error: null as string | null
    }
    
    try {
      const accounts = await zoomAccountService.getAvailableAccounts()
      zoomServiceStatus.working = true
      zoomServiceStatus.accounts = accounts.map(account => ({
        id: account.id,
        email: account.email,
        isActive: account.isActive,
        maxConcurrentMeetings: account.maxConcurrentMeetings,
        scheduledMeetingsCount: account.scheduledMeetings.length
      }))
    } catch (error) {
      zoomServiceStatus.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      systemHealth: healthStatus,
      systemStats,
      zoomService: zoomServiceStatus,
      recommendations: generateRecommendations(healthStatus, systemStats)
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function generateRecommendations(
  health: Awaited<ReturnType<typeof checkSystemHealth>>,
  stats: Awaited<ReturnType<typeof getSystemStats>>
): string[] {
  const recommendations: string[] = []

  if (!health.database.connected) {
    recommendations.push('Fix database connection issues before proceeding')
  }

  if (!health.zoomCredentials.configured) {
    recommendations.push('Configure Zoom credentials in Settings to enable Zoom meeting features')
  }

  if (stats.zoomAccounts === 0) {
    recommendations.push('Add at least one Zoom account to enable concurrent meeting management')
  }

  if (stats.zoomAccounts === 1) {
    recommendations.push('Consider adding more Zoom accounts to increase concurrent meeting capacity (currently limited to 2 concurrent meetings)')
  }

  if (stats.meetingRooms === 0) {
    recommendations.push('Add meeting rooms to enable room booking and conflict detection')
  }

  if (health.overall.errors.length === 0 && health.overall.warnings.length === 0) {
    recommendations.push('System is healthy and fully configured')
  }

  return recommendations
}