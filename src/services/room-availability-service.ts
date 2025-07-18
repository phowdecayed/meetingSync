/**
 * Room Availability Service
 * 
 * Handles room availability checking, conflict detection, and alternative room suggestions
 * with support for different meeting types (offline, hybrid, online).
 */

import prisma from '@/lib/prisma'
import { 
  RoomAvailabilityService, 
  RoomAvailabilityResult, 
  MeetingRoomInfo, 
  ScheduledMeeting,
  MeetingType,
  ConflictInfo,
  ConflictType,
  ConflictSeverity
} from '@/types/conflict-detection'

export class RoomAvailabilityServiceImpl implements RoomAvailabilityService {
  
  /**
   * Check if a specific room is available for the given time slot
   */
  async checkRoomAvailability(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string
  ): Promise<RoomAvailabilityResult> {
    try {
      // Get room information
      const room = await prisma.meetingRoom.findUnique({
        where: { id: roomId },
      })

      if (!room) {
        throw new Error(`Room with ID ${roomId} not found`)
      }

      // Find conflicting meetings in the same room
      const conflictingMeetings = await this.getRoomConflicts(roomId, startTime, endTime, excludeMeetingId)
      
      // Get alternative rooms if there are conflicts
      const alternativeRooms = conflictingMeetings.length > 0 
        ? await this.findAvailableRooms(startTime, endTime)
        : []

      return {
        isAvailable: conflictingMeetings.length === 0,
        conflictingMeetings,
        alternativeRooms
      }
    } catch (error) {
      console.error('Error checking room availability:', error)
      throw error
    }
  }

  /**
   * Find all available rooms for the given time slot
   */
  async findAvailableRooms(
    startTime: Date,
    endTime: Date
  ): Promise<MeetingRoomInfo[]> {
    try {
      // Get all active rooms
      const allRooms = await prisma.meetingRoom.findMany({
        where: {
          deletedAt: null
        },
        orderBy: {
          name: 'asc'
        }
      })

      // Check availability for each room
      const availableRooms: MeetingRoomInfo[] = []
      
      for (const room of allRooms) {
        const conflicts = await this.getRoomConflicts(room.id, startTime, endTime)
        
        if (conflicts.length === 0) {
          availableRooms.push({
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            isActive: true,
            equipment: [], // TODO: Add equipment field to schema if needed
            location: room.location
          })
        }
      }

      return availableRooms
    } catch (error) {
      console.error('Error finding available rooms:', error)
      throw error
    }
  }

