
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Handles social subscriptions in the Turso mesh
 */
export async function POST(request: Request) {
  try {
    const { userId, creatorId } = await request.json();
    
    const existing = await turso.execute({
      sql: "SELECT * FROM subscriptions WHERE userId = ? AND creatorId = ?",
      args: [userId, creatorId]
    });

    let isSubscribedNow = false;

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: "DELETE FROM subscriptions WHERE userId = ? AND creatorId = ?",
        args: [userId, creatorId]
      });
    } else {
      await turso.execute({
        sql: "INSERT INTO subscriptions (userId, creatorId) VALUES (?, ?)",
        args: [userId, creatorId]
      });
      isSubscribedNow = true;
    }

    return NextResponse.json({ isSubscribedNow });
  } catch (error: any) {
    console.error('Turso Subscription Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json([]);

  try {
    const result = await turso.execute({
      sql: "SELECT creatorId FROM subscriptions WHERE userId = ?",
      args: [userId]
    });
    return NextResponse.json(result.rows.map(r => r.creatorId));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
