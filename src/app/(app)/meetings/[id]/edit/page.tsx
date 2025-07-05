import { MeetingForm } from "@/components/meeting-form";
import { getMeetingById } from "@/lib/data";
import { notFound } from "next/navigation";

type EditMeetingPageProps = {
    params: { id: string }
}

export default async function EditMeetingPage({ params }: EditMeetingPageProps) {
    const meeting = await getMeetingById(params.id);

    if (!meeting) {
        notFound();
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-headline font-bold">Edit Meeting</h1>
                <p className="text-muted-foreground">Update the details for your meeting.</p>
            </div>
            <MeetingForm existingMeeting={meeting} />
        </div>
    )
}
