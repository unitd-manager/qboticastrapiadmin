# WordPress Posts Integration for Strapi

## Quick Summary

You now have the ability to **fetch and display WordPress posts data from the `qbo_posts` database table directly in your Strapi posts**. This integration allows you to link WordPress posts to your Strapi content through a simple field configuration.

---

## 📋 What's Been Implemented

### Files Created/Modified

| File | Purpose |
|------|---------|
| [src/api/post/services/post.ts](src/api/post/services/post.ts) | ✅ Core service for fetching WordPress data |
| [src/api/post/controllers/post.ts](src/api/post/controllers/post.ts) | ✅ API endpoints for WordPress posts |
| [src/api/post/routes/post.ts](src/api/post/routes/post.ts) | ✅ Custom API routes |
| [src/api/post/content-types/post/schema.json](src/api/post/content-types/post/schema.json) | ✅ New post fields: `wpPostIds`, `displayWpData` |
| [src/api/post/content-types/post/lifecycles.ts](src/api/post/content-types/post/lifecycles.ts) | ✅ Automatic WordPress data enrichment |
| [src/admin/hooks/useWordPressPosts.ts](src/admin/hooks/useWordPressPosts.ts) | ✅ React hook for frontend |
| [src/admin/components/WordPressPostsTable.tsx](src/admin/components/WordPressPostsTable.tsx) | ✅ Admin UI component |

### Documentation Files

- [WORDPRESS_INTEGRATION_GUIDE.md](WORDPRESS_INTEGRATION_GUIDE.md) - Complete integration guide
- [WORDPRESS_EXAMPLES.md](WORDPRESS_EXAMPLES.md) - Code examples for different use cases
- [WORDPRESS_API_INTEGRATION.md](WORDPRESS_API_INTEGRATION.md) - API documentation

---

## 🚀 Quick Start

### Step 1: Add WordPress Post IDs to a Strapi Post

In your Strapi admin panel:
1. Go to **Content Manager > Post**
2. Create or edit a post
3. Fill in the `wpPostIds` field with comma-separated WordPress post IDs:
   ```
   40,81,101,112
   ```
4. Toggle `displayWpData` to **On**
5. Save

### Step 2: Access the Data

**Option A: Via REST API**
```bash
# Get a single WordPress post
curl http://localhost:3123/api/posts/wordpress/40

# Get multiple posts with filters
curl http://localhost:3123/api/posts/wordpress?status=publish&limit=10&offset=0
```

**Option B: Via Strapi Service (Backend)**
```typescript
const wpService = strapi.service('api::post.post');
const posts = await wpService.getPostsByIds([40, 81, 101]);
```

**Option C: Via Lifecycle Hooks (Automatic)**
When you fetch a Strapi post with `wpPostIds` set, it automatically includes a `wordPressData` array with the WordPress posts.

---

## 📡 API Endpoints

### GET /api/posts/wordpress/:postId
Fetch a single WordPress post by ID.

```bash
curl http://localhost:3123/api/posts/wordpress/40
```

**Response:**
```json
{
  "data": {
    "ID": 40,
    "post_title": "Navigation",
    "post_author": 1,
    "post_date": "2025-06-27 09:17:03",
    "post_content": "<!-- wp:page-list /-->",
    "post_status": "publish",
    "post_type": "wp_navigation",
    "comment_count": "0"
  }
}
```

### GET /api/posts/wordpress
List WordPress posts with pagination.

**Query Parameters:**
- `status` - Post status (default: `publish`)
- `limit` - Results per page (default: `10`)
- `offset` - Pagination offset (default: `0`)

```bash
curl 'http://localhost:3123/api/posts/wordpress?status=publish&limit=25&offset=0'
```

**Response:**
```json
{
  "data": [
    { "ID": 40, "post_title": "Navigation", ... },
    { "ID": 81, "post_title": "Logo Front", ... }
  ],
  "pagination": {
    "total": 6731,
    "limit": 25,
    "offset": 0
  }
}
```

---

## 💡 Usage Examples

### React Component Example

```jsx
import { useWordPressPosts } from '@/hooks/useWordPressPosts';

export function PostPage({ post }) {
  const { posts, isLoading } = useWordPressPosts({
    postIds: post.wpPostIds,
    enabled: post.displayWpData
  });

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>

      {post.displayWpData && (
        <section>
          <h2>Related Posts</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            posts.map(wp => (
              <div key={wp.ID}>
                <h3>{wp.post_title}</h3>
                <p>{wp.post_content}</p>
              </div>
            ))
          )}
        </section>
      )}
    </article>
  );
}
```

### Strapi Service Example

