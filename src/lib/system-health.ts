/**
 * System Health Check Utilities
 * 
 * Provides utilities to check the health and configuration status of the application.
 */

import prisma from '@/lib/prisma'

export interface SystemHealthStatus {
  database: {
    connected: boolean
    error?: string
  }
  zoomCredentials: {
    configured: boolean
    count: number
    error?: string
  }
  meetings: {
    total: number
    zoomMeetings: number
    error?: string
  }
  overall: {
    healthy: boolean
    warnings: string[]
    errors: string[]
  }
}

/**
 * Perform a comprehensive system health check
 */
export async function checkSystemHealth(): Promise<SystemHealthStatus> {
  const status: SystemHealthStatus = {
    database: { connected: false },
    zoomCredentials: { configured: false, count: 0 },
    meetings: { total: 0, zoomMeetings: 0 },
    overall: { healthy: true, warnings: [], errors: [] }
  }

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`
    status.database.connected = true
  } catch (error) {
    status.database.connected = false
    status.database.error = error instanceof Error ? error.message : 'Unknown database error'
    status.overall.healthy = false
    status.overall.errors.push('Database connection failed')
  }

  // Check Zoom credentials
  if (status.database.connected) {
    try {
      const zoomCredentials = await prisma.zoomCredentials.count({
        where: { deletedAt: null }
      })
      
      status.zoomCredentials.count = zoomCredentials
      status.zoomCredentials.configured = zoomCredentials > 0
      
      if (zoomCredentials === 0) {
        status.overall.warnings.push('No Zoom credentials configured - Zoom features will be limited')
      }
    } catch (error) {
      status.zoomCredentials.error = error instanceof Error ? error.message : 'Unknown error'
      status.overall.warnings.push('Could not check Zoom credentials')
    }

    // Check meetings
    try {
      const [totalMeetings, zoomMeetings] = await Promise.all([
        prisma.meeting.count({ where: { deletedAt: null } }),
        prisma.meeting.count({ where: { deletedAt: null, isZoomMeeting: true } })
      ])
      
      status.meetings.total = totalMeetings
      status.meetings.zoomMeetings = zoomMeetings
    } catch (error) {
      status.meetings.error = error instanceof Error ? error.message : 'Unknown error'
      status.overall.warnings.push('Could not check meeting statistics')
    }
  }

  return status
}

/**
 * Check if Zoom functionality is available
 */
export async function isZoomAvailable(): Promise<boolean> {
  try {
    const zoomCredentials = await prisma.zoomCredentials.count({
      where: { deletedAt: null }
    })
    return zoomCredentials > 0
  } catch (error) {
    console.error('Error checking Zoom availability:', error)
    return false
  }
}

/**
 * Get basic system statistics
 */
export async function getSystemStats(): Promise<{
  users: number
  meetings: number
  zoomMeetings: number
  meetingRooms: number
  zoomAccounts: number
}> {
  try {
    const [users, meetings, zoomMeetings, meetingRooms, zoomAccounts] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.meeting.count({ where: { deletedAt: null } }),
      prisma.meeting.count({ where: { deletedAt: null, isZoomMeeting: true } }),
      prisma.meetingRoom.count({ where: { deletedAt: null } }),
      prisma.zoomCredentials.count({ where: { deletedAt: null } })
    ])

    return {
      users,
      meetings,
      zoomMeetings,
      meetingRooms,
      zoomAccounts
    }
  } catch (error) {
    console.error('Error getting system stats:', error)
    return {
      users: 0,
      meetings: 0,
      zoomMeetings: 0,
      meetingRooms: 0,
      zoomAccounts: 0
    }
  }
}