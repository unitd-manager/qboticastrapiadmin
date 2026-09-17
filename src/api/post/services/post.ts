import { factories } from '@strapi/strapi';

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MAX_POSTS_PER_COMPONENT = 5;

const clampLimit = (value: unknown, fallback: number = MAX_POSTS_PER_COMPONENT) => {
  const normalized = Math.trunc(toNumber(value, fallback));
  if (normalized <= 0) {
    return fallback;
  }

  return Math.min(normalized, MAX_POSTS_PER_COMPONENT);
};

const orderByIds = (query: any, postIds: number[]) => {
  if (postIds.length === 0) {
    return query;
  }

  const placeholders = postIds.map(() => '?').join(', ');
  return query.orderByRaw(`FIELD(ID, ${placeholders})`, postIds);
};

const enrichPostsWithCategoryAndLayout = async (strapi: any, posts: any[]) => {
  const postIds = posts
    .map((post) => Number(post?.ID))
    .filter((id) => Number.isFinite(id));

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
    const postId = Number(row.postId);
    const categoryName = typeof row.categoryName === 'string' ? row.categoryName.trim() : '';

    if (!Number.isFinite(postId) || !categoryName) {
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
    const postId = Number(row.postId);
    const layoutType = typeof row.layoutType === 'string' ? row.layoutType.trim() : '';

    if (!Number.isFinite(postId) || !layoutType) {
      continue;
    }

    const current = layoutsByPost.get(postId) ?? [];
    if (!current.includes(layoutType)) {
      current.push(layoutType);
      layoutsByPost.set(postId, current);
    }
  }

  return posts.map((post) => {
    const postId = Number(post?.ID);

    if (!Number.isFinite(postId)) {
      return {
        ...post,
        categories: [],
        layout: null,
      };
    }

    return {
      ...post,
      categories: categoriesByPost.get(postId) ?? [],
      layout: (layoutsByPost.get(postId) ?? []).join(', ') || null,
    };
  });
};

export default factories.createCoreService('api::post.post', ({ strapi }) => ({
  async getWordPressPosts(filters: any = {}) {
    try {
      const {
        status = 'publish',
        limit = MAX_POSTS_PER_COMPONENT,
        offset = 0,
        postIds = null,
      } = filters;

      let query = strapi.db.connection('qbo_posts');
      const normalizedLimit = clampLimit(limit);
      const normalizedOffset = toNumber(offset, 0);

      if (postIds && postIds.length > 0) {
        query = query.whereIn('ID', postIds);
      } else {
        query = query.where('post_status', status);
      }

      let postsQuery = query
        .select([
          'ID',
          'post_author',
          'post_date_gmt',
          'post_date',
          'post_content',
          'post_title',
          'post_excerpt',
          'post_status',
          'comment_status',
          'ping_status',
          'post_password',
          'post_name',
          'to_ping',
          'pinged',
          'post_modified',
          'post_modified_gmt',
          'post_content_filtered',
          'post_parent',
          'guid',
          'menu_order',
          'post_type',
          'post_mime_type',
          'comment_count',
        ])
        .limit(normalizedLimit)
        .offset(normalizedOffset);

      postsQuery = postIds && postIds.length > 0
        ? orderByIds(postsQuery, postIds)
        : postsQuery.orderBy('post_date', 'desc');

      const posts = await postsQuery;
      const enrichedPosts = await enrichPostsWithCategoryAndLayout(strapi, posts);

      const countQuery = strapi.db.connection('qbo_posts');
      if (postIds && postIds.length > 0) {
        countQuery.whereIn('ID', postIds);
      } else {
        countQuery.where('post_status', status);
      }

      const total = await countQuery.count('ID as count').first();

      return {
        posts: enrichedPosts,
        total: toNumber(total?.count, 0),
        pagination: {
          limit: normalizedLimit,
          offset: normalizedOffset,
          total: toNumber(total?.count, 0),
        },
      };
    } catch (error) {
      strapi.log.error('Error fetching WordPress posts:', error);
      throw error;
    }
  },

  async getWordPressPost(postId: number) {
    try {
      const post = await strapi.db.connection('qbo_posts')
        .select('*')
        .where('ID', postId)
        .first();

      if (!post) {
        return null;
      }

      const [enrichedPost] = await enrichPostsWithCategoryAndLayout(strapi, [post]);

      return enrichedPost || post;
    } catch (error) {
      strapi.log.error(`Error fetching WordPress post ${postId}:`, error);
      throw error;
    }
  },

  async getPostsByIds(postIds: number[]) {
    try {
      if (!postIds || postIds.length === 0) {
        return [];
      }

      const postsQuery = strapi.db.connection('qbo_posts')
        .select('*')
        .whereIn('ID', postIds);

      const posts = await orderByIds(postsQuery, postIds);

      return enrichPostsWithCategoryAndLayout(strapi, posts);
    } catch (error) {
      strapi.log.error('Error fetching WordPress posts by IDs:', error);
      throw error;
    }
  },
}));