  /**
   * Get conflicting meetings for a specific room and time slot
   */
  async getRoomConflicts(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string
  ): Promise<ScheduledMeeting[]> {
    try {
      const whereConditions: any = {
        meetingRoomId: roomId,
        deletedAt: null,
        // Check for time overlap: new meeting overlaps if it starts before existing ends and ends after existing starts
        AND: [
          {
            date: {
              lt: endTime // existing meeting starts before new meeting ends
            }
          }
        ]
      }

      // Exclude specific meeting if provided (for edit scenarios)
      if (excludeMeetingId) {
        whereConditions.id = {
          not: excludeMeetingId
        }
      }

      const conflictingMeetings = await prisma.meeting.findMany({
        where: whereConditions,
        include: {
          organizer: true,
          meetingRoom: true
        }
      })

      // Filter meetings that actually overlap (Prisma doesn't support complex date comparisons easily)
      const actualConflicts = conflictingMeetings.filter(meeting => {
        const meetingStart = new Date(meeting.date)
        const meetingEnd = new Date(meetingStart.getTime() + meeting.duration * 60 * 1000)
        
        // Check if there's actual overlap
        return startTime < meetingEnd && endTime > meetingStart
      })

      return actualConflicts.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        startTime: new Date(meeting.date),
        endTime: new Date(new Date(meeting.date).getTime() + meeting.duration * 60 * 1000),
        participants: meeting.participants.split(',').map(p => p.trim()).filter(p => p),
        zoomAccountId: meeting.zoomCredentialId || ''
      }))
    } catch (error) {
      console.error('Error getting room conflicts:', error)
      throw error
    }
  }

  /**
   * Validate room requirements based on meeting type
   */
  validateRoomRequirement(
    meetingType: MeetingType,
    roomId?: string
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []

    switch (meetingType) {
      case MeetingType.OFFLINE:
        if (!roomId) {
          conflicts.push({
            type: ConflictType.MISSING_ROOM,
            severity: ConflictSeverity.ERROR,
            message: 'Offline meetings require a physical room to be selected.',
            suggestions: ['Select a meeting room from the dropdown']
          })
        }
        break

      case MeetingType.HYBRID:
        if (!roomId) {
          conflicts.push({
            type: ConflictType.MISSING_ROOM,
            severity: ConflictSeverity.WARNING,
            message: 'Hybrid meetings typically require a physical room for in-person participants.',
            suggestions: ['Select a meeting room for in-person participants']
          })
        }
        break

      case MeetingType.ONLINE:
        // Online meetings don't require a room, but if one is selected, we should still check for conflicts
        break

      default:
        break
    }

    return conflicts
  }

  /**
   * Generate room conflict information with suggestions
   */
  async generateRoomConflictInfo(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string
  ): Promise<ConflictInfo | null> {
    try {
      const availabilityResult = await this.checkRoomAvailability(
        roomId, 
        startTime, 
        endTime, 
        excludeMeetingId
      )

      if (availabilityResult.isAvailable) {
        return null
      }

      // Generate suggestions
      const suggestions: string[] = []
      
      // Suggest alternative rooms
      if (availabilityResult.alternativeRooms.length > 0) {
        availabilityResult.alternativeRooms.slice(0, 3).forEach(room => {
          suggestions.push(`Use ${room.name} instead`)
        })
      }

      // Suggest alternative times
      const earliestConflict = availabilityResult.conflictingMeetings.reduce((earliest, meeting) => {
        return meeting.startTime < earliest ? meeting.startTime : earliest
      }, availabilityResult.conflictingMeetings[0]?.startTime || new Date())

      const latestConflict = availabilityResult.conflictingMeetings.reduce((latest, meeting) => {
        return meeting.endTime > latest ? meeting.endTime : latest
      }, new Date(0))

      if (earliestConflict) {
        const suggestedEarlier = new Date(earliestConflict.getTime() - (endTime.getTime() - startTime.getTime()))
        if (suggestedEarlier >= new Date()) {
          suggestions.push(`Schedule at ${suggestedEarlier.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          })} (before conflicts)`)
        }
      }

      if (latestConflict > new Date(0)) {
        suggestions.push(`Schedule at ${latestConflict.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        })} (after conflicts)`)
      }

      return {
        type: ConflictType.ROOM_CONFLICT,
        severity: ConflictSeverity.ERROR,
        message: `This room is already booked for ${availabilityResult.conflictingMeetings.length} meeting${availabilityResult.conflictingMeetings.length > 1 ? 's' : ''} during this time.`,
        affectedResource: roomId,
        conflictingMeetings: availabilityResult.conflictingMeetings.map(meeting => ({
          title: meeting.title,
          time: `${meeting.startTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          })} - ${meeting.endTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          })}`,
          participants: meeting.participants,
          room: roomId
        })),
        suggestions
      }
    } catch (error) {
      console.error('Error generating room conflict info:', error)
      return {
        type: ConflictType.ROOM_CONFLICT,
        severity: ConflictSeverity.ERROR,
        message: 'Unable to check room availability. Please try again.',
        affectedResource: roomId
      }
    }
  }

  /**
   * Get room utilization statistics
   */
  async getRoomUtilization(
    roomId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalHours: number
    bookedHours: number
    utilizationPercentage: number
    meetingCount: number
  }> {
    try {
      const meetings = await prisma.meeting.findMany({
        where: {
          meetingRoomId: roomId,
          deletedAt: null,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      const bookedHours = meetings.reduce((total, meeting) => {
        return total + (meeting.duration / 60)
      }, 0)

      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const totalHours = totalDays * 8 // Assuming 8 working hours per day

      return {
        totalHours,
        bookedHours,
        utilizationPercentage: totalHours > 0 ? (bookedHours / totalHours) * 100 : 0,
        meetingCount: meetings.length
      }
    } catch (error) {
      console.error('Error calculating room utilization:', error)
      throw error
    }
  }

  /**
   * Find optimal room suggestions based on meeting requirements
   */
  async findOptimalRooms(
    startTime: Date,
    endTime: Date,
    participantCount: number,
    preferredLocation?: string
  ): Promise<MeetingRoomInfo[]> {
    try {
      const availableRooms = await this.findAvailableRooms(startTime, endTime)
      
      // Score rooms based on suitability
      const scoredRooms = availableRooms.map(room => {
        let score = 0
        
        // Capacity scoring (prefer rooms that fit participants well, not too big or too small)
        if (room.capacity >= participantCount) {
          const capacityRatio = participantCount / room.capacity
          if (capacityRatio >= 0.5 && capacityRatio <= 0.8) {
            score += 10 // Optimal capacity usage
          } else if (capacityRatio >= 0.3) {
            score += 5 // Good capacity usage
          } else {
            score += 1 // Room is too big but available
          }
        }
        
        // Location preference
        if (preferredLocation && room.location?.toLowerCase().includes(preferredLocation.toLowerCase())) {
          score += 5
        }
        
        return { ...room, score }
      })
      
      // Sort by score (highest first) and return top suggestions
      return scoredRooms
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // Return top 5 suggestions
        .map(({ score, ...room }) => room) // Remove score from final result
    } catch (error) {
      console.error('Error finding optimal rooms:', error)
      return []
    }
  }
}

// Export singleton instance
export const roomAvailabilityService = new RoomAvailabilityServiceImpl()