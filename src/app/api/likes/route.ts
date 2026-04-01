import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Toggles a Like in the Turso Mesh with atomic counter updates
 */
export async function POST(request: Request) {
  try {
    const { userId, videoId } = await request.json();
    
    const existing = await turso.execute({
      sql: "SELECT * FROM likes WHERE userId = ? AND videoId = ?",
      args: [userId, videoId]
    });

    let isLikedNow = false;

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: "DELETE FROM likes WHERE userId = ? AND videoId = ?",
        args: [userId, videoId]
      });
      await turso.execute({
        sql: "UPDATE videos SET likesCount = MAX(0, likesCount - 1) WHERE id = ?",
        args: [videoId]
      });
    } else {
      await turso.execute({
        sql: "INSERT INTO likes (userId, videoId) VALUES (?, ?)",
        args: [userId, videoId]
      });
      await turso.execute({
        sql: "UPDATE videos SET likesCount = likesCount + 1 WHERE id = ?",
        args: [videoId]
      });
      isLikedNow = true;
    }

    return NextResponse.json({ isLikedNow });
  } catch (error: any) {
    console.error('Turso Like Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json([]);

  try {
    const result = await turso.execute({
      sql: "SELECT videoId FROM likes WHERE userId = ?",
      args: [userId]
    });
    return NextResponse.json(result.rows.map(r => r.videoId));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
