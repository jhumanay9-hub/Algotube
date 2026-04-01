
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Toggles a Dislike in the Turso Mesh with atomic counter updates
 */
export async function POST(request: Request) {
  try {
    const { userId, videoId } = await request.json();
    const vidInt = parseInt(videoId, 10);
    
    if (isNaN(vidInt)) {
      return NextResponse.json({ error: 'Invalid videoId' }, { status: 400 });
    }

    const existing = await turso.execute({
      sql: "SELECT * FROM dislikes WHERE userId = ? AND videoId = ?",
      args: [userId, vidInt]
    });

    let isDislikedNow = false;

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: "DELETE FROM dislikes WHERE userId = ? AND videoId = ?",
        args: [userId, vidInt]
      });
      await turso.execute({
        sql: "UPDATE videos SET dislikesCount = MAX(0, dislikesCount - 1) WHERE id = ?",
        args: [vidInt]
      });
    } else {
      await turso.execute({
        sql: "INSERT INTO dislikes (userId, videoId) VALUES (?, ?)",
        args: [userId, vidInt]
      });
      await turso.execute({
        sql: "UPDATE videos SET dislikesCount = dislikesCount + 1 WHERE id = ?",
        args: [vidInt]
      });
      isDislikedNow = true;
    }

    return NextResponse.json({ isDislikedNow });
  } catch (error: any) {
    console.error('Turso Dislike Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json([]);

  try {
    const result = await turso.execute({
      sql: "SELECT videoId FROM dislikes WHERE userId = ?",
      args: [userId]
    });
    return NextResponse.json(result.rows.map(r => Number(r.videoId)));
  } catch (error: any) {
    return NextResponse.json([]);
  }
}
