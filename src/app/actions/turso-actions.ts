'use server';

import { turso } from '@/lib/turso';

/**
 * Handles User Profile Persistence in Turso SQL Mesh
 */
export async function getTursoProfile(userId: string) {
  try {
    const result = await turso.execute({
      sql: "SELECT * FROM user_profiles WHERE id = ?",
      args: [userId]
    });
    return result.rows[0] || null;
  } catch (error) {
    console.error('Turso Profile Fetch Error:', error);
    return null;
  }
}

export async function saveTursoProfile(profile: any) {
  try {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO user_profiles (id, username, email, profilePictureUrl, bio, joinedAt) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        profile.id, 
        profile.username, 
        profile.email, 
        profile.profilePictureUrl || '', 
        profile.bio || '', 
        profile.joinedAt || new Date().toISOString()
      ]
    });
    return { success: true };
  } catch (error) {
    console.error('Turso Profile Save Error:', error);
    throw new Error('Failed to persist profile to SQL mesh');
  }
}

/**
 * Global Video Registry Sync (Turso)
 */
export async function getTursoVideos(category = 'All') {
  try {
    let sql = "SELECT * FROM videos";
    const args = [];
    if (category !== 'All') {
      sql += " WHERE category = ?";
      args.push(category);
    }
    sql += " ORDER BY uploadDate DESC";
    const result = await turso.execute({ sql, args });
    return result.rows.map(row => ({
      ...row,
      tags: typeof row.tags === 'string' ? row.tags.split(',') : row.tags,
      creator: row.uploaderId // Mapping uploaderId to creator for UI compatibility
    }));
  } catch (error) {
    console.error('Turso Video Registry Error:', error);
    return [];
  }
}

/**
 * Social Interaction Aggregates
 */
export async function getTursoUserSocialData(userId: string) {
  try {
    const [likes, subs, history] = await Promise.all([
      turso.execute({ sql: "SELECT videoId FROM likes WHERE userId = ?", args: [userId] }),
      turso.execute({ sql: "SELECT creatorId FROM subscriptions WHERE userId = ?", args: [userId] }),
      turso.execute({ sql: "SELECT videoId FROM history WHERE userId = ? ORDER BY watchedAt DESC LIMIT 50", args: [userId] })
    ]);

    return {
      likedVideoIds: likes.rows.map(r => r.videoId),
      subscribedCreatorIds: subs.rows.map(r => r.creatorId),
      historyVideoIds: history.rows.map(r => r.videoId)
    };
  } catch (error) {
    console.error('Turso Social Sync Error:', error);
    return { likedVideoIds: [], subscribedCreatorIds: [], historyVideoIds: [] };
  }
}
