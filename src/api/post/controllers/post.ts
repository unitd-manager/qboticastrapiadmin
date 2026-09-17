import { factories } from '@strapi/strapi';
import type { Context } from 'koa';

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MAX_POSTS_PER_COMPONENT = 5;

const clampLimit = (value: unknown) => {
  const normalized = Math.trunc(parseNumber(value, MAX_POSTS_PER_COMPONENT));
  if (normalized <= 0) {
    return MAX_POSTS_PER_COMPONENT;
  }

  return Math.min(normalized, MAX_POSTS_PER_COMPONENT);
};

const parseIds = (value: unknown) => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !Number.isNaN(id));
};

const rethrowHttpError = (ctx: Context, error: unknown, fallbackMessage: string) => {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    throw error;
  }

  ctx.throw(500, fallbackMessage);
};

export default factories.createCoreController('api::post.post', () => ({
  async getWordPressPosts(ctx: Context) {
    try {
      const { limit = String(MAX_POSTS_PER_COMPONENT), offset = '0', status = 'publish', ids } = ctx.query;
      const postIds = parseIds(ids);

      const result = await strapi.service('api::post.post').getWordPressPosts({
        status: status as string,
        limit: clampLimit(limit),
        offset: parseNumber(offset, 0),
        postIds: postIds.length > 0 ? postIds : null,
      });

      ctx.body = {
        data: result.posts,
        meta: {
          pagination: result.pagination,
        },
      };
    } catch (error) {
      rethrowHttpError(ctx, error, `Failed to fetch WordPress posts: ${error}`);
    }
  },

  async getWordPressPost(ctx: Context) {
    try {
      const { postId } = ctx.params;

      const post = await strapi.service('api::post.post').getWordPressPost(parseInt(postId));

      if (!post) {
        ctx.throw(404, 'Post not found');
      }

      ctx.body = {
        data: post,
      };
    } catch (error) {
      rethrowHttpError(ctx, error, `Failed to fetch WordPress post: ${error}`);
    }
  },
}));
