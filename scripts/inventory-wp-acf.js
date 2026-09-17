const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({ host: '66.29.149.122', port: 3306, user: 'root', password: 'f7268cca620445f0', database: 'qbotica_strapi' });

    const [fieldKeys] = await conn.query("SELECT DISTINCT meta_key FROM qbo_postmeta WHERE meta_key LIKE 'field_%' LIMIT 200");
    console.log('FIELD_KEYS_START');
    console.log(JSON.stringify(fieldKeys.map(r => r.meta_key), null, 2));
    console.log('FIELD_KEYS_END');

    const [acfPosts] = await conn.query("SELECT ID, post_title, post_type FROM qbo_posts WHERE post_type LIKE 'acf%' LIMIT 200");
    console.log('ACF_POSTS_START');
    console.log(JSON.stringify(acfPosts, null, 2));
    console.log('ACF_POSTS_END');

    const [topMeta] = await conn.query("SELECT meta_key, COUNT(*) as c FROM qbo_postmeta GROUP BY meta_key ORDER BY c DESC LIMIT 50");
    console.log('TOP_META_START');
    console.log(JSON.stringify(topMeta, null, 2));
    console.log('TOP_META_END');

    await conn.end();
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(1);
  }
})();
