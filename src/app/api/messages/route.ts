
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Handles video comments (messages) via Turso
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) return NextResponse.json([]);

  try {
    const result = await turso.execute({
      sql: "SELECT * FROM messages WHERE videoId = ? ORDER BY createdAt DESC",
      args: [videoId]
    });
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { videoId, userId, userName, userAvatar, content } = await request.json();
    
    await turso.execute({
      sql: "INSERT INTO messages (videoId, userId, userName, userAvatar, content, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      args: [videoId, userId, userName, userAvatar, content, new Date().toISOString()]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
