import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

/**
 * Handles Global Video Discovery from Turso SQL Mesh
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '24');

  try {
    let query = "SELECT * FROM videos";
    let args: any[] = [];

    if (category && category !== 'All') {
      query += " WHERE category = ?";
      args.push(category);
    }

    query += " ORDER BY uploadDate DESC LIMIT ?";
    args.push(limit);

    const result = await turso.execute({ sql: query, args });
    
    const videos = result.rows.map(row => ({
      ...row,
      tags: typeof row.tags === 'string' ? row.tags.split(',') : row.tags,
      creator: row.uploaderId 
    }));

    return NextResponse.json(videos);
  } catch (error: any) {
    console.error('Turso GET Videos Error:', error);
    return NextResponse.json({ error: 'Failed to fetch from SQL mesh' }, { status: 500 });
  }
}

/**
 * Registers a new transmission in the Turso Registry
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    await turso.execute({
      sql: `INSERT INTO videos (
        id, title, description, videoUrl, thumbnailUrl, uploaderId, 
        uploadDate, viewsCount, likesCount, category, tags, 
        aspectRatio, s3Key, s3Bucket
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.id, data.title, data.description, data.videoUrl, data.thumbnail, 
        data.uploaderId, data.uploadDate, 0, 0, data.category, 
        Array.isArray(data.tags) ? data.tags.join(',') : '', 
        data.aspectRatio, data.s3Key, data.s3Bucket
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Turso POST Video Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
