// src/app/api/notifications/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // This is a temporary debug endpoint - remove in production
    
    // Import the device tokens from register-device route
    // Note: In a real app, this would query your database
    
    return NextResponse.json({
      success: true,
      message: 'Debug info',
      note: 'Check the server console logs for device registration attempts',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
