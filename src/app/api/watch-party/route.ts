import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Watch Party Sync API
 * Handles broadcasting and fetching playback state across the mesh.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });

  try {
    const result = await turso.execute({
      sql: "SELECT * FROM watch_party_sync WHERE roomId = ?",
      args: [roomId]
    });
    return NextResponse.json(result.rows[0] || null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { roomId, leaderId, currentTime, isPaused } = await request.json();
    
    // UPSERT logic for the sync state
    await turso.execute({
      sql: `INSERT INTO watch_party_sync (roomId, leaderId, currentTime, isPaused, updatedAt) 
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(roomId) DO UPDATE SET 
            currentTime = excluded.currentTime,
            isPaused = excluded.isPaused,
            updatedAt = excluded.updatedAt,
            leaderId = excluded.leaderId`,
      args: [roomId, leaderId, currentTime, isPaused, new Date().toISOString()]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
