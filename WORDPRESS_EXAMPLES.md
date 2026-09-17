/**
 * WordPress Posts Integration - Usage Examples
 * 
 * This file contains practical examples of how to fetch and use
 * WordPress posts data in different scenarios.
 */

// ============================================================================
// EXAMPLE 1: Fetch WordPress Posts in a Custom API Endpoint
// ============================================================================

// File: src/api/posts/controllers/posts.ts
export const exampleFetchWordPressData = async (ctx: any) => {
  try {
    const { wpPostIds } = ctx.request.body;

    if (!wpPostIds) {
      return ctx.badRequest('wpPostIds is required');
    }

    // Use the service to fetch posts
    const service = strapi.service('api::post.post');
    const wordPressPosts = await service.getPostsByIds(
      wpPostIds.split(',').map((id: string) => parseInt(id, 10))
    );

    ctx.send({
      data: wordPressPosts,
      count: wordPressPosts.length,
    });
  } catch (error) {
    ctx.throw(500, `Failed to fetch WordPress posts: ${error}`);
  }
};

// ============================================================================
// EXAMPLE 2: Fetch WordPress Posts in a Middleware/Hook
// ============================================================================

// File: src/api/post/middlewares/enrich-with-wordpress-data.ts
export default () => {
  return async (ctx: any, next: any) => {
    await next();

    // After processing, enrich Strapi posts with WordPress data
    if (ctx.body && ctx.body.data) {
      const service = strapi.service('api::post.post');
      const posts = Array.isArray(ctx.body.data) ? ctx.body.data : [ctx.body.data];

      for (const post of posts) {
        if (post.wpPostIds) {
          try {
            const postIds = post.wpPostIds
              .split(',')
              .map((id: string) => parseInt(id, 10))
              .filter((id: number) => !isNaN(id));

            if (postIds.length > 0) {
              post.wordPressData = await service.getPostsByIds(postIds);
            }
          } catch (error) {
            console.error('Error enriching post with WordPress data:', error);
          }
        }
      }
    }
  };
};

// ============================================================================
// EXAMPLE 3: Frontend React Component Using the Hook
// ============================================================================

import { useWordPressPosts, formatPostDate, getPlainTextContent } from '@/hooks/useWordPressPosts';

