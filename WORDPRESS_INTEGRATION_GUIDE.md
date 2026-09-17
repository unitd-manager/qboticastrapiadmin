# WordPress Posts Data Integration - Implementation Guide

## Overview

This guide explains how to fetch and display WordPress posts data from your `qbo_posts` database table directly in Strapi posts.

## What Was Implemented

### 1. **Post Schema Update**
- Added `wpPostIds` field (string) - comma-separated WordPress post IDs
- Added `displayWpData` field (boolean) - toggle to enable/disable data fetching

### 2. **API Service** ([src/api/post/services/post.ts](src/api/post/services/post.ts))
- `getWordPressPosts()` - Fetch multiple posts with filters
- `getWordPressPost()` - Fetch a single post by ID  
- `getPostsByIds()` - Fetch posts by specific IDs maintaining order

### 3. **API Controller** ([src/api/post/controllers/post.ts](src/api/post/controllers/post.ts))
- REST endpoints to retrieve WordPress posts
- Error handling and response formatting

### 4. **Custom Routes** ([src/api/post/routes/post.ts](src/api/post/routes/post.ts))
- GET `/api/posts/wordpress` - List posts with pagination
- GET `/api/posts/wordpress/:postId` - Get specific post by ID

### 5. **React Admin Component** ([src/admin/components/WordPressPostsTable.tsx](src/admin/components/WordPressPostsTable.tsx))
- Displays WordPress posts in a formatted table
- Shows post title, type, status, date, and comment count

## How to Use

### Step 1: Add WordPress Post IDs to a Strapi Post

In the Strapi admin panel, when creating/editing a post:
1. Enter WordPress post IDs in `wpPostIds` field
2. Example: `40,81,101,112` (comma-separated, no spaces)
3. Toggle `displayWpData` to `true`

### Step 2: Fetch Data via API

**Option A: Using the Service in Custom Code**

```typescript
// In your controller or service
const wpService = strapi.service('api::post.post');

// Get multiple posts by IDs
const postsData = await wpService.getPostsByIds([40, 81, 101]);
console.log(postsData);

// Get posts with filters
const filteredPosts = await wpService.getWordPressPosts({
  status: 'publish',
  limit: 25,
  offset: 0,
  postIds: [40, 81, 101]
});
console.log(filteredPosts);
```

**Option B: Using REST API Endpoints**

```bash
# Get specific WordPress post
curl http://localhost:3123/api/posts/wordpress/40

# Get all published posts with pagination
curl http://localhost:3123/api/posts/wordpress?status=publish&limit=10&offset=0
```

### Step 3: Display Data in Frontend

**Option A: Fetch in Your App**

```javascript
// React/Next.js example
import { useEffect, useState } from 'react';

export function WordPressPosts({ postIds }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const ids = postIds.split(',').map(id => id.trim());
        const results = await Promise.all(
          ids.map(id =>
            fetch(`/api/posts/wordpress/${id}`)
              .then(res => res.json())
              .then(data => data.data)
          )
        );
        setPosts(results.filter(post => post !== null));
      } finally {
        setLoading(false);
      }
    };

    if (postIds) fetchPosts();
  }, [postIds]);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {posts.map(post => (
        <div key={post.ID}>
          <h3>{post.post_title}</h3>
          <p>{post.post_date}</p>
          <p>{post.post_content}</p>
        </div>
      ))}
    </div>
  );
}
```

**Option B: Use in GraphQL**

```graphql
query GetPostWithWordPressData($id: ID!) {
  post(id: $id) {
    id
    title
    wpPostIds
    displayWpData
  }
}
```

Then fetch the WordPress data client-side using the REST endpoints.

## API Response Examples

### Get Single Post
```bash
GET /api/posts/wordpress/40
```

**Response:**
```json
{
  "data": {
    "ID": 40,
    "post_author": 1,
    "post_date": "2025-06-27 09:17:03",
    "post_date_gmt": "2025-06-27 09:17:03",
    "post_content": "<!-- wp:page-list /-->",
    "post_title": "Navigation",
    "post_excerpt": "",
    "post_status": "publish",
    "comment_status": "closed",
    "ping_status": "closed",
    "post_password": "",
    "post_name": "navigation",
    "to_ping": "",
    "pinged": "",
    "post_modified": "2025-06-27 09:17:03",
    "post_modified_gmt": "2025-06-27 09:17:03",
    "post_content_filtered": "",
    "post_parent": 0,
    "guid": "https://dev.srv975395.hstgr.cloud/2025/06/27/navig...",
    "menu_order": 0,
    "post_type": "wp_navigation",
    "post_mime_type": "",
    "comment_count": "0"
  }
}
```

