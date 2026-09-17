import React from 'react';
import CommonPostsPicker from './fields/common-posts-picker';

// Debug: indicate this admin entry file was loaded in the browser
// eslint-disable-next-line no-console
console.log('admin entry.client loaded', 1111);

declare global {
  interface Window {
    __registeredCustomFields?: string[];
  }
}

export default {
  register(app: any) {
    try {
      // Debug: is customFields API available?
      // eslint-disable-next-line no-console
      console.log('admin register called, has customFields =', !!app?.customFields);
      app.customFields.register({
        name: 'common-posts-picker',
        pluginId: 'custom',
        type: 'json',
        intlLabel: {
          id: 'custom.common-posts-picker.label',
          defaultMessage: 'Common Posts Picker',
        },
        components: {
          Input: CommonPostsPicker,
        },
      });
      // expose registration for debugging
      if (typeof window !== 'undefined') {
        window.__registeredCustomFields = window.__registeredCustomFields || [];
        window.__registeredCustomFields.push('plugin::custom.common-posts-picker');
        // eslint-disable-next-line no-console
        console.log('Registered custom field: plugin::custom.common-posts-picker');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to register custom field common-posts-picker', e);
    }
  },
};
