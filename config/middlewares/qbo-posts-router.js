module.exports = (config, { strapi }) => {
  strapi.log.info('QBO Posts Router middleware loaded!');
  return async (ctx, next) => {
    const { method, path } = ctx;
    
    strapi.log.info(`Request: ${method} ${path}`);

    // Only handle our custom API paths
    if (!path.startsWith('/api/qbo-posts')) {
      return next();
    }
    
    strapi.log.info(`Handling QBO request: ${method} ${path}`);

    try {
      // GET /api/qbo-posts - List posts with pagination
      if ((path === '/api/qbo-posts' || path === '/api/qbo-posts/') && method === 'GET') {
        const { page = 1, pageSize = 25, status, search } = ctx.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;

        let query = strapi.db.connection('qbo_posts');

        if (status) {
          query = query.where('post_status', status);
        }

        if (search) {
          const searchTerm = `%${search}%`;
          query = query.where((qb) => {
            qb.orWhere('post_title', 'like', searchTerm)
              .orWhere('post_content', 'like', searchTerm)
              .orWhere('post_excerpt', 'like', searchTerm);
          });
        }

        const countResult = await query.clone().count('ID as count').first();
        const total = countResult?.count || 0;
        const posts = await query
          .clone()
          .select('*')
          .limit(pageSizeNum)
          .offset(offset)
          .orderBy('post_date', 'desc');

        ctx.body = {
          data: posts,
          meta: {
            pagination: {
              page: pageNum,
              pageSize: pageSizeNum,
              pageCount: Math.ceil(total / pageSizeNum),
              total,
            },
          },
        };
        ctx.status = 200;
        return;
      }

      // GET /api/qbo-posts/:id - Get single post
      const idMatch = path.match(/^\/api\/qbo-posts\/(\d+)$/);
      if (idMatch && method === 'GET') {
        const id = idMatch[1];
        const post = await strapi.db.connection('qbo_posts')
          .select('*')
          .where('ID', id)
          .first();

        if (!post) {
          ctx.status = 404;
          ctx.body = { error: 'Post not found' };
          return;
        }

        ctx.body = { data: post };
        ctx.status = 200;
        return;
      }

      // GET /api/qbo-posts-search - Search posts
      if ((path === '/api/qbo-posts-search' || path.startsWith('/api/qbo-posts-search?')) && method === 'GET') {
        const { q, status } = ctx.query;

        if (!q) {
          ctx.status = 400;
          ctx.body = { error: 'Search query (q) is required' };
          return;
        }

        let query = strapi.db.connection('qbo_posts');
        const searchTerm = `%${q}%`;
        query = query.where((qb) => {
          qb.orWhere('post_title', 'like', searchTerm)
            .orWhere('post_content', 'like', searchTerm)
            .orWhere('post_excerpt', 'like', searchTerm);
        });

        if (status) {
          query = query.where('post_status', status);
        }

        const posts = await query.select('*').limit(50).orderBy('post_date', 'desc');

        ctx.body = { data: posts, count: posts.length };
        ctx.status = 200;
        return;
      }

      // GET /api/qbo-posts-stats - Get statistics
      if ((path === '/api/qbo-posts-stats' || path.startsWith('/api/qbo-posts-stats?')) && method === 'GET') {
        const byStatus = await strapi.db.connection('qbo_posts')
          .select('post_status')
          .count('ID as count')
          .groupBy('post_status');

        const byType = await strapi.db.connection('qbo_posts')
          .select('post_type')
          .count('ID as count')
          .groupBy('post_type');

        ctx.body = { data: { byStatus, byType } };
        ctx.status = 200;
        return;
      }
    } catch (error) {
      strapi.log.error('Error in qbo-posts middleware:', error);
      ctx.status = 500;
      ctx.body = { error: 'Internal server error', message: error.message };
      return;
    }

    // Pass to next middleware
    await next();
  };
};
