import { MeetingRoomsSettings } from '@/components/meeting-rooms-settings'
import { getMeetingRooms } from '@/lib/data'

export default async function MeetingRoomsPage() {
  const rooms = await getMeetingRooms()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Meeting Rooms</h3>
        <p className="text-muted-foreground text-sm">
          Manage the physical meeting rooms available for booking.
        </p>
      </div>
      <MeetingRoomsSettings initialRooms={rooms} />
    </div>
  )
}
