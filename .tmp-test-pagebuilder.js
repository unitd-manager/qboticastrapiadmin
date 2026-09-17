const fs = require('fs');
const path = require('path');
const axios = require('axios');

for (const line of fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  if (process.env[k] === undefined) process.env[k] = v;
}
const baseUrl = process.env.STRAPI_URL || 'http://localhost:3123';
const token = process.env.STRAPI_API_TOKEN;
const headers = { Authorization: `Bearer ${token}` };
const payload = JSON.parse(fs.readFileSync('.tmp-pricing-payload.json', 'utf8'));
const builder = payload.data.pageBuilder || [];

(async () => {
  for (let i = 1; i <= builder.length; i += 1) {
    const slug = `pricing-debug-${i}`;
    try {
      const created = await axios.post(`${baseUrl}/api/pages`, {
        data: {
          title: `Pricing Debug ${i}`,
          slug,
          pageBuilder: builder.slice(0, i),
        },
      }, { headers });
      console.log(`OK ${i} ${created.data?.data?.documentId || ''}`);
    } catch (error) {
      console.log(`FAIL ${i}`);
      console.log(JSON.stringify({
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      }, null, 2));
      break;
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
