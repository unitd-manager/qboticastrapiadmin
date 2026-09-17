#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sepIdx = trimmed.indexOf('=');
    if (sepIdx === -1) continue;
    const key = trimmed.slice(0, sepIdx).trim();
    const value = trimmed.slice(sepIdx + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)"$/, '$1');
    if (!key || process.env[key]) continue;
    process.env[key] = value;
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
  });

  try {
    const [wpComments] = await conn.query('SELECT * FROM qbo_comments');
    console.log(`Found ${wpComments.length} comments in WordPress`);

    const wpPostIdToStrapiPostId = new Map();
    const [strapiPosts] = await conn.query('SELECT id, acf FROM posts');
    for (const post of strapiPosts) {
      if (post.acf && post.acf._migration && post.acf._migration.wpId) {
        wpPostIdToStrapiPostId.set(Number(post.acf._migration.wpId), post.id);
      }
    }
    console.log(`Mapped ${wpPostIdToStrapiPostId.size} WordPress -> Strapi post IDs`);

    const wpCommentIdToStrapiCommentId = new Map();

    // First pass: insert all top-level comments (parent=0)
    for (const wpComment of wpComments) {
      if (wpComment.comment_parent === 0) {
        const approved = wpComment.comment_approved === '1';
        const postId = wpPostIdToStrapiPostId.get(wpComment.comment_post_ID) || null;
        
        const [existing] = await conn.query('SELECT * FROM comments WHERE wpCommentId = ?', [wpComment.comment_ID]);
        if (existing.length > 0) {
          wpCommentIdToStrapiCommentId.set(wpComment.comment_ID, existing[0].id);
          continue;
        }

        const [insertResult] = await conn.query(
          'INSERT INTO comments (author, email, url, content, approved, wpCommentId, post_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            wpComment.comment_author,
            wpComment.comment_author_email,
            wpComment.comment_author_url,
            wpComment.comment_content,
            approved,
            wpComment.comment_ID,
            postId
          ]
        );
        wpCommentIdToStrapiCommentId.set(wpComment.comment_ID, insertResult.insertId);
      }
    }

    // Second pass: insert all child comments
    for (const wpComment of wpComments) {
      if (wpComment.comment_parent > 0) {
        const approved = wpComment.comment_approved === '1';
        const postId = wpPostIdToStrapiPostId.get(wpComment.comment_post_ID) || null;
        const parentStrapiId = wpCommentIdToStrapiCommentId.get(wpComment.comment_parent) || null;

        const [existing] = await conn.query('SELECT * FROM comments WHERE wpCommentId = ?', [wpComment.comment_ID]);
        if (existing.length > 0) continue;

        const [insertResult] = await conn.query(
          'INSERT INTO comments (author, email, url, content, approved, wpCommentId, post_id, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            wpComment.comment_author,
            wpComment.comment_author_email,
            wpComment.comment_author_url,
            wpComment.comment_content,
            approved,
            wpComment.comment_ID,
            postId,
            parentStrapiId
          ]
        );
        wpCommentIdToStrapiCommentId.set(wpComment.comment_ID, insertResult.insertId);
      }
    }

    console.log(`\nComment migration complete!`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});