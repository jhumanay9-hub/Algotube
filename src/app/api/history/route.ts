import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json([], { status: 400 });

  try {
    const result = await turso.execute({
      sql: "SELECT videoId FROM history WHERE userId = ? ORDER BY watchedAt DESC LIMIT 100",
      args: [userId]
    });
    return NextResponse.json(result.rows.map(r => r.videoId));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, videoId } = await request.json();
    // Use INSERT OR REPLACE with current timestamp for history tracking
    await turso.execute({
      sql: "INSERT OR REPLACE INTO history (userId, videoId, watchedAt) VALUES (?, ?, ?)",
      args: [userId, videoId, new Date().toISOString()]
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