```typescript
// In your controller or service
async function getPostWithWordPressPosts(postId) {
  const post = await strapi.entityService.findOne('api::post.post', postId);
  
  if (post.wpPostIds) {
    const service = strapi.service('api::post.post');
    post.wordPressData = await service.getPostsByIds(
      post.wpPostIds.split(',').map(id => parseInt(id))
    );
  }
  
  return post;
}
```

---

## 🗄️ Database Information

- **Server**: 66.29.149.122:3306
- **Database**: qbotica_strapi
- **Table**: qbo_posts
- **Total Records**: 6,731 posts

### Available Fields

```
ID, post_author, post_date, post_date_gmt, post_content, post_title,
post_excerpt, post_status, comment_status, ping_status, post_password,
post_name, to_ping, pinged, post_modified, post_modified_gmt,
post_content_filtered, post_parent, guid, menu_order, post_type,
post_mime_type, comment_count
```

---

## 🔧 Service Methods

### `getWordPressPosts(filters)`
Fetch multiple posts with filtering.

```typescript
const result = await strapi.service('api::post.post').getWordPressPosts({
  status: 'publish',    // Post status filter
  limit: 25,            // Results per page
  offset: 0,            // Pagination offset
  postIds: [40, 81]     // Specific post IDs
});
// Returns: { posts: [...], total: number, pagination: {...} }
```

### `getWordPressPost(postId)`
Fetch a single post by ID.

```typescript
const post = await strapi.service('api::post.post').getWordPressPost(40);
// Returns: WordPressPost object or null
```

### `getPostsByIds(postIds)`
Fetch posts by specific IDs (maintains order).

```typescript
const posts = await strapi.service('api::post.post').getPostsByIds([40, 81, 101]);
// Returns: WordPressPost[] - maintains the order of input IDs
```

---

## 🔄 Automatic Data Enrichment

When you fetch a Strapi post that has `wpPostIds` set:

```typescript
const post = await strapi.entityService.findOne('api::post.post', postId);
// post.wordPressData is automatically populated!
```

This is handled by the lifecycle hook in [src/api/post/content-types/post/lifecycles.ts](src/api/post/content-types/post/lifecycles.ts).

---

## 📝 Post Schema Updates

Two new fields have been added to the Post content type:

### `wpPostIds` (String)
- **Description**: Comma-separated WordPress post IDs
- **Example**: `"40,81,101,112"`
- **Required**: No
- **Default**: Empty

### `displayWpData` (Boolean)
- **Description**: Toggle to enable/disable WordPress data fetching
- **Required**: No
- **Default**: false

---

## 🐛 Troubleshooting

### API Returns 404
- Verify the WordPress post ID exists in the `qbo_posts` table
- Check that the database connection is working
- Look for errors in the Strapi server logs

### WordPress Posts Not Appearing in Admin
- Ensure `displayWpData` is toggled to **On**
- Verify `wpPostIds` field is not empty
- Clear browser cache and refresh

### Database Connection Issues
Test your connection:
```bash
mysql -u root -p -h 66.29.149.122 qbotica_strapi
```

Check `.env` file settings:
```env
DATABASE_HOST=66.29.149.122
DATABASE_NAME=qbotica_strapi
DATABASE_USERNAME=root
```

---

## 📚 Additional Resources

- [Complete Integration Guide](WORDPRESS_INTEGRATION_GUIDE.md)
- [Code Examples](WORDPRESS_EXAMPLES.md)
- [API Documentation](WORDPRESS_API_INTEGRATION.md)

---

## 🤝 Support

For issues or questions:
1. Check the [troubleshooting section](#-troubleshooting)
2. Review [code examples](WORDPRESS_EXAMPLES.md)
3. Check Strapi server logs: `npm start`
4. Verify database connection with phpMyAdmin

---

## 📊 Performance Tips

1. **Use Pagination**: When fetching many posts, use `limit` and `offset`
2. **Cache Results**: Consider implementing caching for frequently accessed posts
3. **Batch Operations**: Fetch multiple posts at once rather than individually
4. **Database Indexing**: Ensure proper database indexes on WordPress table

---

## ✅ Checklist for Integration

- [ ] Review [WORDPRESS_INTEGRATION_GUIDE.md](WORDPRESS_INTEGRATION_GUIDE.md)
- [ ] Verify database connection works
- [ ] Create a test Strapi post
- [ ] Add WordPress post IDs to `wpPostIds` field
- [ ] Toggle `displayWpData` to On
- [ ] Test API endpoint: `GET /api/posts/wordpress/{postId}`
- [ ] Test React hook in your frontend
- [ ] Implement in your application

---

**Ready to use!** Start by creating a Strapi post and adding WordPress post IDs to the `wpPostIds` field. 🎉
