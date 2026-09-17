import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Loader,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

type WordPressPost = {
  ID: number;
  post_author?: number;
  post_title: string;
  post_content?: string;
  post_excerpt?: string;
  post_type: string;
  post_status: string;
  post_date: string;
  post_name: string;
  comment_count: string;
  categories?: string[];
  layout?: string | null;
};

type PaginationMeta = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

type ApiResponse = {
  data: WordPressPost[];
  meta?: {
    pagination?: PaginationMeta;
  };
};

const PAGE_SIZE = 25;

const statusOptions = [
  { label: 'All statuses', value: '' },
  { label: 'Publish', value: 'publish' },
  { label: 'Draft', value: 'draft' },
  { label: 'Private', value: 'private' },
  { label: 'Inherit', value: 'inherit' },
  { label: 'Trash', value: 'trash' },
];

const editorStatusOptions = [
  { label: 'Publish', value: 'publish' },
  { label: 'Draft', value: 'draft' },
  { label: 'Private', value: 'private' },
  { label: 'Inherit', value: 'inherit' },
  { label: 'Trash', value: 'trash' },
];

const pageContainerStyle: React.CSSProperties = {
  padding: '32px',
};

const editorCardStyle: React.CSSProperties = {
  border: '1px solid #dcdce4',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
  background: '#ffffff',
};

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  alignItems: 'end',
  marginBottom: '16px',
};

const filterFieldStyle: React.CSSProperties = {
  minWidth: '220px',
  flex: '1 1 220px',
};

const nativeSelectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '40px',
  padding: '8px 12px',
  border: '1px solid #dcdce4',
  borderRadius: '4px',
  background: '#ffffff',
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  marginBottom: '16px',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '120px',
  padding: '10px 12px',
  border: '1px solid #dcdce4',
  borderRadius: '4px',
  resize: 'vertical',
  font: 'inherit',
};

