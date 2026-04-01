import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Handles Chat Room Discovery and Creation in Turso Mesh
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) return NextResponse.json([]);

  try {
    const result = await turso.execute({
      sql: "SELECT * FROM chat_rooms WHERE videoId = ? ORDER BY id ASC",
      args: [videoId]
    });
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Turso Room Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { videoId, name, isPrivate, creatorId } = await request.json();
    const roomId = `room_${Date.now()}`;
    
    await turso.execute({
      sql: "INSERT INTO chat_rooms (id, videoId, name, isPrivate, creatorId) VALUES (?, ?, ?, ?, ?)",
      args: [roomId, videoId, name, isPrivate ? 1 : 0, creatorId]
    });

    return NextResponse.json({ success: true, roomId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
