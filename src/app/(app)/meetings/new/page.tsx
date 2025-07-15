export const revalidate = 0
import { MeetingForm } from '@/components/meeting-form'
import { getUsers } from '@/lib/data'

export default async function NewMeetingPage() {
  const allUsers = await getUsers()

  return <MeetingForm allUsers={allUsers.users} />
}
