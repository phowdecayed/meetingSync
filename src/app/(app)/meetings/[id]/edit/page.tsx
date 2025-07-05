import { MeetingForm } from "@/components/meeting-form";
import { getMeetingById, getUsers } from "@/lib/data";
import { notFound } from "next/navigation";

type EditMeetingPageProps = {
    params: { id: string }
}

export default async function EditMeetingPage({ params }: EditMeetingPageProps) {
    const [meeting, allUsers] = await Promise.all([
        getMeetingById(params.id),
        getUsers()
    ]);

    if (!meeting) {
        notFound();
    }

    return (
        <MeetingForm existingMeeting={meeting} allUsers={allUsers} />
    )
}
