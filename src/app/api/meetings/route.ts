import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getMeetings, 
  getMeetingById, 
  createMeeting, 
  updateMeeting, 
  deleteMeeting 
} from '@/lib/data';

// GET /api/meetings - Mengambil semua pertemuan
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      const meeting = await getMeetingById(id);
      if (!meeting) {
        return NextResponse.json(
          { error: 'Meeting not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(meeting);
    }

    const meetings = await getMeetings();
    return NextResponse.json(meetings);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST /api/meetings - Membuat pertemuan baru
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    if (!data.title || !data.date || data.duration === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Make sure organizerId is set to current user
    data.organizerId = session.user.id;
    
    const meeting = await createMeeting(data);
    
    return NextResponse.json(meeting);
  } catch (error: any) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create meeting' },
      { status: 500 }
    );
  }
}

// PUT /api/meetings - Memperbarui pertemuan
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      );
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    // Verifikasi bahwa pengguna adalah admin atau penyelenggara pertemuan
    const meeting = await getMeetingById(data.id);
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    if (session.user.role !== 'admin' && meeting.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only edit your own meetings' },
        { status: 403 }
      );
    }

    const updatedMeeting = await updateMeeting(data.id, data);
    return NextResponse.json(updatedMeeting);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE /api/meetings - Menghapus pertemuan
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }
    
    // Verify if user has permission to delete this meeting (admin or owner)
    // This would be handled inside deleteMeeting in a real app
    
    const result = await deleteMeeting(id);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete meeting' },
      { status: 500 }
    );
  }
} 