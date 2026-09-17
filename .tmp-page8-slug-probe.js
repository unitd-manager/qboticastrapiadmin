const axios = require('axios');
const slugs = [
  'intelligent-document-automation',
  'qbotica-layout-sample',
  'qbotica-layout',
  'how-qbotica-helped-a-leading-manufacturer-reduce-documentation-errors-by-99',
  'qbotica-layout-sample2',
  'qbotica-layout-sample-3',
  'intelligent-document-processing',
  'how-qbotica-helped-a-leading-manufacturer-reduce-documentation-errors-by-99-2',
  'solutions-2',
  'home-3',
  'how-qbotica-helped-a-government-organization-improve-document-accuracy-by-99',
  'contractual-data-obligations',
  'how-qbotica-helped-a-global-non-profit-organization-create-a-safe-learning-environment-for-kids',
  'how-qbotica-helped-a-global-non-profit-organization-create-a-safe-learning-environment-for-kids-2',
  'real-estate-giant-transforms-operations-with-qbotica-cuts-processing-fee-and-manual-work',
  'driving-innovation-and-growth-through-intelligent-automation',
  'layout-for-testing',
  'layout',
  'intelligent-document-processing-2',
  'how-qbotica-enabled-automated-drug-tests-for-a-metropolitan-transit-system',
  'how-qbotica-enabled-automated-data-entry-for-a-railroad-association',
  'how-qbotica-enabled-automated-credit-dispute-verification-for-a-credit-card-company',
  'how-qbotica-enabled-a-transportation-and-supply-chain-software-company-process-500-documents-in-a-day',
  'test-an-layout',
  'fusion-happy-hour'
];
(async () => {
  for (const slug of slugs) {
    const url = `http://localhost:3123/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    try {
      const res = await axios.get(url, { validateStatus: () => true });
      console.log(JSON.stringify({ slug, status: res.status, count: Array.isArray(res.data?.data) ? res.data.data.length : null }));
    } catch (error) {
      console.log(JSON.stringify({ slug, error: error.message || String(error) }));
    }
  }
})().catch((error) => { console.error(error.message || error); process.exit(1); });
