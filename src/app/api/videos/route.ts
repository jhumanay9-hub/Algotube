import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Handles Global Video Discovery from Turso SQL Mesh
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '24');

    // Simple fetch based on the exact schema: id, title, description, url, author_name
    const result = await turso.execute({
      sql: "SELECT id, title, description, url, author_name FROM videos ORDER BY id DESC LIMIT ?",
      args: [limit]
    });
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Turso GET Videos Error:', error);
    return NextResponse.json({ error: 'Failed to fetch from SQL mesh' }, { status: 500 });
  }
}

/**
 * Registers a new transmission in the Turso Registry
 * Matches EXACT schema: title, description, url, author_name
 * id is handled by DB auto-increment.
 */
export async function POST(request: Request) {
  try {
    const { title, description, url, author_name } = await request.json();
    
    // Prepared statement for security
    await turso.execute({
      sql: `INSERT INTO videos (title, description, url, author_name) 
            VALUES (?, ?, ?, ?)`,
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