export function PostWithWordPressData({ post }: { post: any }) {
  const { posts, isLoading, isError } = useWordPressPosts({
    postIds: post.wpPostIds,
    enabled: post.displayWpData,
  });

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>

      {post.displayWpData && (
        <section className="wordpress-posts">
          <h2>Related WordPress Posts</h2>
          {isLoading && <p>Loading...</p>}
          {isError && <p>Error loading posts</p>}
          {posts.map(wpPost => (
            <div key={wpPost.ID} className="post-item">
              <h3>{wpPost.post_title}</h3>
              <p className="post-meta">
                {formatPostDate(wpPost.post_date)} • {wpPost.post_type}
              </p>
              <p>{getPlainTextContent(wpPost.post_content)}</p>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}

// ============================================================================
// EXAMPLE 4: Directly Query via Service in Backend Code
// ============================================================================

// In any Strapi service or controller
async function enrichPostData(post: any) {
  // Get the service
  const postService = strapi.service('api::post.post');

  // Option 1: Get posts by IDs (maintains order)
  if (post.wpPostIds) {
    const postIds = post.wpPostIds
      .split(',')
      .map((id: string) => parseInt(id, 10));

    const wordPressPosts = await postService.getPostsByIds(postIds);
    post.wordPressData = wordPressPosts;
  }

  // Option 2: Get all published posts with pagination
  const allPosts = await postService.getWordPressPosts({
    status: 'publish',
    limit: 25,
    offset: 0,
  });

  return post;
}

// ============================================================================
// EXAMPLE 5: Create a Utility Function for Batch Processing
// ============================================================================

async function enrichMultiplePostsWithWordPressData(strapiPosts: any[]) {
  const service = strapi.service('api::post.post');

  const enriched = await Promise.all(
    strapiPosts.map(async (post) => {
      if (!post.wpPostIds) {
        return post;
      }

      try {
        const postIds = post.wpPostIds
          .split(',')
          .map((id: string) => parseInt(id, 10))
          .filter((id: number) => !isNaN(id));

        if (postIds.length > 0) {
          post.wordPressData = await service.getPostsByIds(postIds);
        }
      } catch (error) {
        console.error(`Error enriching post ${post.id}:`, error);
      }

      return post;
    })
  );

  return enriched;
}

// ============================================================================
// EXAMPLE 6: REST API Client Usage (Frontend)
// ============================================================================

// Fetch a single WordPress post
async function fetchSinglePost(postId: number) {
  const response = await fetch(`/api/posts/wordpress/${postId}`);
  const data = await response.json();
  return data.data; // Returns WordPressPost object
}

// Fetch multiple posts and combine with Strapi post
async function displayPostWithWordPressData(strapiPostId: string, wpPostIds: string) {
  try {
    // Fetch Strapi post
    const strapiResponse = await fetch(`/api/posts/${strapiPostId}`);
    const strapiPost = await strapiResponse.json();

    // Fetch associated WordPress posts
    const wpIds = wpPostIds.split(',').map(id => id.trim());
    const wordPressPosts = await Promise.all(
      wpIds.map(id =>
        fetch(`/api/posts/wordpress/${id}`)
          .then(res => res.json())
          .then(data => data.data)
          .catch(() => null)
      )
    );

    return {
      ...strapiPost.data,
      wordPressData: wordPressPosts.filter(Boolean),
    };
  } catch (error) {
    console.error('Error fetching posts:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 7: CLI Command to Batch Fetch WordPress Posts
// ============================================================================

// File: src/cli/commands/fetch-wordpress-posts.ts
export default ({ strapi }: { strapi: any }) => ({
  description: 'Fetch all WordPress posts for Strapi posts that have wpPostIds',
  action: async () => {
    try {
      const strapiPosts = await strapi.entityService.findMany('api::post.post', {
        limit: 1000,
      });

      const service = strapi.service('api::post.post');
      let processed = 0;

      for (const post of strapiPosts) {
        if (!post.wpPostIds) continue;

        try {
          const postIds = post.wpPostIds
            .split(',')
            .map((id: string) => parseInt(id, 10))
            .filter((id: number) => !isNaN(id));

          if (postIds.length > 0) {
            const wordPressPosts = await service.getPostsByIds(postIds);
            console.log(`Post ${post.id}: Fetched ${wordPressPosts.length} WordPress posts`);
            processed++;
          }
        } catch (error) {
          console.error(`Error processing post ${post.id}:`, error);
        }
      }

      console.log(`Completed processing ${processed} posts`);
    } catch (error) {
      console.error('Error in fetch-wordpress-posts command:', error);
    }
  },
});

// ============================================================================
// EXAMPLE 8: Filter and Search WordPress Posts
// ============================================================================

async function searchWordPressPosts(query: string, options: any = {}) {
  const service = strapi.service('api::post.post');

  // Get posts by status
  const allPosts = await service.getWordPressPosts({
    status: options.status || 'publish',
    limit: options.limit || 100,
  });

  // Filter by search query
  const filtered = allPosts.posts.filter(post =>
    post.post_title.toLowerCase().includes(query.toLowerCase()) ||
    post.post_content.toLowerCase().includes(query.toLowerCase())
  );

  return filtered;
}

// ============================================================================
// EXAMPLE 9: Export WordPress Posts as JSON
// ============================================================================

async function exportWordPressPostsToJSON(postIds: number[], filepath: string) {
  const service = strapi.service('api::post.post');
  const posts = await service.getPostsByIds(postIds);

  const fs = require('fs').promises;
  await fs.writeFile(filepath, JSON.stringify(posts, null, 2), 'utf-8');
  console.log(`Exported ${posts.length} posts to ${filepath}`);
}

// Usage:
// await exportWordPressPostsToJSON([40, 81, 101], './wordpress-posts.json');

// ============================================================================
// EXAMPLE 10: Schedule Periodic WordPress Data Sync
// ============================================================================

// File: src/plugins/wordpress-sync/index.ts
export default async (plugin: any) => {
  // This could be implemented using node-cron or similar scheduler
  // Runs every hour to refresh WordPress posts data

  const cronJob = () => {
    setInterval(async () => {
      try {
        const strapiPosts = await strapi.entityService.findMany('api::post.post', {
          limit: 1000,
        });

        const service = strapi.service('api::post.post');
        let updated = 0;

        for (const post of strapiPosts) {
          if (!post.wpPostIds) continue;

          try {
            const postIds = post.wpPostIds
              .split(',')
              .map((id: string) => parseInt(id, 10))
              .filter((id: number) => !isNaN(id));

            if (postIds.length > 0) {
              await service.getPostsByIds(postIds);
              updated++;
            }
          } catch (error) {
            console.error(`Error syncing post ${post.id}:`, error);
          }
        }

        console.log(`WordPress sync completed: ${updated} posts updated`);
      } catch (error) {
        console.error('Error in WordPress sync:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  };

  strapi.server.on('strapi:initialized', () => {
    cronJob();
  });

  return plugin;
};
