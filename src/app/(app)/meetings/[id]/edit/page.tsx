import { MeetingForm } from '@/components/meeting-form'
import { getMeetingById, getUsers } from '@/lib/data'
import { notFound } from 'next/navigation'

type EditMeetingPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditMeetingPage({
  params,
}: EditMeetingPageProps) {
  const { id } = await params
  const [meeting, allUsers] = await Promise.all([
    getMeetingById(id),
    getUsers(),
  ])

  if (!meeting) {
    notFound()
  }

  return <MeetingForm existingMeeting={meeting} allUsers={allUsers.users} />
}
