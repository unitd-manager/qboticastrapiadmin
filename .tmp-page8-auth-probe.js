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
const slugs = [
  'intelligent-document-automation','qbotica-layout-sample','qbotica-layout','how-qbotica-helped-a-leading-manufacturer-reduce-documentation-errors-by-99','qbotica-layout-sample2','qbotica-layout-sample-3','intelligent-document-processing','how-qbotica-helped-a-leading-manufacturer-reduce-documentation-errors-by-99-2','solutions-2','home-3','how-qbotica-helped-a-government-organization-improve-document-accuracy-by-99','contractual-data-obligations','how-qbotica-helped-a-global-non-profit-organization-create-a-safe-learning-environment-for-kids','how-qbotica-helped-a-global-non-profit-organization-create-a-safe-learning-environment-for-kids-2','real-estate-giant-transforms-operations-with-qbotica-cuts-processing-fee-and-manual-work','driving-innovation-and-growth-through-intelligent-automation','layout-for-testing','layout','intelligent-document-processing-2','how-qbotica-enabled-automated-drug-tests-for-a-metropolitan-transit-system','how-qbotica-enabled-automated-data-entry-for-a-railroad-association','how-qbotica-enabled-automated-credit-dispute-verification-for-a-credit-card-company','how-qbotica-enabled-a-transportation-and-supply-chain-software-company-process-500-documents-in-a-day','test-an-layout','fusion-happy-hour'
];
(async () => {
  for (const slug of slugs) {
    const url = `http://localhost:3123/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    const res = await axios.get(url, { headers, validateStatus: () => true });
    console.log(JSON.stringify({ slug, status: res.status, body: res.data?.error?.message || null, count: Array.isArray(res.data?.data) ? res.data.data.length : null }));
  }
})().catch((error) => { console.error(error.message || error); process.exit(1); });
