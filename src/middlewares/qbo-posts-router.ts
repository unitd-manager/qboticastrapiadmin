import type { Core } from '@strapi/strapi';

const toSqlDateTime = (value?: string) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const normalizeString = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizePayload = (body: Record<string, unknown> = {}) => {
  const postTitle = normalizeString(body.post_title);
  const postNameInput = normalizeString(body.post_name);
  const postType = normalizeString(body.post_type, 'post') || 'post';
  const postStatus = normalizeString(body.post_status, 'draft') || 'draft';
  const postExcerpt = normalizeString(body.post_excerpt);
  const postContent = typeof body.post_content === 'string' ? body.post_content : '';
  const postDate = toSqlDateTime(normalizeString(body.post_date));
  const commentStatus = normalizeString(body.comment_status, 'open') || 'open';
  const pingStatus = normalizeString(body.ping_status, 'closed') || 'closed';
  const postAuthorRaw = Number(body.post_author);
  const postAuthor = Number.isFinite(postAuthorRaw) ? postAuthorRaw : 1;
  const postParentRaw = Number(body.post_parent);
  const postParent = Number.isFinite(postParentRaw) ? postParentRaw : 0;
  const menuOrderRaw = Number(body.menu_order);
  const menuOrder = Number.isFinite(menuOrderRaw) ? menuOrderRaw : 0;
  const commentCountRaw = Number(body.comment_count);
  const commentCount = Number.isFinite(commentCountRaw) ? commentCountRaw : 0;
  const derivedSlug = postNameInput || slugify(postTitle);

  return {
    post_author: postAuthor,
    post_date: postDate ?? toSqlDateTime() ?? '1970-01-01 00:00:00',
    post_date_gmt: postDate ?? toSqlDateTime() ?? '1970-01-01 00:00:00',
    post_content: postContent,
    post_title: postTitle,
    post_excerpt: postExcerpt,
    post_status: postStatus,
    comment_status: commentStatus,
    ping_status: pingStatus,
    post_password: '',
    post_name: derivedSlug,
    to_ping: '',
    pinged: '',
    post_modified: toSqlDateTime() ?? '1970-01-01 00:00:00',
    post_modified_gmt: toSqlDateTime() ?? '1970-01-01 00:00:00',
    post_content_filtered: '',
    post_parent: postParent,
    guid: '',
    menu_order: menuOrder,
    post_type: postType,
    post_mime_type: '',
    comment_count: commentCount,
  };
};

const updateGuid = async (strapi: Core.Strapi, id: number, slug: string) => {
  const guid = slug ? `qbo-post://${slug}` : `qbo-post://${id}`;

  await strapi.db.connection('qbo_posts')
    .where('ID', id)
    .update({ guid });
};

type QboPostRecord = Record<string, unknown> & {
  ID?: number;
};

const parseId = (value: unknown) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

const enrichPostsWithCategoryAndLayout = async (
  strapi: Core.Strapi,
  posts: QboPostRecord[]
): Promise<QboPostRecord[]> => {
  const postIds = posts
    .map((post) => parseId(post.ID))
    .filter((id): id is number => id !== null);

  if (postIds.length === 0) {
    return posts;
  }

  const categoryRows = await strapi.db.connection('qbo_term_relationships as tr')
    .join('qbo_term_taxonomy as tt', 'tt.term_taxonomy_id', 'tr.term_taxonomy_id')
    .join('qbo_terms as t', 't.term_id', 'tt.term_id')
    .whereIn('tr.object_id', postIds)
    .andWhere('tt.taxonomy', 'category')
    .select('tr.object_id as postId', 't.name as categoryName')
    .orderBy('t.name', 'asc');

  const layoutRows = await strapi.db.connection('qbo_postmeta')
    .whereIn('post_id', postIds)
    .whereRaw("meta_key REGEXP '^layouts_[0-9]+_layout_type$'")
    .whereNotNull('meta_value')
    .where('meta_value', '<>', '')
    .select('post_id as postId', 'meta_value as layoutType')
    .orderBy('meta_key', 'asc');

  const categoriesByPost = new Map<number, string[]>();
  for (const row of categoryRows) {
    const postId = parseId(row.postId);
    const categoryName = typeof row.categoryName === 'string' ? row.categoryName.trim() : '';
    if (postId === null || !categoryName) {
      continue;
    }

    const current = categoriesByPost.get(postId) ?? [];
    if (!current.includes(categoryName)) {
      current.push(categoryName);
      categoriesByPost.set(postId, current);
    }
  }

  const layoutsByPost = new Map<number, string[]>();
  for (const row of layoutRows) {
    const postId = parseId(row.postId);
    const layoutType = typeof row.layoutType === 'string' ? row.layoutType.trim() : '';
    if (postId === null || !layoutType) {
      continue;
    }

    const current = layoutsByPost.get(postId) ?? [];
    if (!current.includes(layoutType)) {
      current.push(layoutType);
      layoutsByPost.set(postId, current);
    }
  }

  return posts.map((post) => {
    const postId = parseId(post.ID);
    if (postId === null) {
      return {
        ...post,
        categories: [],
        layout: null,
      };
    }

    const categories = categoriesByPost.get(postId) ?? [];
    const layouts = layoutsByPost.get(postId) ?? [];

    return {
      ...post,
      categories,
      layout: layouts.length > 0 ? layouts.join(', ') : null,
    };
  });
};

