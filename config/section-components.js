const HOME_COMPONENTS = [
  "acf-sections.banner-layout",
  "acf-sections.home-key-highlights",
  "acf-sections.home-automation-edge",
  "acf-sections.home-industry-automation-solutions",
  "acf-sections.home-featured-case-study",
  "acf-sections.home-testimonial-highlight",
  "acf-sections.home-client-logo",
  "acf-sections.home-awards-and-certificates",
  "acf-sections.home-award-winner",
  "acf-sections.home-partner",
  "acf-sections.home-blog-post",
];

const COMMON_COMPONENTS = [
  "acf-sections.common-cta",
  "acf-sections.footer-common-cta",
  "acf-sections.text-image-cta-section",
  "acf-sections.grid-layout",
  "acf-sections.content-highlight-block",
  "acf-sections.info-cta-box",
  "acf-sections.faq-section-block",
  "acf-sections.side-image-info-blocks",
  "acf-sections.common-heading-section",
  "acf-sections.general-cta-section",
  "acf-sections.two-column-text-cta",
  "acf-sections.common-slider",
  "acf-sections.spacing",
  "acf-sections.section-space-padding",
  "acf-sections.unmapped-layout",
];

const BLOG_RESOURCE_COMPONENTS = [
  "acf-sections.blog-layout",
  "acf-sections.latest-post",
  "acf-sections.latest-webinars",
  "acf-sections.featured-webinars-media",
  "acf-sections.common-posts-slider",
  "acf-sections.classic-post-slider",
  "acf-sections.resource-grid-layout",
  "acf-sections.use-cases-grid",
  "acf-sections.use-case-single",
  "acf-sections.white-paper-single",
  "acf-sections.usecase-industry-filter",
  "acf-sections.usecase-highlight-block",
  "acf-sections.content-layout",
  "acf-sections.section-heading-with-columns",
  "acf-sections.content-image-split-block",
  "acf-sections.feature-highlight-block",
  "acf-sections.timeline-sections",
  "acf-sections.session-item-sections",
  "acf-sections.roundtable-sessions-sections",
];

const SERVICE_COMPONENTS = [
  "acf-sections.service-overview",
  "acf-sections.solutions-key-benefits",
  "acf-sections.industry-highlight-block",
  "acf-sections.text-image-split-block",
  "acf-sections.image-with-keypoints",
  "acf-sections.image-form-section",
  "acf-sections.ai-tech-overview",
  "acf-sections.text-table-block",
  "acf-sections.industry-ai-use-cases",
  "acf-sections.benefits-grid-layout",
  "acf-sections.step-cards-section",
  "acf-sections.solution-hero-banner-with-cta",
  "acf-sections.solutions-feature-block",
  "acf-sections.healthcare-automation-solutions",
  "acf-sections.collaborations-section",
  "acf-sections.partner-highlight-section",
  "acf-sections.healthcare-automation-tabs",
  "acf-sections.automation-cta-block",
  "acf-sections.package-card-section",
  "acf-sections.kognitos-benefits-section",
  "acf-sections.why-kognitos-section",
  "acf-sections.how-it-works-section",
  "acf-sections.our-capabilities-section",
];

const ABOUT_COMPONENTS = [
  "acf-sections.about-banner-layout",
  "acf-sections.about-awards-section",
  "acf-sections.about-partner-section",
  "acf-sections.about-client-logo-section",
  "acf-sections.about-team-section",
  "acf-sections.about-company-ethos-section",
  "acf-sections.about-grid-layout",
  "acf-sections.about-diversity-section",
  "acf-sections.about-training-section",
  "acf-sections.about-strategic-highlights-section",
  "acf-sections.about-latest-updates-section",
  "acf-sections.about-location-section",
];

const TEAM_CAREER_COMPONENTS = [
  "acf-sections.team-highlight-block",
  "acf-sections.hiring-process-steps-layout",
  "acf-sections.career-openings-section",
  "acf-sections.form-with-contact-info",
  "acf-sections.contact-location-section",
];

const SHARED_FEATURE_COMPONENTS = [
  "acf-sections.image-text-feature-boxes",
  "acf-sections.impact-highlights-section",
  "acf-sections.partner-showcase-block",
];

const PAGE_BUILDER_COMPONENTS = [
  ...HOME_COMPONENTS,
  ...COMMON_COMPONENTS,
  ...BLOG_RESOURCE_COMPONENTS,
  ...SERVICE_COMPONENTS,
  ...ABOUT_COMPONENTS,
  ...TEAM_CAREER_COMPONENTS,
  ...SHARED_FEATURE_COMPONENTS,
];

const LANDING_SECTION_COMPONENTS = [
  ...HOME_COMPONENTS,
  ...COMMON_COMPONENTS,
  ...SHARED_FEATURE_COMPONENTS,
];

const BLOG_SECTION_COMPONENTS = [
  ...BLOG_RESOURCE_COMPONENTS,
  ...COMMON_COMPONENTS,
  ...SHARED_FEATURE_COMPONENTS,
];

const ABOUT_SECTION_COMPONENTS = [
  ...ABOUT_COMPONENTS,
  ...COMMON_COMPONENTS,
  ...SHARED_FEATURE_COMPONENTS,
];

const SERVICE_SECTION_COMPONENTS = [
  ...SERVICE_COMPONENTS,
  ...COMMON_COMPONENTS,
  ...SHARED_FEATURE_COMPONENTS,
];

const CAREER_SECTION_COMPONENTS = [
  ...TEAM_CAREER_COMPONENTS,
  ...COMMON_COMPONENTS,
  ...SHARED_FEATURE_COMPONENTS,
];

const RESOURCE_SECTION_COMPONENTS = [
  ...BLOG_RESOURCE_COMPONENTS,
  ...COMMON_COMPONENTS,
  ...SHARED_FEATURE_COMPONENTS,
];

module.exports = {
  LANDING_SECTION_COMPONENTS,
  BLOG_SECTION_COMPONENTS,
  ABOUT_SECTION_COMPONENTS,
  SERVICE_SECTION_COMPONENTS,
  CAREER_SECTION_COMPONENTS,
  RESOURCE_SECTION_COMPONENTS,
  PAGE_BUILDER_COMPONENTS,
};