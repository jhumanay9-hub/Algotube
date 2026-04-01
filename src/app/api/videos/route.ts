import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Handles Global Video Discovery from Turso SQL Mesh
 * Updated: Returns [] on error to prevent console noise.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '24');

    const result = await turso.execute({
      sql: "SELECT id, title, description, url, author_name, likesCount, dislikesCount FROM videos ORDER BY id DESC LIMIT ?",
      args: [limit]
    });
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Turso GET Videos Error:', error);
    // Return empty array instead of 500 to keep UI stable
    return NextResponse.json([]);
  }
}

/**
 * Registers a new transmission in the Turso Registry
 * Updated: Initialized counters to 0 and added automatic placeholder swap with stable Google-hosted URL.
 */
export async function POST(request: Request) {
  try {
    let { title, description, url, author_name } = await request.json();
    
    // Automatic swap for placeholder URLs to ensure playback stability
    // Using Google-hosted BigBuckBunny for superior CORS compatibility
    if (url && (url.includes('placeholder.com') || url.includes('mov_bbb.mp4'))) {
      url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    }
    
    // Prepared statement initializing engagement counters to 0
    await turso.execute({
      sql: `INSERT INTO videos (title, description, url, author_name, likesCount, dislikesCount) 
            VALUES (?, ?, ?, ?, 0, 0)`,
      args: [
        title, 
        description || '', 
        url, 
        author_name || 'Anonymous'
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Turso POST Video Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
