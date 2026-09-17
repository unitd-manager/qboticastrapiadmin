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

async function getAttachment(conn, attachmentId) {
  if (!attachmentId) return null;
  const [rows] = await conn.query(
    `SELECT ID, guid, post_title, post_name FROM qbo_posts WHERE ID = ? AND post_type = 'attachment'`,
    [attachmentId]
  );
  return rows[0] || null;
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
    const [testimonials] = await conn.query('SELECT ID, post_title, post_name FROM qbo_posts WHERE post_type = "testimonial"');
    console.log(`Found ${testimonials.length} testimonials in WordPress`);

    for (const wpTestimonial of testimonials) {
      console.log(`\nProcessing: ${wpTestimonial.post_title}`);
      
      const [metaRows] = await conn.query('SELECT meta_key, meta_value FROM qbo_postmeta WHERE post_id = ?', [wpTestimonial.ID]);
      const meta = {};
      for (const m of metaRows) {
        meta[m.meta_key] = m.meta_value;
      }

      const name = meta.name;
      const designation = meta.designation;
      const testimonialText = meta.description;
      const logoId = meta.company_logo ? Number(meta.company_logo) : null;
      
      // Check if testimonial already exists in Strapi
      const [existing] = await conn.query('SELECT * FROM testimonials WHERE name = ?', [name]);
      
      if (existing.length > 0) {
        console.log('  Already exists, skipping');
        continue;
      }

      // Prepare data for insert
      let imageId = null;
      if (logoId) {
        const [media] = await conn.query('SELECT id FROM files WHERE (url LIKE ? OR name = ?) LIMIT 1', [
          `%${logoId}%`,
          `attachment-${logoId}`
        ]);
        if (media.length > 0) {
          imageId = media[0].id;
        }
      }

      // Insert testimonial
      const [insertResult] = await conn.query(
        'INSERT INTO testimonials (name, designation, testimonial) VALUES (?, ?, ?)',
        [name, designation, testimonialText]
      );
      const testimonialId = insertResult.insertId;
      console.log(`  Created Strapi testimonial: ${testimonialId}`);

      // If image exists, link it
      if (imageId) {
        const [linkExists] = await conn.query('SHOW TABLES LIKE "testimonials_image_links"');
        if (linkExists.length > 0) {
          await conn.query(
            'INSERT INTO testimonials_image_links (testimonial_id, file_id, `order`) VALUES (?, ?, 1)',
            [testimonialId, imageId]
          );
          console.log(`  Linked image: ${imageId}`);
        }
      }
    }

    console.log('\nTestimonial migration complete!');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});