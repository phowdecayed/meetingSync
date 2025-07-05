import { MeetingForm } from "@/components/meeting-form";

export default function NewMeetingPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-headline font-bold">Create New Meeting</h1>
                <p className="text-muted-foreground">Fill in the details to schedule your next meeting.</p>
            </div>
            <MeetingForm />
        </div>
    )
}
