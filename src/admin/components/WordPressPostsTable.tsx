import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, Thead, Tbody, Tr, Th, Td, Badge, Loader } from '@strapi/design-system';

interface WordPressPost {
  ID: number;
  post_author: number;
  post_date: string;
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_status: string;
  comment_status: string;
  ping_status: string;
  post_name: string;
  post_type: string;
  comment_count: string;
  categories?: string[];
  layout?: string | null;
}

interface WordPressPostsTableProps {
  wpPostIds?: string;
  enabled?: boolean;
}

export const WordPressPostsTable: React.FC<WordPressPostsTableProps> = ({
  wpPostIds,
  enabled = true,
}) => {
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !wpPostIds) {
      setPosts([]);
      return;
    }

    const fetchPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        const ids = wpPostIds
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id);

        if (ids.length === 0) {
          setPosts([]);
          return;
        }

        const params = new URLSearchParams({
          ids: ids.join(','),
          limit: String(ids.length),
        });

        const response = await fetch(`/api/posts/wordpress?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch WordPress posts');
        }

        const data = await response.json();
        setPosts(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch WordPress posts'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [wpPostIds, enabled]);

  if (!enabled) {
    return (
      <Box padding={4}>
        <Typography>Enable "Display WordPress Data" to see posts</Typography>
      </Box>
    );
  }

  if (!wpPostIds) {
    return (
      <Box padding={4}>
        <Typography>Enter WordPress post IDs (comma-separated)</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box padding={4} textAlign="center">
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={4}>
        <Typography color="danger">{error}</Typography>
      </Box>
    );
  }

  if (posts.length === 0) {
    return (
      <Box padding={4}>
        <Typography>No posts found</Typography>
      </Box>
    );
  }

  return (
    <Box padding={4}>
      <Typography variant="beta" as="h3" marginBottom={3}>
        WordPress Posts Data
      </Typography>
      <Table colCount={8} rowCount={posts.length + 1}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">ID</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Title</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Type</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Status</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Date</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Category</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Layout</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Comments</Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {posts.map((post) => (
            <Tr key={post.ID}>
              <Td>
                <Typography>{post.ID}</Typography>
              </Td>
              <Td>
                <Typography>{post.post_title}</Typography>
              </Td>
              <Td>
                <Typography>{post.post_type}</Typography>
              </Td>
              <Td>
                <Badge
                  backgroundColor={
                    post.post_status === 'publish' ? 'success' : 'warning'
                  }
                >
                  {post.post_status}
                </Badge>
              </Td>
              <Td>
                <Typography>{new Date(post.post_date).toLocaleDateString()}</Typography>
              </Td>
              <Td>
                <Typography>
                  {Array.isArray(post.categories) && post.categories.length > 0
                    ? post.categories.join(', ')
                    : '-'}
                </Typography>
              </Td>
              <Td>
                <Typography>{post.layout || '-'}</Typography>
              </Td>
              <Td>
                <Typography>{post.comment_count}</Typography>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default WordPressPostsTable;
