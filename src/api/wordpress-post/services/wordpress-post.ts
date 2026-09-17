import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getAllWordPressPosts(filters: any = {}) {
    try {
      const {
        status = null,
        limit = 100,
        offset = 0,
        search = null,
        postType = null,
      } = filters;

      let query = strapi.db.connection('qbo_posts');

      if (status) {
        query = query.where('post_status', status);
      }

      if (postType) {
        query = query.where('post_type', postType);
      }

      if (search) {
        const searchTerm = `%${search}%`;
        query = query.where(qb => {
          qb.orWhere('post_title', 'like', searchTerm)
            .orWhere('post_content', 'like', searchTerm)
            .orWhere('post_excerpt', 'like', searchTerm);
        });
      }

      const posts = await query
        .clone()
        .select('*')
        .limit(limit)
        .offset(offset)
        .orderBy('post_date', 'desc');

      const total = await query
        .clone()
        .count('ID as count')
        .first();

      return {
        posts,
        total: total?.count || 0,
        pagination: {
          limit,
          offset,
          total: total?.count || 0,
        },
      };
    } catch (error) {
      strapi.log.error('Error fetching all WordPress posts:', error);
      throw error;
    }
  },

  async getWordPressPostsByStatus(status: string) {
    try {
      const posts = await strapi.db.connection('qbo_posts')
        .select('*')
        .where('post_status', status)
        .orderBy('post_date', 'desc');

      return posts;
    } catch (error) {
      strapi.log.error(`Error fetching WordPress posts with status ${status}:`, error);
      throw error;
    }
  },

  async getWordPressPostsByType(postType: string) {
    try {
      const posts = await strapi.db.connection('qbo_posts')
        .select('*')
        .where('post_type', postType)
        .orderBy('post_date', 'desc');

      return posts;
    } catch (error) {
      strapi.log.error(`Error fetching WordPress posts of type ${postType}:`, error);
      throw error;
    }
  },

  async searchWordPressPosts(searchQuery: string) {
    try {
      const searchTerm = `%${searchQuery}%`;
      const posts = await strapi.db.connection('qbo_posts')
        .select('*')
        .where(qb => {
          qb.orWhere('post_title', 'like', searchTerm)
            .orWhere('post_content', 'like', searchTerm)
            .orWhere('post_excerpt', 'like', searchTerm);
        })
        .orderBy('post_date', 'desc');

      return posts;
    } catch (error) {
      strapi.log.error(`Error searching WordPress posts:`, error);
      throw error;
    }
  },

  async getWordPressPostStatistics() {
    try {
      const stats = await strapi.db.connection('qbo_posts')
        .select('post_status')
        .count('ID as count')
        .groupBy('post_status');

      const typeStats = await strapi.db.connection('qbo_posts')
        .select('post_type')
        .count('ID as count')
        .groupBy('post_type');

      return {
        byStatus: stats,
        byType: typeStats,
      };
    } catch (error) {
      strapi.log.error('Error getting WordPress post statistics:', error);
      throw error;
    }
  },
});
