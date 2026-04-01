
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
      sql: "SELECT 1 FROM favorites WHERE user_id = ? AND video_id = ?",
      args: [userId, vidInt]
    });

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: "DELETE FROM favorites WHERE user_id = ? AND video_id = ?",
        args: [userId, vidInt]
      });
      return NextResponse.json({ active: false });
    } else {
      await turso.execute({
        sql: "INSERT INTO favorites (user_id, video_id) VALUES (?, ?)",
        args: [userId, vidInt]
      });
      return NextResponse.json({ active: true });
    }
  } catch (error: any) {
    console.error('Turso Favorite Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const videoId = searchParams.get('videoId');

  if (!userId) return NextResponse.json({ active: false });

  try {
    if (videoId) {
      const result = await turso.execute({
        sql: "SELECT 1 FROM favorites WHERE user_id = ? AND video_id = ?",
        args: [userId, parseInt(videoId, 10)]
      });
      return NextResponse.json({ active: result.rows.length > 0 });
    } else {
      const result = await turso.execute({
        sql: "SELECT video_id FROM favorites WHERE user_id = ?",
        args: [userId]
      });
      return NextResponse.json(result.rows.map(r => Number(r.video_id)));
    }
  } catch (error: any) {
    return NextResponse.json({ active: false });
  }
}