const statusTone = (status: string) => {
  if (status === 'publish') {
    return 'success';
  }

  if (status === 'draft') {
    return 'secondary';
  }

  if (status === 'inherit') {
    return 'alternative';
  }

  return 'warning';
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const toDateTimeLocalValue = (value?: string) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

type PostFormState = {
  post_title: string;
  post_name: string;
  post_type: string;
  post_status: string;
  post_date: string;
  post_excerpt: string;
  post_content: string;
};

const createDefaultFormState = (): PostFormState => ({
  post_title: '',
  post_name: '',
  post_type: 'post',
  post_status: 'draft',
  post_date: toDateTimeLocalValue(),
  post_excerpt: '',
  post_content: '',
});

const WordPressPostsPage = () => {
  const { del, get, post, put } = useFetchClient();

  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<PostFormState>(createDefaultFormState);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    pageCount: 1,
    total: 0,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        page,
        pageSize: PAGE_SIZE,
      };

      if (status) {
        params.status = status;
      }

      if (search) {
        params.search = search;
      }

      const response = await get<ApiResponse>('/api/qbo-posts', { params });
      const data = response.data;

      setPosts(Array.isArray(data?.data) ? data.data : []);
      setPagination(
        data?.meta?.pagination ?? {
          page,
          pageSize: PAGE_SIZE,
          pageCount: 1,
          total: 0,
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load WordPress posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [get, page, search, status]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const paginationLabel = useMemo(() => {
    if (pagination.total === 0) {
      return 'No records';
    }

    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(start + posts.length - 1, pagination.total);
    return `${start}-${end} of ${pagination.total}`;
  }, [pagination, posts.length]);

  const resetEditor = () => {
    setShowEditor(false);
    setIsEditing(false);
    setEditingId(null);
    setEditorLoading(false);
    setSaving(false);
    setEditorError(null);
    setForm(createDefaultFormState());
  };

  const handleCreateClick = () => {
    setShowEditor(true);
    setIsEditing(false);
    setEditingId(null);
    setEditorError(null);
    setForm(createDefaultFormState());
  };

  const handleEditClick = async (id: number) => {
    setShowEditor(true);
    setIsEditing(true);
    setEditingId(id);
    setEditorLoading(true);
    setEditorError(null);

    try {
      const response = await get<{ data: WordPressPost }>(`/api/qbo-posts/${id}`);
      const postData = response.data?.data;

      setForm({
        post_title: postData?.post_title ?? '',
        post_name: postData?.post_name ?? '',
        post_type: postData?.post_type ?? 'post',
        post_status: postData?.post_status ?? 'draft',
        post_date: toDateTimeLocalValue(postData?.post_date),
        post_excerpt: postData?.post_excerpt ?? '',
        post_content: postData?.post_content ?? '',
      });
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Failed to load post details');
    } finally {
      setEditorLoading(false);
    }
  };

  const handleDeleteClick = async (id: number) => {
    const confirmed = window.confirm(`Delete WordPress post ${id}?`);

    if (!confirmed) {
      return;
    }

    try {
      await del(`/api/qbo-posts/${id}`);

      if (posts.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await fetchPosts();
      }

      if (editingId === id) {
        resetEditor();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const handleSubmit = async () => {
    if (!form.post_title.trim()) {
      setEditorError('Title is required.');
      return;
    }

    setSaving(true);
    setEditorError(null);

    const payload = {
      post_title: form.post_title,
      post_name: form.post_name,
      post_type: form.post_type,
      post_status: form.post_status,
      post_date: form.post_date,
      post_excerpt: form.post_excerpt,
      post_content: form.post_content,
    };

    try {
      if (isEditing && editingId !== null) {
        await put(`/api/qbo-posts/${editingId}`, payload);
      } else {
        await post('/api/qbo-posts', payload);
        setPage(1);
      }

      resetEditor();
      await fetchPosts();
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box background="neutral0" style={pageContainerStyle}>
      <Typography variant="alpha" tag="h1">
        WordPress Posts
      </Typography>
      <Box paddingTop={2} paddingBottom={6}>
        <Typography textColor="neutral600">
          Live data from the `qbo_posts` table.
        </Typography>
      </Box>

      {showEditor ? (
        <Box style={editorCardStyle}>
          <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
            <Typography variant="beta" tag="h2">
              {isEditing ? `Edit Post ${editingId ?? ''}` : 'Create WordPress Post'}
            </Typography>
            <Flex gap={2}>
              <Button variant="tertiary" onClick={resetEditor} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSubmit()} loading={saving} disabled={editorLoading}>
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </Flex>
          </Flex>

          {editorLoading ? (
            <Box paddingTop={4}>
              <Loader />
            </Box>
          ) : (
            <>
              {editorError ? (
                <Box paddingBottom={4}>
                  <Typography textColor="danger600">{editorError}</Typography>
                </Box>
              ) : null}

              <div style={formGridStyle}>
                <TextInput
                  label="Title"
                  name="post_title"
                  placeholder="Post title"
                  value={form.post_title}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({ ...current, post_title: event.target.value }))
                  }
                />

                <TextInput
                  label="Slug"
                  name="post_name"
                  placeholder="post-slug"
                  value={form.post_name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({ ...current, post_name: event.target.value }))
                  }
                />

                <TextInput
                  label="Type"
                  name="post_type"
                  placeholder="post"
                  value={form.post_type}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({ ...current, post_type: event.target.value }))
                  }
                />

                <div>
                  <Typography variant="pi" fontWeight="bold" as="label">
                    Status
                  </Typography>
                  <div style={{ height: 4 }} />
                  <select
                    aria-label="Editor status"
                    value={form.post_status}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, post_status: event.target.value }))
                    }
                    style={nativeSelectStyle}
                  >
                    {editorStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Typography variant="pi" fontWeight="bold" as="label">
                    Publish date
                  </Typography>
                  <div style={{ height: 4 }} />
                  <input
                    aria-label="Publish date"
                    type="datetime-local"
                    value={form.post_date}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, post_date: event.target.value }))
                    }
                    style={nativeSelectStyle}
                  />
                </div>
              </div>

              <Box paddingBottom={4}>
                <Typography variant="pi" fontWeight="bold" as="label">
                  Excerpt
                </Typography>
                <div style={{ height: 4 }} />
                <textarea
                  aria-label="Excerpt"
                  value={form.post_excerpt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, post_excerpt: event.target.value }))
                  }
                  style={textareaStyle}
                />
              </Box>

              <Box>
                <Typography variant="pi" fontWeight="bold" as="label">
                  Content
                </Typography>
                <div style={{ height: 4 }} />
                <textarea
                  aria-label="Content"
                  value={form.post_content}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, post_content: event.target.value }))
                  }
                  style={{ ...textareaStyle, minHeight: '220px' }}
                />
              </Box>
            </>
          )}
        </Box>
      ) : null}

      <div style={filterRowStyle}>
        <div style={filterFieldStyle}>
          <TextInput
            label="Search"
            name="search"
            placeholder="Search title, content, excerpt"
            value={searchInput}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchInput(event.target.value)}
          />
        </div>

        <div style={filterFieldStyle}>
          <Typography variant="pi" fontWeight="bold" as="label">
            Status
          </Typography>
          <div style={{ height: 4 }} />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            style={nativeSelectStyle}
          >
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Flex gap={2}>
          <Button onClick={handleCreateClick}>Create Post</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setStatus('');
              setPage(1);
            }}
          >
            Reset
          </Button>
        </Flex>
      </div>

      {loading ? (
        <Box paddingTop={8} textAlign="center">
          <Loader />
        </Box>
      ) : error ? (
        <Box paddingTop={4}>
          <Typography textColor="danger600">{error}</Typography>
        </Box>
      ) : (
        <>
          <Table colCount={9} rowCount={posts.length + 1}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">ID</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">Title</Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">Slug</Typography>
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
                  <Typography variant="sigma">Actions</Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Tr key={post.ID}>
                    <Td>
                      <Typography>{post.ID}</Typography>
                    </Td>
                    <Td>
                      <Typography>{post.post_title || '(no title)'}</Typography>
                    </Td>
                    <Td>
                      <Typography>{post.post_name || '-'}</Typography>
                    </Td>
                    <Td>
                      <Typography>{post.post_type || '-'}</Typography>
                    </Td>
                    <Td>
                      <Badge backgroundColor={statusTone(post.post_status)}>
                        {post.post_status || 'unknown'}
                      </Badge>
                    </Td>
                    <Td>
                      <Typography>{formatDate(post.post_date)}</Typography>
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
                      <Flex gap={2}>
                        <Button
                          size="S"
                          variant="secondary"
                          onClick={() => void handleEditClick(post.ID)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="S"
                          variant="danger-light"
                          onClick={() => void handleDeleteClick(post.ID)}
                        >
                          Delete
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={9}>
                    <Box padding={4}>
                      <Typography>No WordPress posts found.</Typography>
                    </Box>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          <Flex justifyContent="space-between" alignItems="center" paddingTop={4}>
            <Typography textColor="neutral600">{paginationLabel}</Typography>
            <Flex gap={2}>
              <Button
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={pagination.page >= pagination.pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pagination.pageCount || 1, current + 1))
                }
              >
                Next
              </Button>
            </Flex>
          </Flex>
        </>
      )}
    </Box>
  );
};

export default WordPressPostsPage;