### List Posts
```bash
GET /api/posts/wordpress?status=publish&limit=25&offset=0
```

**Response:**
```json
{
  "data": [
    {
      "ID": 40,
      "post_title": "Navigation",
      "post_status": "publish",
      ...
    },
    {
      "ID": 81,
      "post_title": "Logo Front",
      "post_status": "inherit",
      ...
    }
  ],
  "pagination": {
    "total": 6731,
    "limit": 25,
    "offset": 0
  }
}
```

## Database Information

- **Server**: 66.29.149.122:3306
- **Database**: qbotica_strapi
- **Table**: qbo_posts
- **Total Records**: 6,731

## Available WordPress Post Fields

| Field | Type | Description |
|-------|------|-------------|
| ID | int | Post ID |
| post_author | int | Author user ID |
| post_date | datetime | Publication date |
| post_date_gmt | datetime | Publication date GMT |
| post_content | longtext | Post content |
| post_title | text | Post title |
| post_excerpt | text | Post excerpt |
| post_status | varchar | Status (publish, draft, etc.) |
| comment_status | varchar | Comment status |
| ping_status | varchar | Ping status |
| post_password | varchar | Password protection |
| post_name | varchar | Post slug |
| to_ping | text | URLs to ping |
| pinged | text | URLs already pinged |
| post_modified | datetime | Last modification date |
| post_modified_gmt | datetime | Last modification GMT |
| post_content_filtered | longtext | Filtered content |
| post_parent | int | Parent post ID |
| guid | varchar | GUID |
| menu_order | int | Menu order |
| post_type | varchar | Post type (post, page, attachment, etc.) |
| post_mime_type | varchar | MIME type |
| comment_count | int | Comment count |

## Service Methods Reference

### `getWordPressPosts(filters)`

Fetch multiple WordPress posts with filtering.

**Parameters:**
```typescript
{
  status?: string;        // Default: 'publish'
  limit?: number;         // Default: 25
  offset?: number;        // Default: 0
  postIds?: number[];     // Specific post IDs to fetch
}
```

**Returns:**
```typescript
{
  posts: Array<WordPressPost>;
  total: number;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  }
}
```

### `getWordPressPost(postId)`

Fetch a single WordPress post by ID.

**Parameters:**
- `postId`: number

**Returns:** `WordPressPost | null`

### `getPostsByIds(postIds)`

Fetch posts by specific IDs, maintaining order.

**Parameters:**
- `postIds`: number[]

**Returns:** `WordPressPost[]`

## Files Modified

1. [src/api/post/content-types/post/schema.json](src/api/post/content-types/post/schema.json)
   - Added `wpPostIds` and `displayWpData` attributes

2. [src/api/post/services/post.ts](src/api/post/services/post.ts)
   - Created WordPress data fetching service

3. [src/api/post/controllers/post.ts](src/api/post/controllers/post.ts)
   - Created API endpoints for accessing WordPress posts

4. [src/api/post/routes/post.ts](src/api/post/routes/post.ts)
   - Created custom routes for WordPress endpoints

5. [src/admin/components/WordPressPostsTable.tsx](src/admin/components/WordPressPostsTable.tsx)
   - Created React component for displaying WordPress posts in admin

## Troubleshooting

### Posts not loading in API
1. Verify database connection in `.env` file
2. Check if WordPress table `qbo_posts` exists
3. Test database connection: `mysql -u root -p -h 66.29.149.122 qbotica_strapi`

### Custom routes not working
1. Restart Strapi: `npm start`
2. Check Strapi server logs for errors
3. Ensure controller and service files are properly saved

### Admin component not displaying
1. Verify React component path is correct
2. Clear browser cache
3. Restart development server

## Next Steps

1. **Integrate with Frontend**: Use the REST API or service methods to fetch and display WordPress posts
2. **Create Filters**: Add more filtering options (author, date range, post type)
3. **Add Caching**: Implement caching to reduce database queries
4. **Custom Hooks**: Create hooks for easy data fetching in React components
5. **Search**: Add full-text search capabilities across WordPress posts
