const fs = require('fs');
const axios = require('axios');

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  if (process.env[k] === undefined) process.env[k] = v;
}

const headers = { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` };
const tests = [
  ['base-1', 'http://localhost:3123/api/pages?pagination%5Bpage%5D=1&pagination%5BpageSize%5D=1'],
  ['base-5', 'http://localhost:3123/api/pages?pagination%5Bpage%5D=1&pagination%5BpageSize%5D=5'],
  ['base-10', 'http://localhost:3123/api/pages?pagination%5Bpage%5D=1&pagination%5BpageSize%5D=10'],
  ['base-15', 'http://localhost:3123/api/pages?pagination%5Bpage%5D=1&pagination%5BpageSize%5D=15'],
  ['base-20', 'http://localhost:3123/api/pages?pagination%5Bpage%5D=1&pagination%5BpageSize%5D=20'],
  ['base-25', 'http://localhost:3123/api/pages?pagination%5Bpage%5D=1&pagination%5BpageSize%5D=25'],
  ['slug-25', 'http://localhost:3123/api/pages?fields%5B0%5D=slug&pagination%5Bpage%5D=1&pagination%5BpageSize%5D=25'],
];

(async () => {
  for (const [label, url] of tests) {
    try {
      const r = await axios.get(url, { headers });
      console.log(`${label} OK ${JSON.stringify({ count: Array.isArray(r.data?.data) ? r.data.data.length : null, firstSlug: r.data?.data?.[0]?.slug || null, lastSlug: r.data?.data?.[r.data.data.length - 1]?.slug || null })}`);
    } catch (e) {
      console.log(`${label} FAIL ${JSON.stringify({ status: e.response?.status, data: e.response?.data, message: e.message })}`);
    }
  }
})();
