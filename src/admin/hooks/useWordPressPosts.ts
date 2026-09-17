import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

const MAX_WORDPRESS_POSTS = 5;

const clampLimit = (value: number | undefined) => {
  if (!value || value <= 0) {
    return MAX_WORDPRESS_POSTS;
  }

  return Math.min(value, MAX_WORDPRESS_POSTS);
};

export interface WordPressPost {
  ID: number;
  post_author: number;
  post_date: string;
  post_date_gmt: string;
  post_content: string;
  post_title: string;
  post_excerpt: string;
  post_status: string;
  comment_status: string;
  ping_status: string;
  post_password: string;
  post_name: string;
  to_ping: string;
  pinged: string;
  post_modified: string;
  post_modified_gmt: string;
  post_content_filtered: string;
  post_parent: number;
  guid: string;
  menu_order: number;
  post_type: string;
  post_mime_type: string;
  comment_count: string;
}

export interface UseWordPressPostsOptions {
  postIds?: string | number[];
  status?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export interface UseWordPressPostsResult {
  posts: WordPressPost[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Fetch WordPress posts directly from the service
 * This is a server-side utility for use in Strapi controllers/services
 */
export async function fetchWordPressPosts(
  strapi: any,
  options: UseWordPressPostsOptions = {}
): Promise<WordPressPost[]> {
  try {
    const { postIds } = options;

    if (!postIds) {
      return [];
    }

    const service = strapi.service('api::post.post');
    const ids = typeof postIds === 'string'
      ? postIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
      : postIds;

    if (ids.length === 0) {
      return [];
    }

    const posts = await service.getPostsByIds(ids);
    return posts;
  } catch (error) {
    console.error('Error fetching WordPress posts:', error);
    throw error;
  }
}

/**
 * React hook for fetching WordPress posts from API
 * Use this in your frontend components
 */
export function useWordPressPosts(
  options: UseWordPressPostsOptions = {}
): UseWordPressPostsResult {
  const { postIds, status = 'publish', limit = MAX_WORDPRESS_POSTS, offset = 0, enabled = true } = options;
  const normalizedLimit = clampLimit(limit);

  const query: UseQueryResult<WordPressPost[], Error> = useQuery({
    queryKey: ['wordpress-posts', postIds, status, normalizedLimit, offset],
    queryFn: async () => {
      if (!postIds) return [];

      const ids = typeof postIds === 'string'
        ? postIds.split(',').map(id => id.trim()).filter(id => id)
        : postIds;

      if (ids.length === 0) return [];

      try {
        const params = new URLSearchParams({
          ids: ids.join(','),
          limit: String(Math.min(ids.length, normalizedLimit)),
        });

        if (status) {
          params.set('status', status);
        }

        if (offset) {
          params.set('offset', String(offset));
        }

        const response = await fetch(`/api/posts/wordpress?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch WordPress posts');
        }

        const data = await response.json();
        return Array.isArray(data?.data) ? data.data : [];
      } catch (error) {
        throw error instanceof Error ? error : new Error('Unknown error occurred');
      }
    },
    enabled: enabled && !!postIds,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  return {
    posts: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Utility to extract and parse WordPress post IDs from string
 */
export function parsePostIds(postIds: string | number[] | null | undefined): number[] {
  if (!postIds) return [];

  if (typeof postIds === 'string') {
    return postIds
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));
  }

  return Array.isArray(postIds) ? postIds : [];
}

/**
 * Format WordPress post date to readable string
 */
export function formatPostDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Extract plain text from WordPress post content (removes HTML tags)
 */
export function getPlainTextContent(content: string, maxLength: number = 150): string {
  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  const decoded = plainText
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  // Trim and truncate
  return decoded.trim().substring(0, maxLength) + (decoded.length > maxLength ? '...' : '');
}
