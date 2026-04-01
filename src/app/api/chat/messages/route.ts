import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Handles Room-specific Messaging via Turso Mesh
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) return NextResponse.json([]);

  try {
    const result = await turso.execute({
      sql: "SELECT * FROM messages WHERE roomId = ? ORDER BY createdAt ASC",
      args: [roomId]
    });
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { roomId, userId, userName, userAvatar, content } = await request.json();
    
    await turso.execute({
      sql: "INSERT INTO messages (roomId, userId, userName, userAvatar, content, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      args: [roomId, userId, userName, userAvatar, content, new Date().toISOString()]
    });

    // Also update room activity/membership
    await turso.execute({
      sql: "INSERT OR REPLACE INTO room_members (roomId, userId, userName, userAvatar, lastActive) VALUES (?, ?, ?, ?, ?)",
      args: [roomId, userId, userName, userAvatar, new Date().toISOString()]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
