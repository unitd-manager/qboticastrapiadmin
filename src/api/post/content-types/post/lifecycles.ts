const toPostIds = (value: unknown): number[] => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !Number.isNaN(id));
};

const shouldSkipLifecycleForCurrentRequest = () => {
  const requestPath = strapi.requestContext.get()?.request?.path;

  if (typeof requestPath !== 'string') {
    return false;
  }

  // Content Manager document reads/writes do not need computed WordPress payloads.
  return requestPath.startsWith('/content-manager/');
};

export default {
  async afterFindOne(event: any) {
    try {
      if (shouldSkipLifecycleForCurrentRequest()) {
        return;
      }

      const { result } = event;

      if (!result || !result.displayWpData || !result.wpPostIds) {
        return;
      }

      // Parse the comma-separated IDs
      const postIds = toPostIds(result.wpPostIds);

      if (postIds.length === 0) {
        return;
      }

      // Fetch WordPress posts
      const wpService = strapi.service('api::post.post');
      const wordPressPosts = await wpService.getPostsByIds(postIds);

      // Attach to result
      result.wordPressData = wordPressPosts;
    } catch (error) {
      strapi.log.warn('Error fetching WordPress posts:', error);
      // Don't throw error, just log it
    }
  },

  async afterFindMany(event: any) {
    try {
      if (shouldSkipLifecycleForCurrentRequest()) {
        return;
      }

      const { results } = event;

      if (!Array.isArray(results)) {
        return;
      }

      const wpService = strapi.service('api::post.post');
      const idsByResult = new Map<any, number[]>();
      const uniqueIds = new Set<number>();

      for (const result of results) {
        if (!result.displayWpData || !result.wpPostIds) {
          continue;
        }

        const postIds = toPostIds(result.wpPostIds);
        if (postIds.length === 0) {
          continue;
        }

        idsByResult.set(result, postIds);
        for (const id of postIds) {
          uniqueIds.add(id);
        }
      }

      if (uniqueIds.size === 0) {
        return;
      }

      const allPosts = await wpService.getPostsByIds(Array.from(uniqueIds));
      const postsById = new Map<number, any>();

      for (const post of allPosts) {
        const id = Number(post?.ID);
        if (!Number.isNaN(id)) {
          postsById.set(id, post);
        }
      }

      for (const [result, postIds] of idsByResult.entries()) {
        result.wordPressData = postIds
          .map((id) => postsById.get(id))
          .filter(Boolean);
      }
    } catch (error) {
      strapi.log.warn('Error in afterFindMany lifecycle hook:', error);
    }
  },
};
