import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  try {
    const result = await turso.execute({
      sql: "SELECT * FROM user_profiles WHERE id = ?",
      args: [userId]
    });
    return NextResponse.json(result.rows[0] || null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await turso.execute({
      sql: `INSERT OR REPLACE INTO user_profiles (id, username, email, profilePictureUrl, bio, joinedAt) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        data.id, 
        data.username, 
        data.email, 
        data.profilePictureUrl || '', 
        data.bio || '', 
        data.joinedAt || new Date().toISOString()
      ]
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
