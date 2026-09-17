import type { Schema, Struct } from '@strapi/strapi';

export interface AcfSectionsAboutAwardsSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_awards_section';
  info: {
    displayName: 'Awards Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    awards: Schema.Attribute.Component<
      'acf-shared.about-awards-section-awards',
      true
    >;
    certifications: Schema.Attribute.Component<
      'acf-shared.about-awards-section-certifications',
      true
    >;
    class_name: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutBannerLayout extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_banner_layout';
  info: {
    displayName: 'Banner Layout';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutClientLogoSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_client_logo_section';
  info: {
    displayName: 'Client Logo Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    client_logos: Schema.Attribute.Component<
      'acf-shared.about-client-logo-section-client-logos',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutCompanyEthosSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_company_ethos_section';
  info: {
    displayName: 'Company Ethos Section';
  };
  attributes: {
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    ethos_items: Schema.Attribute.Component<
      'acf-shared.about-company-ethos-section-ethos-items',
      true
    >;
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutDiversitySection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_diversity_section';
  info: {
    displayName: 'Diversity Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    designation: Schema.Attribute.String;
    name: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutGridLayout extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_grid_layout';
  info: {
    displayName: 'Grid Layout';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    grid_items: Schema.Attribute.Component<
      'acf-shared.about-grid-layout-grid-items',
      true
    >;
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutLatestUpdatesSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_latest_updates_section';
  info: {
    displayName: 'Latest Updates Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    items: Schema.Attribute.Component<
      'acf-shared.about-latest-updates-section-items',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutLocationSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_location_section';
  info: {
    displayName: 'Location Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    locations: Schema.Attribute.Component<
      'acf-shared.about-location-section-locations',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutPartnerSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_partner_section';
  info: {
    displayName: 'Partner Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    logo: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutStrategicHighlightsSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_strategic_highli_a16f76a7';
  info: {
    displayName: 'Strategic Highlights Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    enable_animation: Schema.Attribute.Enumeration<['true', 'false']>;
    image: Schema.Attribute.Media<'images'>;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.String;
    text_alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAboutTeamSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_team_section';
  info: {
    displayName: 'Team Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    main_description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_description: Schema.Attribute.RichText;
    sub_title: Schema.Attribute.String;
    team_members: Schema.Attribute.Component<
      'acf-shared.about-team-section-team-members',
      false
    >;
  };
}

export interface AcfSectionsAboutTrainingSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_about_training_section';
  info: {
    displayName: 'Training Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsAiTechOverview extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_ai_tech_overview';
  info: {
    displayName: 'AI Tech Overview';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    container_type: Schema.Attribute.Enumeration<
      ['container', 'container-fluid']
    >;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    image_col_class: Schema.Attribute.Enumeration<
      ['col-md-4', 'col-md-5', 'col-md-6']
    >;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    list: Schema.Attribute.Component<'acf-shared.ai-tech-overview-list', true>;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    show_image: Schema.Attribute.Enumeration<['true', 'false']>;
    text_alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']>;
    text_col_class: Schema.Attribute.Enumeration<
      ['col-md-6', 'col-md-7', 'col-md-8']
    >;
    vertical_align: Schema.Attribute.Enumeration<['top', 'middle', 'bottom']>;
  };
}

export interface AcfSectionsAutomationCtaBlock extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_automation_cta_block';
  info: {
    displayName: 'Automation CTA Block';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsBannerLayout extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_banner_layout';
  info: {
    displayName: 'Banner Layout';
  };
  attributes: {
    background_image: Schema.Attribute.Media<'images'>;
    banner_image: Schema.Attribute.Media<'images'>;
    banner_two_images: Schema.Attribute.Component<
      'acf-shared.banner-layout-banner-two-images',
      true
    >;
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    inner_video: Schema.Attribute.Media;
    logo: Schema.Attribute.Media<'images'>;
    main_title: Schema.Attribute.String;
    mobile_inner_video: Schema.Attribute.Media;
    page_type: Schema.Attribute.Enumeration<
      [
        'home',
        'home_two',
        'inner',
        'service',
        'solution_banner',
        'partner',
        'kognitos',
        'resources',
        'platform',
        'use_case',
        'best_uipath_partner',
      ]
    >;
    secondary_button: Schema.Attribute.Component<'shared.menu-item', false>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.String;
  };
}

export interface AcfSectionsBenefitsGridLayout extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_benefits_grid_layout';
  info: {
    displayName: 'Benefits Grid Layout';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    features: Schema.Attribute.Component<
      'acf-shared.benefits-grid-layout-features',
      true
    >;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsBlogLayout extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_blog_layout';
  info: {
    displayName: 'Blog Layout';
  };
  attributes: {
    description: Schema.Attribute.Text;
    main_title: Schema.Attribute.Text;
    post_per_page: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<5>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsCareerOpeningsSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_career_openings_section';
  info: {
    displayName: 'Career Openings Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    job_openings: Schema.Attribute.Component<
      'acf-shared.career-openings-section-job-openings',
      true
    >;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsClassicPostSlider extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_classic_post_slider';
  info: {
    displayName: 'Classic Post Slider';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    filter_by_category: Schema.Attribute.JSON;
    filter_by_post_format: Schema.Attribute.Enumeration<['all', 'standard']>;
    filter_by_tag: Schema.Attribute.JSON;
    main_title: Schema.Attribute.Text;
    posts_limit: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<5>;
    posts_to_show: Schema.Attribute.Enumeration<
      [
        'latest_published',
        'oldest_published',
        'latest_modified',
        'oldest_modified',
        'title_asc',
        'title_desc',
        'most_commented',
        'random',
        'custom',
      ]
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    show_date: Schema.Attribute.Enumeration<['yes', 'no']>;
    show_description: Schema.Attribute.Enumeration<['yes', 'no']>;
    show_feature_image: Schema.Attribute.Enumeration<['yes', 'no']>;
    show_title: Schema.Attribute.Enumeration<['yes', 'no']>;
    source: Schema.Attribute.Enumeration<['posts', 'related']>;
  };
}

export interface AcfSectionsCollaborationsSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_collaborations_section';
  info: {
    displayName: 'Collaborations Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    achievement_boxes: Schema.Attribute.Component<
      'acf-shared.collaborations-section-achievement-boxes',
      true
    >;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsCommonCta extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_common_cta';
  info: {
    displayName: 'Common CTA';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsCommonHeadingSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_common_heading_section';
  info: {
    displayName: 'Common Heading Section With CTA';
  };
  attributes: {
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.Text;
  };
}

export interface AcfSectionsCommonPostsSlider extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_common_posts_slider';
  info: {
    displayName: 'Common Posts / Pages Slider';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    common_description: Schema.Attribute.RichText;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    main_title: Schema.Attribute.Text;
    order_by: Schema.Attribute.Enumeration<['date', 'title', 'default']>;
    post_per_page: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<5>;
    post_type: Schema.Attribute.Enumeration<['post', 'page']>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    selected_items: Schema.Attribute.JSON &
      Schema.Attribute.CustomField<'plugin::custom.common-posts-picker'>;
    show_date: Schema.Attribute.Enumeration<['yes', 'no']>;
    show_description: Schema.Attribute.Enumeration<['yes', 'no']>;
    show_feature_image: Schema.Attribute.Enumeration<['yes', 'no']>;
    show_title: Schema.Attribute.Enumeration<['yes', 'no']>;
  };
}

export interface AcfSectionsCommonSlider extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_common_slider';
  info: {
    displayName: 'Common Slider';
  };
  attributes: {
    image_list: Schema.Attribute.Component<
      'acf-shared.common-slider-image-list',
      true
    >;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsContactLocationSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_contact_location_section';
  info: {
    displayName: 'Contact Location Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    locations: Schema.Attribute.Component<
      'acf-shared.contact-location-section-locations',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsContentHighlightBlock
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_content_highlight_block';
  info: {
    displayName: 'Content Highlight Block';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    enable_animation: Schema.Attribute.Enumeration<['true', 'false']>;
    image: Schema.Attribute.Media<'images'>;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    show_image: Schema.Attribute.Enumeration<['true', 'false']>;
    text_alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsContentImageSplitBlock
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_content_image_split_block';
  info: {
    displayName: 'Content Image Split Block';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsContentLayout extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_content_layout';
  info: {
    displayName: 'Content Layout';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    background_type: Schema.Attribute.Enumeration<['container', 'full']>;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.Text;
    video_iframe: Schema.Attribute.Text;
  };
}

export interface AcfSectionsFaqSectionBlock extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_faq_section_block';
  info: {
    displayName: 'FAQ Section Block';
  };
  attributes: {
    description: Schema.Attribute.Text;
    display_options: Schema.Attribute.JSON;
    faq_question_and_answer: Schema.Attribute.Component<
      'acf-shared.faq-section-block-faq-question-and-answer',
      true
    >;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsFeatureHighlightBlock
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_feature_highlight_block';
  info: {
    displayName: 'Feature Highlight Block';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    enable_animation: Schema.Attribute.Enumeration<['true', 'false']>;
    image: Schema.Attribute.Media<'images'>;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.String;
    text_alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsFeaturedWebinarsMedia
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_featured_webinars_media';
  info: {
    displayName: 'Featured Webinars Media';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    media_cards: Schema.Attribute.Component<
      'acf-shared.featured-webinars-media-media-cards',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsFooterCommonCta extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_footer_common_cta';
  info: {
    displayName: 'Footer Common CTA';
  };
  attributes: {
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    image: Schema.Attribute.Media<'images'>;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsFormWithContactInfo extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_form_with_contact_info';
  info: {
    displayName: 'Form With Contact Info';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    comment_form_col: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    comment_form_description: Schema.Attribute.RichText;
    comment_form_title: Schema.Attribute.String;
    contact_details: Schema.Attribute.Component<
      'acf-shared.form-with-contact-info-contact-details',
      true
    >;
    contact_details_col: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    show_comment_form: Schema.Attribute.Enumeration<['true', 'false']>;
    social_media_link: Schema.Attribute.Component<
      'acf-shared.form-with-contact-info-social-media-link',
      true
    >;
    social_media_title: Schema.Attribute.String;
  };
}

export interface AcfSectionsGeneralCtaSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_general_cta_section';
  info: {
    displayName: 'General CTA Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    main_title: Schema.Attribute.Text;
    secondary_cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_description: Schema.Attribute.Text;
  };
}

export interface AcfSectionsGridLayout extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_grid_layout';
  info: {
    displayName: 'Grid Layout';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    common_content: Schema.Attribute.RichText;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    grid_items: Schema.Attribute.Component<
      'acf-shared.grid-layout-grid-items',
      true
    >;
    image: Schema.Attribute.Media<'images'>;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.Text;
  };
}

export interface AcfSectionsHealthcareAutomationSolutions
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_healthcare_automation_solutions';
  info: {
    displayName: 'Healthcare Automation Solutions';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    class_name: Schema.Attribute.String;
    common_content: Schema.Attribute.RichText;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    enable_animation: Schema.Attribute.Enumeration<['true', 'false']>;
    image: Schema.Attribute.Media<'images'>;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    show_image: Schema.Attribute.Enumeration<['true', 'false']>;
    solutions: Schema.Attribute.Component<
      'acf-shared.healthcare-automation-solutions-solutions',
      true
    >;
    sub_title: Schema.Attribute.Text;
    text_alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsHealthcareAutomationTabs
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_healthcare_automation_tabs';
  info: {
    displayName: 'Healthcare Automation Tabs';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    main_title: Schema.Attribute.Text;
    overlay_text: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.Text;
    tabs: Schema.Attribute.Component<
      'acf-shared.healthcare-automation-tabs-tabs',
      true
    >;
  };
}

export interface AcfSectionsHiringProcessStepsLayout
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_hiring_process_steps_layout';
  info: {
    displayName: 'Hiring Process Steps Layout';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    steps: Schema.Attribute.Component<
      'acf-shared.hiring-process-steps-layout-steps',
      true
    >;
  };
}

export interface AcfSectionsHomeAutomationEdge extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_automation_edge';
  info: {
    displayName: 'Home Automation Edge';
  };
  attributes: {
    automation_edge_list: Schema.Attribute.Component<
      'acf-shared.home-automation-edge-automation-edge-list',
      true
    >;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsHomeAwardWinner extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_award_winner';
  info: {
    displayName: 'Home Award Winner';
  };
  attributes: {
    award_winner_list: Schema.Attribute.Component<
      'acf-shared.home-award-winner-award-winner-list',
      true
    >;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsHomeAwardsAndCertificates
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_awards_and_certificates';
  info: {
    displayName: 'Home Awards and Certificates';
  };
  attributes: {
    award_and_certificate_list: Schema.Attribute.Component<
      'acf-shared.home-awards-and-certificates-award-and-certificate-list',
      true
    >;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsHomeBlogPost extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_blog_post';
  info: {
    displayName: 'Home Blog Post';
  };
  attributes: {
    description: Schema.Attribute.Text;
    main_title: Schema.Attribute.Text;
    post_per_page: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<5>;
    post_type: Schema.Attribute.Enumeration<['recent_posts', 'select_post']>;
    recent_post_type: Schema.Attribute.Enumeration<
      ['newsroom', 'posts', 'usecases', 'case-studies']
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    select_post: Schema.Attribute.JSON;
  };
}

export interface AcfSectionsHomeClientLogo extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_client_logo';
  info: {
    displayName: 'Home Client Logo';
  };
  attributes: {
    logo_list: Schema.Attribute.Component<
      'acf-shared.home-client-logo-logo-list',
      true
    >;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsHomeFeaturedCaseStudy
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_featured_case_study';
  info: {
    displayName: 'Home Featured Case Study';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.Text;
    video_iframe: Schema.Attribute.Text;
  };
}

export interface AcfSectionsHomeIndustryAutomationSolutions
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_industry_automati_9fcdbe2e';
  info: {
    displayName: 'Home Industry Automation Solutions';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.Text;
    main_solutions: Schema.Attribute.Component<
      'acf-shared.home-industry-automation-solutions-main-solutions',
      true
    >;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsHomeKeyHighlights extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_key_highlights';
  info: {
    displayName: 'Home Key Highlights';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    highlights_list: Schema.Attribute.Component<
      'acf-shared.home-key-highlights-highlights-list',
      true
    >;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsHomePartner extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_partner';
  info: {
    displayName: 'Home  Partner';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.Text;
    workflow_list: Schema.Attribute.Component<
      'acf-shared.home-partner-workflow-list',
      true
    >;
  };
}

export interface AcfSectionsHomeTestimonialHighlight
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_home_testimonial_highlight';
  info: {
    displayName: 'Home Testimonial Highlight';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    main_title: Schema.Attribute.Text;
    order_by: Schema.Attribute.Enumeration<['ASC', 'DESC']>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    select_post_type: Schema.Attribute.Text;
  };
}

export interface AcfSectionsHowItWorksSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_how_it_works_section';
  info: {
    displayName: 'How IT Works Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    steps: Schema.Attribute.Component<
      'acf-shared.how-it-works-section-steps',
      true
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsImageFormSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_image_form_section';
  info: {
    displayName: 'Image Form Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    content_col: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    enable_animation: Schema.Attribute.Enumeration<['true', 'false']>;
    form_embed_code: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    image_col: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.Text;
    vertical_align: Schema.Attribute.Enumeration<['top', 'middle', 'bottom']>;
  };
}

export interface AcfSectionsImageTextFeatureBoxes
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_image_text_feature_boxes';
  info: {
    displayName: 'Image Text Feature Boxes';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    features: Schema.Attribute.Component<
      'acf-shared.image-text-feature-boxes-features',
      true
    >;
    image: Schema.Attribute.Media<'images'>;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsImageWithKeypoints extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_image_with_keypoints';
  info: {
    displayName: 'Image With Keypoints';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    common_content: Schema.Attribute.RichText;
    content_col: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    enable_animation: Schema.Attribute.Enumeration<['true', 'false']>;
    image: Schema.Attribute.Media<'images'>;
    image_col: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    key_point_title: Schema.Attribute.RichText;
    key_points: Schema.Attribute.Component<
      'acf-shared.image-with-keypoints-key-points',
      true
    >;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.Text;
    vertical_align: Schema.Attribute.Enumeration<['top', 'middle', 'bottom']>;
  };
}

export interface AcfSectionsImpactHighlightsSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_impact_highlights_section';
  info: {
    displayName: 'Impact Highlights Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.Enumeration<
      [
        'rgba(255, 119, 5, 0.05);',
        'rgba(255, 119, 5, 0.10)',
        '#FF7705',
        'linear-gradient(90deg, #D05F00 2.24%, #FF7705 99.69%)',
        'transparent',
      ]
    >;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    highlights: Schema.Attribute.Component<
      'acf-shared.impact-highlights-section-highlights',
      true
    >;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsIndustryAiUseCases extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_industry_ai_use_cases';
  info: {
    displayName: 'Industry AI Use Cases';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    use_cases: Schema.Attribute.Component<
      'acf-shared.industry-ai-use-cases-use-cases',
      true
    >;
  };
}

export interface AcfSectionsIndustryHighlightBlock
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_industry_highlight_block';
  info: {
    displayName: 'Industry Highlight Block';
  };
  attributes: {
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    list: Schema.Attribute.Component<
      'acf-shared.industry-highlight-block-list',
      true
    >;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsInfoCtaBox extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_info_cta_box';
  info: {
    displayName: 'Info CTA Box';
  };
  attributes: {
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.RichText;
  };
}

export interface AcfSectionsKognitosBenefitsSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_kognitos_benefits_section';
  info: {
    displayName: 'Kognitos Benefits Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    benefits: Schema.Attribute.Component<
      'acf-shared.kognitos-benefits-section-benefits',
      true
    >;
    class_name: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsLatestPost extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_latest_post';
  info: {
    displayName: 'Latest Post';
  };
  attributes: {
    display_type: Schema.Attribute.Enumeration<['last_post', 'select_post']>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    select_post: Schema.Attribute.JSON;
  };
}

export interface AcfSectionsLatestWebinars extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_latest_webinars';
  info: {
    displayName: 'Latest Webinars';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    webinars: Schema.Attribute.Component<
      'acf-shared.latest-webinars-webinars',
      true
    >;
  };
}

export interface AcfSectionsOurCapabilitiesSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_our_capabilities_section';
  info: {
    displayName: 'Our Capabilities Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    our_capabilities: Schema.Attribute.Component<
      'acf-shared.our-capabilities-section-our-capabilities',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsPackageCardSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_package_card_section';
  info: {
    displayName: 'Package Card Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    main_title: Schema.Attribute.String;
    package_cards: Schema.Attribute.Component<
      'acf-shared.package-card-section-package-cards',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsPartnerHighlightSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_partner_highlight_section';
  info: {
    displayName: 'Partner Highlight Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    image: Schema.Attribute.Media<'images'>;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    main_title: Schema.Attribute.Text;
    partner_highlights: Schema.Attribute.Component<
      'acf-shared.partner-highlight-section-partner-highlights',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.String;
    text_alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']>;
    vertical_align: Schema.Attribute.Enumeration<['top', 'middle', 'bottom']>;
  };
}

export interface AcfSectionsPartnerShowcaseBlock
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_partner_showcase_block';
  info: {
    displayName: 'Partner Showcase Block';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    main_title: Schema.Attribute.Text;
    partner_logos: Schema.Attribute.Component<
      'acf-shared.partner-showcase-block-partner-logos',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsResourceGridLayout extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_resource_grid_layout';
  info: {
    displayName: 'Resource Grid Layout';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    items: Schema.Attribute.Component<
      'acf-shared.resource-grid-layout-items',
      true
    >;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsRoundtableSessionsSections
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_roundtable_sessions_sections';
  info: {
    displayName: 'Roundtable Sessions Sections';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.String;
    roundtables: Schema.Attribute.Component<
      'acf-shared.roundtable-sessions-sections-roundtables',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsSectionHeadingWithColumns
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_section_heading_with_columns';
  info: {
    displayName: 'Section Heading With Columns';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    description_column: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    heading_column: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    heading_position: Schema.Attribute.Enumeration<['left', 'right']>;
    heading_tag: Schema.Attribute.Enumeration<
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    >;
    heading_text: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsSectionSpacePadding extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_section_space_padding';
  info: {
    displayName: 'Section Space (Padding)';
  };
  attributes: {
    desktop_padding: Schema.Attribute.Component<
      'acf-shared.section-space-padding-desktop-padding',
      false
    >;
    mobile_padding: Schema.Attribute.Component<
      'acf-shared.section-space-padding-mobile-padding',
      false
    >;
    padding_options: Schema.Attribute.Boolean;
    padding_position: Schema.Attribute.Component<
      'acf-shared.section-space-padding-position',
      false
    >;
  };
}

export interface AcfSectionsServiceOverview extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_service_overview';
  info: {
    displayName: 'Service Overview';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    overview_list: Schema.Attribute.Component<
      'acf-shared.service-overview-overview-list',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.RichText;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsSessionItemSections extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_session_item_sections';
  info: {
    displayName: 'Session Item Sections';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    session_tabs: Schema.Attribute.Component<
      'acf-shared.session-item-sections-session-tabs',
      true
    >;
  };
}

export interface AcfSectionsSideImageInfoBlocks extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_side_image_info_blocks';
  info: {
    displayName: 'Side Image Info Blocks';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    info_list: Schema.Attribute.Component<
      'acf-shared.side-image-info-blocks-info-list',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsSolutionHeroBannerWithCta
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_solution_hero_banner_with_cta';
  info: {
    displayName: 'Solution Hero Banner With CTA';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.Enumeration<
      [
        'rgba(255, 119, 5, 0.05);',
        'rgba(255, 119, 5, 0.10)',
        '#FF7705',
        'transparent',
      ]
    >;
    background_image: Schema.Attribute.Media<'images'>;
    buttons: Schema.Attribute.Component<
      'acf-shared.solution-hero-banner-with-cta-buttons',
      true
    >;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_description: Schema.Attribute.Text;
    tagline: Schema.Attribute.String;
  };
}

export interface AcfSectionsSolutionsFeatureBlock
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_solutions_feature_block';
  info: {
    displayName: 'Solutions Feature Block';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    common_content: Schema.Attribute.RichText;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    features: Schema.Attribute.Component<
      'acf-shared.solutions-feature-block-features',
      false
    >;
    highlighted_description: Schema.Attribute.RichText;
    highlighted_subtitle: Schema.Attribute.Text;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsSolutionsKeyBenefits
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_solutions_key_benefits';
  info: {
    displayName: 'Solutions Key Benefits';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    benefits: Schema.Attribute.Component<
      'acf-shared.solutions-key-benefits-benefits',
      true
    >;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsSpacing extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_spacing';
  info: {
    displayName: 'Spacing (Height)';
  };
  attributes: {
    background_color: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    space_height_desktop: Schema.Attribute.Integer;
    space_height_mobile: Schema.Attribute.Integer;
  };
}

export interface AcfSectionsStepCardsSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_step_cards_section';
  info: {
    displayName: 'Step Cards Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    steps: Schema.Attribute.Component<
      'acf-shared.step-cards-section-steps',
      true
    >;
  };
}

export interface AcfSectionsTeamHighlightBlock extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_team_highlight_block';
  info: {
    displayName: 'Team Highlight Block';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    background_color: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSectionsTextImageCtaSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_text_image_cta_section';
  info: {
    displayName: 'Text Image CTA Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    class_name: Schema.Attribute.String;
    container_type: Schema.Attribute.Enumeration<
      ['container', 'container-fluid']
    >;
    description: Schema.Attribute.RichText;
    enable_animation: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    image: Schema.Attribute.Media<'images'>;
    image_col_class: Schema.Attribute.Enumeration<
      ['col-md-4', 'col-md-5', 'col-md-6']
    >;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    show_image: Schema.Attribute.Enumeration<['true', 'false']>;
    text_alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']>;
    text_col_class: Schema.Attribute.Enumeration<
      ['col-md-6', 'col-md-7', 'col-md-8']
    >;
    title: Schema.Attribute.Text;
    vertical_align: Schema.Attribute.Enumeration<['top', 'middle', 'bottom']>;
  };
}

export interface AcfSectionsTextImageSplitBlock extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_text_image_split_block';
  info: {
    displayName: 'Text Image Split Block';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.Text;
  };
}

export interface AcfSectionsTextTableBlock extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_text_table_block';
  info: {
    displayName: 'Text Table Block';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    table: Schema.Attribute.Component<
      'acf-shared.text-table-block-table',
      false
    >;
  };
}

export interface AcfSectionsTimelineSections extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_timeline_sections';
  info: {
    displayName: 'Timeline Sections';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.Text;
    timelines: Schema.Attribute.Component<
      'acf-shared.timeline-sections-timelines',
      true
    >;
  };
}

export interface AcfSectionsTwoColumnTextCta extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_two_column_text_cta';
  info: {
    displayName: 'Two Column Text CTA';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsUnmappedLayout extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_unmapped_layout';
  info: {
    displayName: 'Unmapped Layout';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    layout_type: Schema.Attribute.String;
    raw_fields: Schema.Attribute.JSON;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.Text;
  };
}

export interface AcfSectionsUseCaseSingle extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_use_case_single';
  info: {
    displayName: 'Use Case Single';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    category_name: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sidebar_items: Schema.Attribute.Component<
      'acf-shared.use-case-single-sidebar-items',
      true
    >;
    use_case_items: Schema.Attribute.Component<
      'acf-shared.use-case-single-use-case-items',
      true
    >;
  };
}

export interface AcfSectionsUseCasesGrid extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_use_cases_grid';
  info: {
    displayName: 'Use Cases Grid';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    main_title: Schema.Attribute.Text;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    use_case_items: Schema.Attribute.Component<
      'acf-shared.use-cases-grid-use-case-items',
      true
    >;
  };
}

export interface AcfSectionsUsecaseHighlightBlock
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_usecase_highlight_block';
  info: {
    displayName: 'Usecase Highlight Block';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    display_options: Schema.Attribute.JSON;
    enable_animation: Schema.Attribute.Enumeration<['true', 'false']>;
    image: Schema.Attribute.Media<'images'>;
    image_position: Schema.Attribute.Enumeration<['left', 'right']>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    show_image: Schema.Attribute.Enumeration<['true', 'false']>;
    text_alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']>;
    title: Schema.Attribute.String;
    usecase_category: Schema.Attribute.String;
  };
}

export interface AcfSectionsUsecaseIndustryFilter
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_usecase_industry_filter';
  info: {
    displayName: 'Usecase Industry Filter';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    categories: Schema.Attribute.Component<
      'acf-shared.usecase-industry-filter-categories',
      true
    >;
    class_name: Schema.Attribute.String;
    main_title: Schema.Attribute.String;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
  };
}

export interface AcfSectionsWhitePaperSingle extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_white_paper_single';
  info: {
    displayName: 'White Paper Single';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    form_embed_code: Schema.Attribute.Text;
    form_title: Schema.Attribute.String;
    main_title: Schema.Attribute.Text;
    related_white_papers: Schema.Attribute.Component<
      'acf-shared.white-paper-single-related-white-papers',
      true
    >;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    sub_title: Schema.Attribute.String;
  };
}

export interface AcfSectionsWhyKognitosSection extends Struct.ComponentSchema {
  collectionName: 'components_acf_sections_why_kognitos_section';
  info: {
    displayName: 'Why Kognitos Section';
  };
  attributes: {
    acf_id: Schema.Attribute.String;
    benefits: Schema.Attribute.Component<
      'acf-shared.why-kognitos-section-benefits',
      true
    >;
    class_name: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    partner_logo: Schema.Attribute.Media<'images'>;
    section_space_padding: Schema.Attribute.Component<
      'acf-sections.section-space-padding',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedAboutAwardsSectionAwards
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_about_awards_section_awards';
  info: {
    displayName: 'Awards Section Awards';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedAboutAwardsSectionCertifications
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_about_awards_section_cer_7e0a2dad';
  info: {
    displayName: 'Awards Section Certifications';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedAboutClientLogoSectionClientLogos
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_about_client_logo_sectio_604a0fed';
  info: {
    displayName: 'Client Logo Section Client Logos';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedAboutCompanyEthosSectionEthosItems
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_about_company_ethos_sect_084e862d';
  info: {
    displayName: 'Company Ethos Section Ethos Items';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedAboutGridLayoutGridItems
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_about_grid_layout_grid_items';
  info: {
    displayName: 'Grid Layout Grid Items';
  };
  attributes: {
    background_color: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedAboutLatestUpdatesSectionItems
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_about_latest_updates_sec_763cd016';
  info: {
    displayName: 'Latest Updates Section Items';
  };
  attributes: {
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedAboutLocationSectionLocations
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_about_location_section_locations';
  info: {
    displayName: 'Location Section Locations';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String;
  };
}

export interface AcfSharedAboutTeamSectionTeamMembers
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_about_team_section_team_members';
  info: {
    displayName: 'Team Section Team Members';
  };
  attributes: {
    member: Schema.Attribute.Component<
      'acf-shared.about-team-section-team-members-member',
      true
    >;
  };
}

export interface AcfSharedAboutTeamSectionTeamMembersMember
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_about_team_section_team__a7e06155';
  info: {
    displayName: 'Team Section Team Members Member';
  };
  attributes: {
    bio_url: Schema.Attribute.Component<'shared.menu-item', false>;
    designation: Schema.Attribute.String;
    name: Schema.Attribute.String;
    profile_picture: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedAiTechOverviewList extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_ai_tech_overview_list';
  info: {
    displayName: 'AI Tech Overview List';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedBannerLayoutBannerTwoImages
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_banner_layout_banner_two_images';
  info: {
    displayName: 'Banner Layout Banner Two Images';
  };
  attributes: {
    main_image: Schema.Attribute.Media<'images'>;
    secondary_image: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedBenefitsGridLayoutFeatures
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_benefits_grid_layout_features';
  info: {
    displayName: 'Benefits Grid Layout Features';
  };
  attributes: {
    column: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    description: Schema.Attribute.RichText;
    icon: Schema.Attribute.Media<'images'>;
    image: Schema.Attribute.Media<'images'>;
    image_type: Schema.Attribute.Enumeration<['image', 'icon']>;
    link: Schema.Attribute.Component<'shared.menu-item', false>;
    list: Schema.Attribute.Component<
      'acf-shared.benefits-grid-layout-features-list',
      true
    >;
    text_align: Schema.Attribute.Enumeration<['left', 'justify', 'center']>;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['description', 'list']>;
  };
}

export interface AcfSharedBenefitsGridLayoutFeaturesList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_benefits_grid_layout_fea_7ec5cb1d';
  info: {
    displayName: 'Benefits Grid Layout Features List';
  };
  attributes: {
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedCareerOpeningsSectionJobOpenings
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_career_openings_section__e4d829cd';
  info: {
    displayName: 'Career Openings Section Job Openings';
  };
  attributes: {
    general_description: Schema.Attribute.RichText;
    general_title: Schema.Attribute.String;
    job_link: Schema.Attribute.Component<'shared.menu-item', false>;
    job_location: Schema.Attribute.String;
    job_section: Schema.Attribute.Component<
      'acf-shared.career-openings-section-job-openings-job-section',
      true
    >;
    job_title: Schema.Attribute.String;
    job_type: Schema.Attribute.String;
  };
}

export interface AcfSharedCareerOpeningsSectionJobOpeningsJobSection
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_career_openings_section__396f16a0';
  info: {
    displayName: 'Career Openings Section Job Openings Job Section';
  };
  attributes: {
    section_content: Schema.Attribute.RichText;
    section_title: Schema.Attribute.String;
  };
}

export interface AcfSharedCollaborationsSectionAchievementBoxes
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_collaborations_section_a_88c4c25a';
  info: {
    displayName: 'Collaborations Section Achievement Boxes';
  };
  attributes: {
    column: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    description: Schema.Attribute.RichText;
    icon: Schema.Attribute.Media<'images'>;
    image: Schema.Attribute.Media<'images'>;
    image_type: Schema.Attribute.Enumeration<['image', 'icon']>;
    list: Schema.Attribute.Component<
      'acf-shared.collaborations-section-achievement-boxes-list',
      true
    >;
    text_align: Schema.Attribute.Enumeration<['left', 'justify', 'center']>;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['description', 'list']>;
  };
}

export interface AcfSharedCollaborationsSectionAchievementBoxesList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_collaborations_section_a_dd36aec6';
  info: {
    displayName: 'Collaborations Section Achievement Boxes List';
  };
  attributes: {
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedCommonSliderImageList extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_common_slider_image_list';
  info: {
    displayName: 'Common Slider Image List';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedContactLocationSectionLocations
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_contact_location_section_ad02f5f3';
  info: {
    displayName: 'Contact Location Section Locations';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String;
  };
}

export interface AcfSharedFaqSectionBlockFaqQuestionAndAnswer
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_faq_section_block_faq_qu_1b8e4db1';
  info: {
    displayName: 'FAQ Section Block FAQ Question & Answer';
  };
  attributes: {
    answer: Schema.Attribute.RichText;
    question: Schema.Attribute.Text;
  };
}

export interface AcfSharedFeaturedWebinarsMediaMediaCards
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_featured_webinars_media__fe7b7e8d';
  info: {
    displayName: 'Featured Webinars Media Media Cards';
  };
  attributes: {
    category__tag: Schema.Attribute.String;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    title: Schema.Attribute.Text;
    video_link: Schema.Attribute.Component<'shared.menu-item', false> &
      Schema.Attribute.Required;
    video_thumbnail: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedFormWithContactInfoContactDetails
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_form_with_contact_info_c_b0f8536e';
  info: {
    displayName: 'Form With Contact Info Contact Details';
  };
  attributes: {
    content: Schema.Attribute.RichText;
    heading: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['location', 'phone', 'email']>;
  };
}

export interface AcfSharedFormWithContactInfoSocialMediaLink
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_form_with_contact_info_s_0303b585';
  info: {
    displayName: 'Form With Contact Info Social Media Link';
  };
  attributes: {
    icon: Schema.Attribute.JSON;
    link: Schema.Attribute.Component<'shared.menu-item', false>;
  };
}

export interface AcfSharedGridLayoutGridItems extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_grid_layout_grid_items';
  info: {
    displayName: 'Grid Layout Grid Items';
  };
  attributes: {
    icon_and_text_boxes: Schema.Attribute.Component<
      'acf-shared.grid-layout-grid-items-icon-and-text-boxes',
      false
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedGridLayoutGridItemsIconAndTextBoxes
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_grid_layout_grid_items_i_2a0167bb';
  info: {
    displayName: 'Grid Layout Grid Items Icon and Text Boxes';
  };
  attributes: {
    column: Schema.Attribute.Enumeration<
      ['col-md-2', 'col-md-3', 'col-md-4', 'col-md-5', 'col-md-6']
    >;
    list: Schema.Attribute.Component<
      'acf-shared.grid-layout-grid-items-icon-and-text-boxes-list',
      true
    >;
  };
}

export interface AcfSharedGridLayoutGridItemsIconAndTextBoxesList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_grid_layout_grid_items_i_418eef2b';
  info: {
    displayName: 'Grid Layout Grid Items Icon and Text Boxes List';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    icon: Schema.Attribute.Media<'images'>;
    icon_position: Schema.Attribute.Enumeration<['left', 'right', 'center']>;
    link: Schema.Attribute.Component<'shared.menu-item', false>;
    list: Schema.Attribute.Component<
      'acf-shared.grid-layout-grid-items-icon-and-text-boxes-list-list',
      true
    >;
    text_align: Schema.Attribute.Enumeration<['left', 'justify', 'center']>;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['description', 'list']>;
  };
}

export interface AcfSharedGridLayoutGridItemsIconAndTextBoxesListList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_grid_layout_grid_items_i_fe535bc5';
  info: {
    displayName: 'Grid Layout Grid Items Icon and Text Boxes List List';
  };
  attributes: {
    name: Schema.Attribute.String;
  };
}

export interface AcfSharedHealthcareAutomationSolutionsSolutions
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_healthcare_automation_so_675f6dff';
  info: {
    displayName: 'Healthcare Automation Solutions Solutions';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedHealthcareAutomationTabsTabs
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_healthcare_automation_tabs_tabs';
  info: {
    displayName: 'Healthcare Automation Tabs Tabs';
  };
  attributes: {
    tab_description: Schema.Attribute.RichText;
    tab_list: Schema.Attribute.Component<
      'acf-shared.healthcare-automation-tabs-tabs-tab-list',
      true
    >;
    tab_list_title: Schema.Attribute.String;
    tab_sub_title: Schema.Attribute.String;
    tab_tltle: Schema.Attribute.String;
  };
}

export interface AcfSharedHealthcareAutomationTabsTabsTabList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_healthcare_automation_ta_17416dd9';
  info: {
    displayName: 'Healthcare Automation Tabs Tabs Tab List';
  };
  attributes: {
    name: Schema.Attribute.String;
  };
}

export interface AcfSharedHiringProcessStepsLayoutSteps
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_hiring_process_steps_layout_steps';
  info: {
    displayName: 'Hiring Process Steps Layout Steps';
  };
  attributes: {
    step_description: Schema.Attribute.RichText;
    step_image: Schema.Attribute.Media<'images'>;
    step_title: Schema.Attribute.String;
  };
}

export interface AcfSharedHomeAutomationEdgeAutomationEdgeList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_home_automation_edge_aut_8152fc00';
  info: {
    displayName: 'Home Automation Edge Automation Edge List';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedHomeAwardWinnerAwardWinnerList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_home_award_winner_award__6d9f7375';
  info: {
    displayName: 'Home Award Winner Award Winner List';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    link: Schema.Attribute.Component<'shared.menu-item', false>;
  };
}

export interface AcfSharedHomeAwardsAndCertificatesAwardAndCertificateList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_home_awards_and_certific_bab0c15d';
  info: {
    displayName: 'Home Awards and Certificates Award and Certificate List';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedHomeClientLogoLogoList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_home_client_logo_logo_list';
  info: {
    displayName: 'Home Client Logo Logo List';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedHomeIndustryAutomationSolutionsMainSolutions
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_home_industry_automation_8d5c6564';
  info: {
    displayName: 'Home Industry Automation Solutions Main Solutions';
  };
  attributes: {
    main_title: Schema.Attribute.String;
    solutions_list: Schema.Attribute.Component<
      'acf-shared.home-industry-automation-solutions-main-solutions-solutions-list',
      true
    >;
  };
}

export interface AcfSharedHomeIndustryAutomationSolutionsMainSolutionsSolutionsList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_home_industry_automation_75812405';
  info: {
    displayName: 'Home Industry Automation Solutions Main Solutions Solutions List';
  };
  attributes: {
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    link: Schema.Attribute.Component<'shared.menu-item', false>;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['is_image', 'is_content']>;
  };
}

export interface AcfSharedHomeKeyHighlightsHighlightsList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_home_key_highlights_high_9b953847';
  info: {
    displayName: 'Home Key Highlights Highlights List';
  };
  attributes: {
    description: Schema.Attribute.Text;
    highlights_icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedHomePartnerWorkflowList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_home_partner_workflow_list';
  info: {
    displayName: 'Home  Partner Workflow List';
  };
  attributes: {
    name: Schema.Attribute.String;
  };
}

export interface AcfSharedHowItWorksSectionSteps
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_how_it_works_section_steps';
  info: {
    displayName: 'How IT Works Section Steps';
  };
  attributes: {
    heading: Schema.Attribute.RichText;
  };
}

export interface AcfSharedImageTextFeatureBoxesFeatures
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_image_text_feature_boxes_features';
  info: {
    displayName: 'Image Text Feature Boxes Features';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedImageWithKeypointsKeyPoints
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_image_with_keypoints_key_points';
  info: {
    displayName: 'Image With Keypoints Key Points';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedImpactHighlightsSectionHighlights
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_impact_highlights_sectio_21992abe';
  info: {
    displayName: 'Impact Highlights Section Highlights';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedIndustryAiUseCasesUseCases
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_industry_ai_use_cases_use_cases';
  info: {
    displayName: 'Industry AI Use Cases Use Cases';
  };
  attributes: {
    column: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    list: Schema.Attribute.Component<
      'acf-shared.industry-ai-use-cases-use-cases-list',
      true
    >;
    text_align: Schema.Attribute.Enumeration<['left', 'justify', 'center']>;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['description', 'list']>;
  };
}

export interface AcfSharedIndustryAiUseCasesUseCasesList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_industry_ai_use_cases_us_5e845ce7';
  info: {
    displayName: 'Industry AI Use Cases Use Cases List';
  };
  attributes: {
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedIndustryHighlightBlockList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_industry_highlight_block_list';
  info: {
    displayName: 'Industry Highlight Block List';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    icon: Schema.Attribute.Media<'images'>;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedKognitosBenefitsSectionBenefits
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_kognitos_benefits_sectio_57a2168c';
  info: {
    displayName: 'Kognitos Benefits Section Benefits';
  };
  attributes: {
    description: Schema.Attribute.Text;
    heading: Schema.Attribute.String;
    icon: Schema.Attribute.JSON;
  };
}

export interface AcfSharedLatestWebinarsWebinars
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_latest_webinars_webinars';
  info: {
    displayName: 'Latest Webinars Webinars';
  };
  attributes: {
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    title: Schema.Attribute.Text;
    video_link: Schema.Attribute.Component<'shared.menu-item', false> &
      Schema.Attribute.Required;
    video_thumbnail: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedOurCapabilitiesSectionOurCapabilities
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_our_capabilities_section_9f378138';
  info: {
    displayName: 'Our Capabilities Section Our Capabilities';
  };
  attributes: {
    background_color: Schema.Attribute.String;
    background_image: Schema.Attribute.Media<'images'>;
    background_type: Schema.Attribute.Enumeration<['color', 'image']>;
    description: Schema.Attribute.RichText;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedPackageCardSectionPackageCards
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_package_card_section_pac_741c0ec8';
  info: {
    displayName: 'Package Card Section Package Cards';
  };
  attributes: {
    column: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    cta_button: Schema.Attribute.Component<'shared.menu-item', false>;
    features: Schema.Attribute.Component<
      'acf-shared.package-card-section-package-cards-features',
      true
    >;
    package_subtitle: Schema.Attribute.String;
    package_title: Schema.Attribute.String;
    price: Schema.Attribute.String;
    price_note: Schema.Attribute.String;
    price_plan: Schema.Attribute.String;
  };
}

export interface AcfSharedPackageCardSectionPackageCardsFeatures
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_package_card_section_pac_0fab3f1c';
  info: {
    displayName: 'Package Card Section Package Cards Features';
  };
  attributes: {
    feature_item: Schema.Attribute.String;
  };
}

export interface AcfSharedPartnerHighlightSectionPartnerHighlights
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_partner_highlight_sectio_7294ad59';
  info: {
    displayName: 'Partner Highlight Section Partner Highlights';
  };
  attributes: {
    name: Schema.Attribute.String;
  };
}

export interface AcfSharedPartnerShowcaseBlockPartnerLogos
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_partner_showcase_block_p_73801008';
  info: {
    displayName: 'Partner Showcase Block Partner Logos';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface AcfSharedResourceGridLayoutItems
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_resource_grid_layout_items';
  info: {
    displayName: 'Resource Grid Layout Items';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedRoundtableSessionsSectionsRoundtables
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_roundtable_sessions_sect_e500dad9';
  info: {
    displayName: 'Roundtable Sessions Sections Roundtables';
  };
  attributes: {
    roundtable_title: Schema.Attribute.String;
    speaker_company: Schema.Attribute.String;
    speaker_image: Schema.Attribute.Media<'images'>;
    speaker_name: Schema.Attribute.String;
    speaker_role_label: Schema.Attribute.String;
    speaker_title: Schema.Attribute.String;
    table: Schema.Attribute.Component<
      'acf-shared.roundtable-sessions-sections-roundtables-table',
      false
    >;
  };
}

export interface AcfSharedRoundtableSessionsSectionsRoundtablesTable
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_roundtable_sessions_sect_6d08c656';
  info: {
    displayName: 'Roundtable Sessions Sections Roundtables Table';
  };
  attributes: {
    table_row: Schema.Attribute.Component<
      'acf-shared.roundtable-sessions-sections-roundtables-table-table-row',
      true
    >;
  };
}

export interface AcfSharedRoundtableSessionsSectionsRoundtablesTableTableRow
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_roundtable_sessions_sect_55629251';
  info: {
    displayName: 'Roundtable Sessions Sections Roundtables Table Table Row';
  };
  attributes: {
    name_or_value: Schema.Attribute.Component<
      'acf-shared.roundtable-sessions-sections-roundtables-table-table-row-name-or-value',
      true
    >;
    type: Schema.Attribute.Enumeration<['th', 'td']>;
  };
}

export interface AcfSharedRoundtableSessionsSectionsRoundtablesTableTableRowNameOrValue
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_roundtable_sessions_sect_964807c2';
  info: {
    displayName: 'Roundtable Sessions Sections Roundtables Table Table Row Name Or Value';
  };
  attributes: {
    name: Schema.Attribute.RichText;
  };
}

export interface AcfSharedSectionSpacePaddingDesktopPadding
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_section_space_padding_de_e065a466';
  info: {
    displayName: 'Section Space (Padding) Desktop Padding';
  };
  attributes: {
    padding_bottom_desktop: Schema.Attribute.Integer;
    padding_top_desktop: Schema.Attribute.Integer;
  };
}

export interface AcfSharedSectionSpacePaddingMobilePadding
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_section_space_padding_mo_5e2fa5e7';
  info: {
    displayName: 'Section Space (Padding) Mobile Padding';
  };
  attributes: {
    padding_bottom_mobile: Schema.Attribute.Integer;
    padding_top_mobile: Schema.Attribute.Integer;
  };
}

export interface AcfSharedSectionSpacePaddingPosition
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_section_space_padding_position';
  info: {
    displayName: 'Section Space (Padding) Position';
  };
  attributes: {
    bottom: Schema.Attribute.Boolean;
    top: Schema.Attribute.Boolean;
  };
}

export interface AcfSharedServiceOverviewOverviewList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_service_overview_overview_list';
  info: {
    displayName: 'Service Overview Overview List';
  };
  attributes: {
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedSessionItemSectionsSessionTabs
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_session_item_sections_se_88e01cfa';
  info: {
    displayName: 'Session Item Sections Session Tabs';
  };
  attributes: {
    sessions: Schema.Attribute.Component<
      'acf-shared.session-item-sections-session-tabs-sessions',
      true
    >;
    tab_title: Schema.Attribute.String;
  };
}

export interface AcfSharedSessionItemSectionsSessionTabsSessions
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_session_item_sections_se_9500f9e1';
  info: {
    displayName: 'Session Item Sections Session Tabs Sessions';
  };
  attributes: {
    session_date_day_label: Schema.Attribute.String;
    session_description: Schema.Attribute.RichText;
    session_time: Schema.Attribute.String;
    session_title: Schema.Attribute.String;
    speaker_company: Schema.Attribute.String;
    speaker_image: Schema.Attribute.Media<'images'>;
    speaker_name: Schema.Attribute.String;
    speaker_role_label: Schema.Attribute.String;
    speaker_title: Schema.Attribute.String;
  };
}

export interface AcfSharedSideImageInfoBlocksInfoList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_side_image_info_blocks_info_list';
  info: {
    displayName: 'Side Image Info Blocks Info List';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedSolutionHeroBannerWithCtaButtons
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_solution_hero_banner_wit_bf689dd2';
  info: {
    displayName: 'Solution Hero Banner With CTA Buttons';
  };
  attributes: {
    link: Schema.Attribute.Component<'shared.menu-item', false>;
    type: Schema.Attribute.Enumeration<['primary-btn', 'secondary-btn']>;
  };
}

export interface AcfSharedSolutionsFeatureBlockFeatures
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_solutions_feature_block_features';
  info: {
    displayName: 'Solutions Feature Block Features';
  };
  attributes: {
    feature_image: Schema.Attribute.Media<'images'>;
    feature_list: Schema.Attribute.Component<
      'acf-shared.solutions-feature-block-features-feature-list',
      true
    >;
    feature_title: Schema.Attribute.Text;
  };
}

export interface AcfSharedSolutionsFeatureBlockFeaturesFeatureList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_solutions_feature_block__17073bd0';
  info: {
    displayName: 'Solutions Feature Block Features Feature List';
  };
  attributes: {
    name: Schema.Attribute.RichText;
  };
}

export interface AcfSharedSolutionsKeyBenefitsBenefits
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_solutions_key_benefits_benefits';
  info: {
    displayName: 'Solutions Key Benefits Benefits';
  };
  attributes: {
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedStepCardsSectionSteps extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_step_cards_section_steps';
  info: {
    displayName: 'Step Cards Section Steps';
  };
  attributes: {
    column: Schema.Attribute.Enumeration<
      [
        'col-md-1',
        'col-md-2',
        'col-md-3',
        'col-md-4',
        'col-md-5',
        'col-md-6',
        'col-md-7',
        'col-md-8',
        'col-md-9',
        'col-md-10',
        'col-md-11',
        'col-md-12',
      ]
    >;
    description: Schema.Attribute.RichText;
    list: Schema.Attribute.Component<
      'acf-shared.step-cards-section-steps-list',
      true
    >;
    text_align: Schema.Attribute.Enumeration<['left', 'justify', 'center']>;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['description', 'list']>;
  };
}

export interface AcfSharedStepCardsSectionStepsList
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_step_cards_section_steps_list';
  info: {
    displayName: 'Step Cards Section Steps List';
  };
  attributes: {
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedTextTableBlockTable extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_text_table_block_table';
  info: {
    displayName: 'Text Table Block Table';
  };
  attributes: {
    table_row: Schema.Attribute.Component<
      'acf-shared.text-table-block-table-table-row',
      true
    >;
  };
}

export interface AcfSharedTextTableBlockTableTableRow
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_text_table_block_table_table_row';
  info: {
    displayName: 'Text Table Block Table Table Row';
  };
  attributes: {
    name_or_value: Schema.Attribute.Component<
      'acf-shared.text-table-block-table-table-row-name-or-value',
      true
    >;
    type: Schema.Attribute.Enumeration<['th', 'td']>;
  };
}

export interface AcfSharedTextTableBlockTableTableRowNameOrValue
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_text_table_block_table_t_5d8476cd';
  info: {
    displayName: 'Text Table Block Table Table Row Name Or Value';
  };
  attributes: {
    name: Schema.Attribute.RichText;
  };
}

export interface AcfSharedTimelineSectionsTimelines
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_timeline_sections_timelines';
  info: {
    displayName: 'Timeline Sections Timelines';
  };
  attributes: {
    chart: Schema.Attribute.Text;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedUseCaseSingleSidebarItems
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_use_case_single_sidebar_items';
  info: {
    displayName: 'Use Case Single Sidebar Items';
  };
  attributes: {
    items: Schema.Attribute.Component<
      'acf-shared.use-case-single-sidebar-items-items',
      true
    >;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedUseCaseSingleSidebarItemsItems
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_use_case_single_sidebar__a7831961';
  info: {
    displayName: 'Use Case Single Sidebar Items Items';
  };
  attributes: {
    name_and_link: Schema.Attribute.Component<'shared.menu-item', false>;
  };
}

export interface AcfSharedUseCaseSingleUseCaseItems
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_use_case_single_use_case_items';
  info: {
    displayName: 'Use Case Single Use Case Items';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    highlight_description: Schema.Attribute.RichText;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedUseCasesGridUseCaseItems
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_use_cases_grid_use_case_items';
  info: {
    displayName: 'Use Cases Grid Use Case Items';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedUsecaseIndustryFilterCategories
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_usecase_industry_filter__0d5b2e0b';
  info: {
    displayName: 'Usecase Industry Filter Categories';
  };
  attributes: {
    category_label_and_link: Schema.Attribute.Component<
      'shared.menu-item',
      false
    >;
    is_active: Schema.Attribute.Boolean;
  };
}

export interface AcfSharedWhitePaperSingleRelatedWhitePapers
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_white_paper_single_relat_7196a088';
  info: {
    displayName: 'White Paper Single Related White Papers';
  };
  attributes: {
    posts_limit: Schema.Attribute.String & Schema.Attribute.DefaultTo<'5'>;
    posts_to_show: Schema.Attribute.Enumeration<
      [
        'latest_published',
        'oldest_published',
        'latest_modified',
        'oldest_modified',
        'title_asc',
        'title_desc',
        'most_commented',
        'random',
        'custom',
      ]
    >;
    source: Schema.Attribute.Enumeration<['posts', 'pages']>;
    title: Schema.Attribute.String;
  };
}

export interface AcfSharedWhyKognitosSectionBenefits
  extends Struct.ComponentSchema {
  collectionName: 'components_acf_shared_why_kognitos_section_benefits';
  info: {
    displayName: 'Why Kognitos Section Benefits';
  };
  attributes: {
    description: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    icon: Schema.Attribute.Media<'images'>;
  };
}

export interface NavigationMenuNode extends Struct.ComponentSchema {
  collectionName: 'components_navigation_menu_nodes';
  info: {
    displayName: 'Menu Node';
  };
  attributes: {
    children: Schema.Attribute.Component<'shared.menu-item', true>;
    item: Schema.Attribute.Component<'shared.menu-item', false>;
    order: Schema.Attribute.Integer;
  };
}

export interface SectionsCta extends Struct.ComponentSchema {
  collectionName: 'components_sections_ctas';
  info: {
    displayName: 'CTA';
  };
  attributes: {
    button: Schema.Attribute.Component<'shared.menu-item', false>;
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SectionsFaqSection extends Struct.ComponentSchema {
  collectionName: 'components_sections_faqs';
  info: {
    displayName: 'FAQ Section';
  };
  attributes: {
    description: Schema.Attribute.Text;
    items: Schema.Attribute.JSON;
    title: Schema.Attribute.String;
  };
}

export interface SectionsFeatures extends Struct.ComponentSchema {
  collectionName: 'components_sections_features';
  info: {
    displayName: 'Features';
  };
  attributes: {
    description: Schema.Attribute.Text;
    items: Schema.Attribute.JSON;
    title: Schema.Attribute.String;
  };
}

export interface SectionsGallery extends Struct.ComponentSchema {
  collectionName: 'components_sections_galleries';
  info: {
    displayName: 'Gallery';
  };
  attributes: {
    images: Schema.Attribute.Media;
    title: Schema.Attribute.String;
  };
}

export interface SectionsHero extends Struct.ComponentSchema {
  collectionName: 'components_sections_heroes';
  info: {
    displayName: 'Hero Section';
  };
  attributes: {
    image: Schema.Attribute.Media;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SectionsTestimonialSection extends Struct.ComponentSchema {
  collectionName: 'components_sections_testimonials';
  info: {
    displayName: 'Testimonial Section';
  };
  attributes: {
    description: Schema.Attribute.Text;
    testimonials: Schema.Attribute.JSON;
    title: Schema.Attribute.String;
  };
}

export interface SharedMenuItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_menu_items';
  info: {
    displayName: 'Menu Item';
  };
  attributes: {
    label: Schema.Attribute.String;
    targetBlank: Schema.Attribute.Boolean;
    url: Schema.Attribute.Text;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    displayName: 'SEO';
  };
  attributes: {
    canonicalUrl: Schema.Attribute.String;
    contentAiScore: Schema.Attribute.String;
    keywords: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text;
    metaTitle: Schema.Attribute.String;
    noIndex: Schema.Attribute.Boolean;
    ogImage: Schema.Attribute.Media;
    seoScore: Schema.Attribute.String;
  };
}

export interface SharedSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_social_links';
  info: {
    displayName: 'Social Link';
  };
  attributes: {
    platform: Schema.Attribute.String;
    url: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'acf-sections.about-awards-section': AcfSectionsAboutAwardsSection;
      'acf-sections.about-banner-layout': AcfSectionsAboutBannerLayout;
      'acf-sections.about-client-logo-section': AcfSectionsAboutClientLogoSection;
      'acf-sections.about-company-ethos-section': AcfSectionsAboutCompanyEthosSection;
      'acf-sections.about-diversity-section': AcfSectionsAboutDiversitySection;
      'acf-sections.about-grid-layout': AcfSectionsAboutGridLayout;
      'acf-sections.about-latest-updates-section': AcfSectionsAboutLatestUpdatesSection;
      'acf-sections.about-location-section': AcfSectionsAboutLocationSection;
      'acf-sections.about-partner-section': AcfSectionsAboutPartnerSection;
      'acf-sections.about-strategic-highlights-section': AcfSectionsAboutStrategicHighlightsSection;
      'acf-sections.about-team-section': AcfSectionsAboutTeamSection;
      'acf-sections.about-training-section': AcfSectionsAboutTrainingSection;
      'acf-sections.ai-tech-overview': AcfSectionsAiTechOverview;
      'acf-sections.automation-cta-block': AcfSectionsAutomationCtaBlock;
      'acf-sections.banner-layout': AcfSectionsBannerLayout;
      'acf-sections.benefits-grid-layout': AcfSectionsBenefitsGridLayout;
      'acf-sections.blog-layout': AcfSectionsBlogLayout;
      'acf-sections.career-openings-section': AcfSectionsCareerOpeningsSection;
      'acf-sections.classic-post-slider': AcfSectionsClassicPostSlider;
      'acf-sections.collaborations-section': AcfSectionsCollaborationsSection;
      'acf-sections.common-cta': AcfSectionsCommonCta;
      'acf-sections.common-heading-section': AcfSectionsCommonHeadingSection;
      'acf-sections.common-posts-slider': AcfSectionsCommonPostsSlider;
      'acf-sections.common-slider': AcfSectionsCommonSlider;
      'acf-sections.contact-location-section': AcfSectionsContactLocationSection;
      'acf-sections.content-highlight-block': AcfSectionsContentHighlightBlock;
      'acf-sections.content-image-split-block': AcfSectionsContentImageSplitBlock;
      'acf-sections.content-layout': AcfSectionsContentLayout;
      'acf-sections.faq-section-block': AcfSectionsFaqSectionBlock;
      'acf-sections.feature-highlight-block': AcfSectionsFeatureHighlightBlock;
      'acf-sections.featured-webinars-media': AcfSectionsFeaturedWebinarsMedia;
      'acf-sections.footer-common-cta': AcfSectionsFooterCommonCta;
      'acf-sections.form-with-contact-info': AcfSectionsFormWithContactInfo;
      'acf-sections.general-cta-section': AcfSectionsGeneralCtaSection;
      'acf-sections.grid-layout': AcfSectionsGridLayout;
      'acf-sections.healthcare-automation-solutions': AcfSectionsHealthcareAutomationSolutions;
      'acf-sections.healthcare-automation-tabs': AcfSectionsHealthcareAutomationTabs;
      'acf-sections.hiring-process-steps-layout': AcfSectionsHiringProcessStepsLayout;
      'acf-sections.home-automation-edge': AcfSectionsHomeAutomationEdge;
      'acf-sections.home-award-winner': AcfSectionsHomeAwardWinner;
      'acf-sections.home-awards-and-certificates': AcfSectionsHomeAwardsAndCertificates;
      'acf-sections.home-blog-post': AcfSectionsHomeBlogPost;
      'acf-sections.home-client-logo': AcfSectionsHomeClientLogo;
      'acf-sections.home-featured-case-study': AcfSectionsHomeFeaturedCaseStudy;
      'acf-sections.home-industry-automation-solutions': AcfSectionsHomeIndustryAutomationSolutions;
      'acf-sections.home-key-highlights': AcfSectionsHomeKeyHighlights;
      'acf-sections.home-partner': AcfSectionsHomePartner;
      'acf-sections.home-testimonial-highlight': AcfSectionsHomeTestimonialHighlight;
      'acf-sections.how-it-works-section': AcfSectionsHowItWorksSection;
      'acf-sections.image-form-section': AcfSectionsImageFormSection;
      'acf-sections.image-text-feature-boxes': AcfSectionsImageTextFeatureBoxes;
      'acf-sections.image-with-keypoints': AcfSectionsImageWithKeypoints;
      'acf-sections.impact-highlights-section': AcfSectionsImpactHighlightsSection;
      'acf-sections.industry-ai-use-cases': AcfSectionsIndustryAiUseCases;
      'acf-sections.industry-highlight-block': AcfSectionsIndustryHighlightBlock;
      'acf-sections.info-cta-box': AcfSectionsInfoCtaBox;
      'acf-sections.kognitos-benefits-section': AcfSectionsKognitosBenefitsSection;
      'acf-sections.latest-post': AcfSectionsLatestPost;
      'acf-sections.latest-webinars': AcfSectionsLatestWebinars;
      'acf-sections.our-capabilities-section': AcfSectionsOurCapabilitiesSection;
      'acf-sections.package-card-section': AcfSectionsPackageCardSection;
      'acf-sections.partner-highlight-section': AcfSectionsPartnerHighlightSection;
      'acf-sections.partner-showcase-block': AcfSectionsPartnerShowcaseBlock;
      'acf-sections.resource-grid-layout': AcfSectionsResourceGridLayout;
      'acf-sections.roundtable-sessions-sections': AcfSectionsRoundtableSessionsSections;
      'acf-sections.section-heading-with-columns': AcfSectionsSectionHeadingWithColumns;
      'acf-sections.section-space-padding': AcfSectionsSectionSpacePadding;
      'acf-sections.service-overview': AcfSectionsServiceOverview;
      'acf-sections.session-item-sections': AcfSectionsSessionItemSections;
      'acf-sections.side-image-info-blocks': AcfSectionsSideImageInfoBlocks;
      'acf-sections.solution-hero-banner-with-cta': AcfSectionsSolutionHeroBannerWithCta;
      'acf-sections.solutions-feature-block': AcfSectionsSolutionsFeatureBlock;
      'acf-sections.solutions-key-benefits': AcfSectionsSolutionsKeyBenefits;
      'acf-sections.spacing': AcfSectionsSpacing;
      'acf-sections.step-cards-section': AcfSectionsStepCardsSection;
      'acf-sections.team-highlight-block': AcfSectionsTeamHighlightBlock;
      'acf-sections.text-image-cta-section': AcfSectionsTextImageCtaSection;
      'acf-sections.text-image-split-block': AcfSectionsTextImageSplitBlock;
      'acf-sections.text-table-block': AcfSectionsTextTableBlock;
      'acf-sections.timeline-sections': AcfSectionsTimelineSections;
      'acf-sections.two-column-text-cta': AcfSectionsTwoColumnTextCta;
      'acf-sections.unmapped-layout': AcfSectionsUnmappedLayout;
      'acf-sections.use-case-single': AcfSectionsUseCaseSingle;
      'acf-sections.use-cases-grid': AcfSectionsUseCasesGrid;
      'acf-sections.usecase-highlight-block': AcfSectionsUsecaseHighlightBlock;
      'acf-sections.usecase-industry-filter': AcfSectionsUsecaseIndustryFilter;
      'acf-sections.white-paper-single': AcfSectionsWhitePaperSingle;
      'acf-sections.why-kognitos-section': AcfSectionsWhyKognitosSection;
      'acf-shared.about-awards-section-awards': AcfSharedAboutAwardsSectionAwards;
      'acf-shared.about-awards-section-certifications': AcfSharedAboutAwardsSectionCertifications;
      'acf-shared.about-client-logo-section-client-logos': AcfSharedAboutClientLogoSectionClientLogos;
      'acf-shared.about-company-ethos-section-ethos-items': AcfSharedAboutCompanyEthosSectionEthosItems;
      'acf-shared.about-grid-layout-grid-items': AcfSharedAboutGridLayoutGridItems;
      'acf-shared.about-latest-updates-section-items': AcfSharedAboutLatestUpdatesSectionItems;
      'acf-shared.about-location-section-locations': AcfSharedAboutLocationSectionLocations;
      'acf-shared.about-team-section-team-members': AcfSharedAboutTeamSectionTeamMembers;
      'acf-shared.about-team-section-team-members-member': AcfSharedAboutTeamSectionTeamMembersMember;
      'acf-shared.ai-tech-overview-list': AcfSharedAiTechOverviewList;
      'acf-shared.banner-layout-banner-two-images': AcfSharedBannerLayoutBannerTwoImages;
      'acf-shared.benefits-grid-layout-features': AcfSharedBenefitsGridLayoutFeatures;
      'acf-shared.benefits-grid-layout-features-list': AcfSharedBenefitsGridLayoutFeaturesList;
      'acf-shared.career-openings-section-job-openings': AcfSharedCareerOpeningsSectionJobOpenings;
      'acf-shared.career-openings-section-job-openings-job-section': AcfSharedCareerOpeningsSectionJobOpeningsJobSection;
      'acf-shared.collaborations-section-achievement-boxes': AcfSharedCollaborationsSectionAchievementBoxes;
      'acf-shared.collaborations-section-achievement-boxes-list': AcfSharedCollaborationsSectionAchievementBoxesList;
      'acf-shared.common-slider-image-list': AcfSharedCommonSliderImageList;
      'acf-shared.contact-location-section-locations': AcfSharedContactLocationSectionLocations;
      'acf-shared.faq-section-block-faq-question-and-answer': AcfSharedFaqSectionBlockFaqQuestionAndAnswer;
      'acf-shared.featured-webinars-media-media-cards': AcfSharedFeaturedWebinarsMediaMediaCards;
      'acf-shared.form-with-contact-info-contact-details': AcfSharedFormWithContactInfoContactDetails;
      'acf-shared.form-with-contact-info-social-media-link': AcfSharedFormWithContactInfoSocialMediaLink;
      'acf-shared.grid-layout-grid-items': AcfSharedGridLayoutGridItems;
      'acf-shared.grid-layout-grid-items-icon-and-text-boxes': AcfSharedGridLayoutGridItemsIconAndTextBoxes;
      'acf-shared.grid-layout-grid-items-icon-and-text-boxes-list': AcfSharedGridLayoutGridItemsIconAndTextBoxesList;
      'acf-shared.grid-layout-grid-items-icon-and-text-boxes-list-list': AcfSharedGridLayoutGridItemsIconAndTextBoxesListList;
      'acf-shared.healthcare-automation-solutions-solutions': AcfSharedHealthcareAutomationSolutionsSolutions;
      'acf-shared.healthcare-automation-tabs-tabs': AcfSharedHealthcareAutomationTabsTabs;
      'acf-shared.healthcare-automation-tabs-tabs-tab-list': AcfSharedHealthcareAutomationTabsTabsTabList;
      'acf-shared.hiring-process-steps-layout-steps': AcfSharedHiringProcessStepsLayoutSteps;
      'acf-shared.home-automation-edge-automation-edge-list': AcfSharedHomeAutomationEdgeAutomationEdgeList;
      'acf-shared.home-award-winner-award-winner-list': AcfSharedHomeAwardWinnerAwardWinnerList;
      'acf-shared.home-awards-and-certificates-award-and-certificate-list': AcfSharedHomeAwardsAndCertificatesAwardAndCertificateList;
      'acf-shared.home-client-logo-logo-list': AcfSharedHomeClientLogoLogoList;
      'acf-shared.home-industry-automation-solutions-main-solutions': AcfSharedHomeIndustryAutomationSolutionsMainSolutions;
      'acf-shared.home-industry-automation-solutions-main-solutions-solutions-list': AcfSharedHomeIndustryAutomationSolutionsMainSolutionsSolutionsList;
      'acf-shared.home-key-highlights-highlights-list': AcfSharedHomeKeyHighlightsHighlightsList;
      'acf-shared.home-partner-workflow-list': AcfSharedHomePartnerWorkflowList;
      'acf-shared.how-it-works-section-steps': AcfSharedHowItWorksSectionSteps;
      'acf-shared.image-text-feature-boxes-features': AcfSharedImageTextFeatureBoxesFeatures;
      'acf-shared.image-with-keypoints-key-points': AcfSharedImageWithKeypointsKeyPoints;
      'acf-shared.impact-highlights-section-highlights': AcfSharedImpactHighlightsSectionHighlights;
      'acf-shared.industry-ai-use-cases-use-cases': AcfSharedIndustryAiUseCasesUseCases;
      'acf-shared.industry-ai-use-cases-use-cases-list': AcfSharedIndustryAiUseCasesUseCasesList;
      'acf-shared.industry-highlight-block-list': AcfSharedIndustryHighlightBlockList;
      'acf-shared.kognitos-benefits-section-benefits': AcfSharedKognitosBenefitsSectionBenefits;
      'acf-shared.latest-webinars-webinars': AcfSharedLatestWebinarsWebinars;
      'acf-shared.our-capabilities-section-our-capabilities': AcfSharedOurCapabilitiesSectionOurCapabilities;
      'acf-shared.package-card-section-package-cards': AcfSharedPackageCardSectionPackageCards;
      'acf-shared.package-card-section-package-cards-features': AcfSharedPackageCardSectionPackageCardsFeatures;
      'acf-shared.partner-highlight-section-partner-highlights': AcfSharedPartnerHighlightSectionPartnerHighlights;
      'acf-shared.partner-showcase-block-partner-logos': AcfSharedPartnerShowcaseBlockPartnerLogos;
      'acf-shared.resource-grid-layout-items': AcfSharedResourceGridLayoutItems;
      'acf-shared.roundtable-sessions-sections-roundtables': AcfSharedRoundtableSessionsSectionsRoundtables;
      'acf-shared.roundtable-sessions-sections-roundtables-table': AcfSharedRoundtableSessionsSectionsRoundtablesTable;
      'acf-shared.roundtable-sessions-sections-roundtables-table-table-row': AcfSharedRoundtableSessionsSectionsRoundtablesTableTableRow;
      'acf-shared.roundtable-sessions-sections-roundtables-table-table-row-name-or-value': AcfSharedRoundtableSessionsSectionsRoundtablesTableTableRowNameOrValue;
      'acf-shared.section-space-padding-desktop-padding': AcfSharedSectionSpacePaddingDesktopPadding;
      'acf-shared.section-space-padding-mobile-padding': AcfSharedSectionSpacePaddingMobilePadding;
      'acf-shared.section-space-padding-position': AcfSharedSectionSpacePaddingPosition;
      'acf-shared.service-overview-overview-list': AcfSharedServiceOverviewOverviewList;
      'acf-shared.session-item-sections-session-tabs': AcfSharedSessionItemSectionsSessionTabs;
      'acf-shared.session-item-sections-session-tabs-sessions': AcfSharedSessionItemSectionsSessionTabsSessions;
      'acf-shared.side-image-info-blocks-info-list': AcfSharedSideImageInfoBlocksInfoList;
      'acf-shared.solution-hero-banner-with-cta-buttons': AcfSharedSolutionHeroBannerWithCtaButtons;
      'acf-shared.solutions-feature-block-features': AcfSharedSolutionsFeatureBlockFeatures;
      'acf-shared.solutions-feature-block-features-feature-list': AcfSharedSolutionsFeatureBlockFeaturesFeatureList;
      'acf-shared.solutions-key-benefits-benefits': AcfSharedSolutionsKeyBenefitsBenefits;
      'acf-shared.step-cards-section-steps': AcfSharedStepCardsSectionSteps;
      'acf-shared.step-cards-section-steps-list': AcfSharedStepCardsSectionStepsList;
      'acf-shared.text-table-block-table': AcfSharedTextTableBlockTable;
      'acf-shared.text-table-block-table-table-row': AcfSharedTextTableBlockTableTableRow;
      'acf-shared.text-table-block-table-table-row-name-or-value': AcfSharedTextTableBlockTableTableRowNameOrValue;
      'acf-shared.timeline-sections-timelines': AcfSharedTimelineSectionsTimelines;
      'acf-shared.use-case-single-sidebar-items': AcfSharedUseCaseSingleSidebarItems;
      'acf-shared.use-case-single-sidebar-items-items': AcfSharedUseCaseSingleSidebarItemsItems;
      'acf-shared.use-case-single-use-case-items': AcfSharedUseCaseSingleUseCaseItems;
      'acf-shared.use-cases-grid-use-case-items': AcfSharedUseCasesGridUseCaseItems;
      'acf-shared.usecase-industry-filter-categories': AcfSharedUsecaseIndustryFilterCategories;
      'acf-shared.white-paper-single-related-white-papers': AcfSharedWhitePaperSingleRelatedWhitePapers;
      'acf-shared.why-kognitos-section-benefits': AcfSharedWhyKognitosSectionBenefits;
      'navigation.menu-node': NavigationMenuNode;
      'sections.cta': SectionsCta;
      'sections.faq-section': SectionsFaqSection;
      'sections.features': SectionsFeatures;
      'sections.gallery': SectionsGallery;
      'sections.hero': SectionsHero;
      'sections.testimonial-section': SectionsTestimonialSection;
      'shared.menu-item': SharedMenuItem;
      'shared.seo': SharedSeo;
      'shared.social-link': SharedSocialLink;
    }
  }
}
