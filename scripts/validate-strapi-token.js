#!/usr/bin/env node
const axios = require('axios');
const FormData = require('form-data');

const STRAPI_URL = process.env.STRAPI_URL || process.argv[2] || 'http://localhost:3123';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || process.argv[3] || '';
const CONTENT_PATH = process.env.TEST_CONTENT_PATH || process.argv[4] || '/api/categories';
const TEST_PAYLOAD = process.env.TEST_PAYLOAD || ''; // optional JSON string

if (!STRAPI_TOKEN) {
  console.error('ERROR: STRAPI_API_TOKEN not set. Provide env or arg.');
  process.exit(2);
}

const headersWithToken = (extra = {}) => ({
  Authorization: `Bearer ${STRAPI_TOKEN}`,
  ...extra,
});

const doOptions = async (path) => {
  try {
    const res = await axios.options(STRAPI_URL + path, { headers: headersWithToken() });
    return { ok: true, allow: res.headers.allow || '' };
  } catch (err) {
    return { ok: false, error: err.response ? err.response.status + ' ' + JSON.stringify(err.response.data) : err.message };
  }
};

const testUpload = async () => {
  try {
    const form = new FormData();
    form.append('files', Buffer.from('token-validation'), { filename: 'token-validation.txt' });
    const res = await axios.post(STRAPI_URL + '/api/upload', form, { headers: headersWithToken(form.getHeaders()), maxBodyLength: Infinity });
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, error: err.response ? err.response.status + ' ' + JSON.stringify(err.response.data) : err.message };
  }
};

const testCreateContent = async (path, payload) => {
  try {
    const res = await axios.post(STRAPI_URL + path, payload, { headers: headersWithToken({ 'Content-Type': 'application/json' }) });
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, error: err.response ? err.response.status + ' ' + JSON.stringify(err.response.data) : err.message };
  }
};

(async function main(){
  console.log(JSON.stringify({ action: 'start', url: STRAPI_URL, contentPath: CONTENT_PATH }));

  const uploadOptions = await doOptions('/api/upload');
  const contentOptions = await doOptions(CONTENT_PATH);

  const result = { uploadOptions, contentOptions, uploadTest: null, contentCreateTest: null };

  // attempt upload if OPTIONS allows POST or if not, still try
  const uploadRes = await testUpload();
  result.uploadTest = uploadRes;

  // attempt creating a content entry if TEST_PAYLOAD provided or default simple payload
  let payload;
  if (TEST_PAYLOAD) {
    try { payload = JSON.parse(TEST_PAYLOAD); } catch(e) { payload = { data: { note: TEST_PAYLOAD } }; }
  } else {
    payload = { data: { name: `token-test-${Date.now()}`, slug: `token-test-${Date.now()}` } };
  }

  const contentRes = await testCreateContent(CONTENT_PATH, payload);
  result.contentCreateTest = contentRes;

  console.log(JSON.stringify(result, null, 2));

  const success = (uploadRes.ok || contentRes.ok);
  process.exit(success ? 0 : 1);
})();
