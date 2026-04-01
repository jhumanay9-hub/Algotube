
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Toggles a Like in the Turso Mesh
 * Logic: 
 * 1. Parse video_id as integer.
 * 2. If liked -> DELETE from likes, decrement likesCount.
 * 3. If not liked -> DELETE from dislikes (mutual exclusion), decrement dislikesCount if removed, 
 *    INSERT into likes, increment likesCount.
 */
export async function POST(request: Request) {
  try {
    const { userId, videoId } = await request.json();
    const vidInt = parseInt(videoId, 10);
    
    if (isNaN(vidInt)) {
      return NextResponse.json({ error: 'Invalid videoId' }, { status: 400 });
    }

    const existingLike = await turso.execute({
      sql: "SELECT 1 FROM likes WHERE user_id = ? AND video_id = ?",
      args: [userId, vidInt]
    });

    if (existingLike.rows.length > 0) {
      // Toggle OFF: Remove like
      await turso.execute({
        sql: "DELETE FROM likes WHERE user_id = ? AND video_id = ?",
        args: [userId, vidInt]
      });
      await turso.execute({
        sql: "UPDATE videos SET likesCount = MAX(0, likesCount - 1) WHERE id = ?",
        args: [vidInt]
      });
      return NextResponse.json({ active: false });
    } else {
      // Toggle ON: Add like, check/remove dislike for mutual exclusion
      const existingDislike = await turso.execute({
        sql: "SELECT 1 FROM dislikes WHERE user_id = ? AND video_id = ?",
        args: [userId, vidInt]
      });

      if (existingDislike.rows.length > 0) {
        await turso.execute({
          sql: "DELETE FROM dislikes WHERE user_id = ? AND video_id = ?",
          args: [userId, vidInt]
        });
        await turso.execute({
          sql: "UPDATE videos SET dislikesCount = MAX(0, dislikesCount - 1) WHERE id = ?",
          args: [vidInt]
        });
      }

      await turso.execute({
        sql: "INSERT INTO likes (user_id, video_id) VALUES (?, ?)",
        args: [userId, vidInt]
      });
      await turso.execute({
        sql: "UPDATE videos SET likesCount = likesCount + 1 WHERE id = ?",
        args: [vidInt]
      });
      return NextResponse.json({ active: true });
    }
  } catch (error: any) {
    console.error('Turso Like Error:', error);
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
        sql: "SELECT 1 FROM likes WHERE user_id = ? AND video_id = ?",
        args: [userId, parseInt(videoId, 10)]
      });
      return NextResponse.json({ active: result.rows.length > 0 });
    } else {
      // Return list for registry pages
      const result = await turso.execute({
        sql: "SELECT video_id FROM likes WHERE user_id = ?",
        args: [userId]
      });
      return NextResponse.json(result.rows.map(r => Number(r.video_id)));
    }
  } catch (error: any) {
    return NextResponse.json({ active: false });
  }
}
