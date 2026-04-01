
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Toggles a Favorite in the Turso Mesh
 */
export async function POST(request: Request) {
  try {
    const { userId, videoId } = await request.json();
    const vidInt = parseInt(videoId, 10);
    
    if (isNaN(vidInt)) {
      return NextResponse.json({ error: 'Invalid videoId' }, { status: 400 });
    }

    const existing = await turso.execute({
      sql: "SELECT * FROM favorites WHERE userId = ? AND videoId = ?",
      args: [userId, vidInt]
    });

    let isFavoritedNow = false;

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: "DELETE FROM favorites WHERE userId = ? AND videoId = ?",
        args: [userId, vidInt]
      });
    } else {
      await turso.execute({
        sql: "INSERT INTO favorites (userId, videoId) VALUES (?, ?)",
        args: [userId, vidInt]
      });
      isFavoritedNow = true;
    }

    return NextResponse.json({ isFavoritedNow });
  } catch (error: any) {
    console.error('Turso Favorite Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json([]);

  try {
    const result = await turso.execute({
      sql: "SELECT videoId FROM favorites WHERE userId = ?",
      args: [userId]
    });
    return NextResponse.json(result.rows.map(r => Number(r.videoId)));
  } catch (error: any) {
    return NextResponse.json([]);
  }
}