export default (config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: any) => {
    const { method, path } = ctx.request;

    if (path.startsWith('/api/qbo-posts')) {
      if ((path === '/api/qbo-posts' || path === '/api/qbo-posts/') && method === 'POST') {
        try {
          const payload = normalizePayload(ctx.request.body ?? {});

          if (!payload.post_title) {
            ctx.status = 400;
            ctx.body = { error: 'post_title is required' };
            return;
          }

          const inserted = await strapi.db.connection('qbo_posts').insert(payload);
          const insertId = Array.isArray(inserted) ? Number(inserted[0]) : Number(inserted);

          if (Number.isFinite(insertId)) {
            await updateGuid(strapi, insertId, payload.post_name);
          }

          const post = await strapi.db.connection('qbo_posts')
            .select('*')
            .where('ID', insertId)
            .first();

          ctx.status = 201;
          ctx.body = { data: post };
          return;
        } catch (error: any) {
          ctx.status = 500;
          ctx.body = { error: error.message };
          return;
        }
      }

      if (path === '/api/qbo-posts' || path === '/api/qbo-posts/') {
        try {
          const { page = 1, pageSize = 25, status, search } = ctx.query;
          const pageNum = parseInt(page as string, 10);
          const pageSizeNum = parseInt(pageSize as string, 10);
          const offset = (pageNum - 1) * pageSizeNum;

          let query = strapi.db.connection('qbo_posts');

          if (status) {
            query = query.where('post_status', status as string);
          }

          if (search) {
            const searchTerm = `%${search}%`;
            query = query.where((qb: any) => {
              qb.orWhere('post_title', 'like', searchTerm)
                .orWhere('post_content', 'like', searchTerm)
                .orWhere('post_excerpt', 'like', searchTerm);
            });
          }

          const total = await query.clone().count('ID as count').first();
          const posts = await query
            .clone()
            .select('*')
            .limit(pageSizeNum)
            .offset(offset)
            .orderBy('post_date', 'desc');
          const enrichedPosts = await enrichPostsWithCategoryAndLayout(strapi, posts);
          const totalCount = Number(total?.count ?? 0);

          ctx.body = {
            data: enrichedPosts,
            meta: {
              pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                pageCount: Math.ceil(totalCount / pageSizeNum),
                total: totalCount,
              },
            },
          };
          return;
        } catch (error: any) {
          ctx.status = 500;
          ctx.body = { error: error.message };
          return;
        }
      }

      const idMatch = path.match(/^\/api\/qbo-posts\/(\d+)/);
      if (idMatch) {
        const id = idMatch[1];

        if (method === 'PUT') {
          try {
            const existingPost = await strapi.db.connection('qbo_posts')
              .select('*')
              .where('ID', id)
              .first();

            if (!existingPost) {
              ctx.status = 404;
              ctx.body = { error: 'Post not found' };
              return;
            }

            const payload = normalizePayload({
              ...existingPost,
              ...(ctx.request.body ?? {}),
            });

            if (!payload.post_title) {
              ctx.status = 400;
              ctx.body = { error: 'post_title is required' };
              return;
            }

            await strapi.db.connection('qbo_posts')
              .where('ID', id)
              .update(payload);

            await updateGuid(strapi, Number(id), payload.post_name);

            const updatedPost = await strapi.db.connection('qbo_posts')
              .select('*')
              .where('ID', id)
              .first();

            ctx.body = { data: updatedPost };
            return;
          } catch (error: any) {
            ctx.status = 500;
            ctx.body = { error: error.message };
            return;
          }
        }

        if (method === 'DELETE') {
          try {
            const deletedCount = await strapi.db.connection('qbo_posts')
              .where('ID', id)
              .del();

            if (!deletedCount) {
              ctx.status = 404;
              ctx.body = { error: 'Post not found' };
              return;
            }

            ctx.body = { data: { deleted: true, id: Number(id) } };
            return;
          } catch (error: any) {
            ctx.status = 500;
            ctx.body = { error: error.message };
            return;
          }
        }

        try {
          const post = await strapi.db.connection('qbo_posts')
            .select('*')
            .where('ID', id)
            .first();

          if (!post) {
            ctx.status = 404;
            ctx.body = { error: 'Post not found' };
            return;
          }

          const [enrichedPost] = await enrichPostsWithCategoryAndLayout(strapi, post ? [post] : []);
          ctx.body = { data: enrichedPost ?? post };
          return;
        } catch (error: any) {
          ctx.status = 500;
          ctx.body = { error: error.message };
          return;
        }
      }

      // Handle GET /api/qbo-posts-search
      if (path === '/api/qbo-posts-search' || path.startsWith('/api/qbo-posts-search')) {
        try {
          const { q, status } = ctx.query;

          if (!q) {
            ctx.status = 400;
            ctx.body = { error: 'Search query (q) is required' };
            return;
          }

          let query = strapi.db.connection('qbo_posts');

          const searchTerm = `%${q}%`;
          query = query.where((qb: any) => {
            qb.orWhere('post_title', 'like', searchTerm)
              .orWhere('post_content', 'like', searchTerm)
              .orWhere('post_excerpt', 'like', searchTerm);
          });

          if (status) {
            query = query.where('post_status', status as string);
          }

          const posts = await query.select('*').limit(50).orderBy('post_date', 'desc');

          ctx.body = { data: posts, count: posts.length };
          return;
        } catch (error: any) {
          ctx.status = 500;
          ctx.body = { error: error.message };
          return;
        }
      }

      // Handle GET /api/qbo-posts-stats
      if (path === '/api/qbo-posts-stats' || path.startsWith('/api/qbo-posts-stats')) {
        try {
          const byStatus = await strapi.db.connection('qbo_posts')
            .select('post_status')
            .count('ID as count')
            .groupBy('post_status');

          const byType = await strapi.db.connection('qbo_posts')
            .select('post_type')
            .count('ID as count')
            .groupBy('post_type');

          ctx.body = { data: { byStatus, byType } };
          return;
        } catch (error: any) {
          ctx.status = 500;
          ctx.body = { error: error.message };
          return;
        }
      }
    }

    await next();
  };
};
