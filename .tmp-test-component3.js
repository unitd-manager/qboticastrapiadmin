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
const component = payload.data.pageBuilder[2];
console.log(JSON.stringify({ component, titleLength: String(component.title || '').length, descriptionLength: String(component.description || '').length }, null, 2));
(async () => {
  for (const variant of [
    { label: 'as-is', component },
    { label: 'no-title', component: { ...component, title: 'Customer Quote' } },
    { label: 'as-features', component: { __component: 'sections.features', title: 'Customer Quote', description: component.description, items: { raw: component } } },
    { label: 'as-testimonial', component: { __component: 'sections.testimonial-section', title: 'Customer Quote', description: component.description, testimonials: [{ author: 'Harveer Singh', quote: component.description }] } },
  ]) {
    try {
      const res = await axios.post(`${baseUrl}/api/pages`, { data: { title: `Variant ${variant.label}`, slug: `pricing-variant-${variant.label}`, pageBuilder: [variant.component] } }, { headers });
      console.log(`OK ${variant.label} ${res.data?.data?.documentId || ''}`);
    } catch (error) {
      console.log(`FAIL ${variant.label}`);
      console.log(JSON.stringify({ status: error.response?.status, data: error.response?.data, message: error.message }, null, 2));
    }
  }
})().catch((error) => { console.error(error); process.exit(1); });
