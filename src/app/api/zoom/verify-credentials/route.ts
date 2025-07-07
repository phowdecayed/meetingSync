// src/app/api/zoom/verify-credentials/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyS2SCredentials } from '@/lib/zoom';

/**
 * // Fungsi handler untuk method POST
 * @param req - Objek NextRequest
 * @returns - Objek NextResponse
 */
export async function POST(req: NextRequest) {
  try {
    // Mendapatkan body dari request
    const body = await req.json();
    const { clientId, clientSecret, accountId } = body;

    // Memeriksa apakah semua kredensial ada
    if (!clientId || !clientSecret || !accountId) {
      return NextResponse.json({ success: false, message: 'Missing credentials' }, { status: 400 });
    }

    // Mencoba untuk mendapatkan token akses
    const tokenData = await verifyS2SCredentials(clientId, clientSecret, accountId);

    // Jika token didapatkan, verifikasi berhasil
    if (tokenData && tokenData.access_token) {
      return NextResponse.json({ success: true, message: 'Credentials verified successfully.' });
    } else {
      // Jika tidak, verifikasi gagal
      return NextResponse.json({ success: false, message: 'Failed to verify credentials. Please check your inputs.' }, { status: 401 });
    }
  } catch (error) {
    // Menangani error
    console.error('Verification failed:', error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}