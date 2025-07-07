import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/zoom-settings/host-key - Get the host key from the latest ZoomCredentials
export async function GET() {
  try {
    const session = await auth();
    
    // Ensure the user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in to access this information' },
        { status: 401 }
      );
    }
    
    // Get the latest Zoom credentials
    const zoomCredentials = await prisma.zoomCredentials.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!zoomCredentials) {
      return NextResponse.json(
        { error: 'Zoom credentials not found' },
        { status: 404 }
      );
    }
    
    // Return the host key (or empty string if not set)
    return NextResponse.json({
      hostKey: zoomCredentials.hostKey || ''
    });
    
  } catch (error) {
    console.error('Error fetching host key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch host key' },
      { status: 500 }
    );
  }
} 