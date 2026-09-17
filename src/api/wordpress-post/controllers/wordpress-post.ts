import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

const rethrowHttpError = (ctx: Context, error: unknown, fallbackMessage: string) => {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    throw error;
  }

  ctx.throw(500, fallbackMessage);
};

const controller: Core.Controller = {
  async getAllPosts(ctx: Context) {
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
        query = query.where(qb => {
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
      const totalCount = Number(total?.count ?? 0);

      ctx.body = {
        data: posts,
        meta: {
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            pageCount: Math.ceil(totalCount / pageSizeNum),
            total: totalCount,
          },
        },
      };
    } catch (error) {
      rethrowHttpError(ctx, error, `Failed to fetch posts: ${error}`);
    }
  },

  async getPostById(ctx: Context) {
    try {
      const { id } = ctx.params;

      const post = await strapi.db.connection('qbo_posts')
        .select('*')
        .where('ID', id)
        .first();

      if (!post) {
        ctx.throw(404, 'Post not found');
      }

      ctx.body = {
        data: post,
      };
    } catch (error) {
      rethrowHttpError(ctx, error, `Failed to fetch post: ${error}`);
    }
  },

  async searchPosts(ctx: Context) {
    try {
      const { q, status } = ctx.query;

      if (!q) {
        ctx.throw(400, 'Search query (q) is required');
      }

      let query = strapi.db.connection('qbo_posts');

      const searchTerm = `%${q}%`;
      query = query.where(qb => {
        qb.orWhere('post_title', 'like', searchTerm)
          .orWhere('post_content', 'like', searchTerm)
          .orWhere('post_excerpt', 'like', searchTerm);
      });

      if (status) {
        query = query.where('post_status', status as string);
      }

      const posts = await query.select('*').limit(50).orderBy('post_date', 'desc');

      ctx.body = {
        data: posts,
        count: posts.length,
      };
    } catch (error) {
      rethrowHttpError(ctx, error, `Search failed: ${error}`);
    }
  },

  async getStats(ctx: Context) {
    try {
      const service = strapi.service('api::wordpress-post.wordpress-post');
      const stats = await service.getWordPressPostStatistics();

      ctx.body = {
        data: stats,
      };
    } catch (error) {
      rethrowHttpError(ctx, error, `Failed to get statistics: ${error}`);
    }
  },
};

export default controller;
