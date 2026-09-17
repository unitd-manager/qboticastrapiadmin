const { createStrapi } = require('@strapi/strapi');

(async () => {
  const strapi = createStrapi();
  try {
    await strapi.load();
    const model = strapi.contentType('api::page.page');
    console.log('MODEL_OK', JSON.stringify({
      uid: model?.uid,
      hasPageBuilder: Boolean(model?.attributes?.pageBuilder),
      componentCount: Array.isArray(model?.attributes?.pageBuilder?.components) ? model.attributes.pageBuilder.components.length : null,
    }, null, 2));

    const count = await strapi.db.query('api::page.page').count();
    console.log('COUNT_OK', count);

    const rows = await strapi.documents('api::page.page').findMany({
      fields: ['title', 'slug'],
      pagination: { page: 1, pageSize: 5 },
    });
    console.log('FIND_OK', JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('SCRIPT_ERROR', error?.message || error);
    console.error(error?.stack || '(no stack)');
    process.exitCode = 1;
  } finally {
    try {
      await global.strapi?.destroy();
    } catch (destroyError) {
      console.error('DESTROY_ERROR', destroyError?.message || destroyError);
    }
  }
})();
