import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Fetches active participants in a specific room
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) return NextResponse.json([]);

  try {
    // Return members active in the last 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const result = await turso.execute({
      sql: "SELECT userId, userName, userAvatar FROM room_members WHERE roomId = ? AND lastActive > ? LIMIT 12",
      args: [roomId, tenMinsAgo]
    });
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
