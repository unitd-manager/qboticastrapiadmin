const fs = require('fs');
const path = require('path');
const axios = require('axios');
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnv(path.join(process.cwd(), '.env'));
const token = process.env.STRAPI_API_TOKEN || '';
const headers = token ? { Authorization: `Bearer ${token}` } : {};
(async () => {
  for (let page = 176; page <= 200; page += 1) {
    const url = `http://localhost:3123/api/pages?pagination[page]=${page}&pagination[pageSize]=1`;
    const res = await axios.get(url, { headers, validateStatus: () => true });
    const first = Array.isArray(res.data?.data) ? res.data.data[0] : null;
    console.log(JSON.stringify({ page, status: res.status, title: first?.title || null, slug: first?.slug || null, body: res.data?.error?.message || null }));
  }
})().catch((error) => { console.error(error.message || error); process.exit(1); });
