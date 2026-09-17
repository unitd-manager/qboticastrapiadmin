# WordPress Posts API Integration

## Overview
You can now fetch and display WordPress posts data from the `qbo_posts` table directly in your Strapi posts. Two new API endpoints have been created to retrieve data from the WordPress database.

## New Post Fields

### 1. `wpPostIds` (String)
- **Description**: Comma-separated list of WordPress post IDs to fetch data for
- **Example**: `"40,81,101,112"`
- **Usage**: Enter the IDs of WordPress posts you want to display

### 2. `displayWpData` (Boolean)
- **Description**: Toggle to enable/disable fetching WordPress post data
- **Default**: `false`

## API Endpoints

### Get All WordPress Posts
```
GET /api/posts/wordpress?status=publish&limit=10&offset=0
```

**Query Parameters:**
- `status` (string): Post status to filter by (default: `publish`)
- `limit` (number): Number of posts to return (default: `10`)
- `offset` (number): Pagination offset (default: `0`)

**Response:**
```json
{
  "data": [
    {
      "ID": 40,
      "post_author": 1,
      "post_date": "2025-06-27 09:17:03",
      "post_title": "Navigation",
      "post_content": "<!-- wp:page-list /-->",
      "post_excerpt": "",
      "post_status": "publish",
      "comment_status": "closed",
      "ping_status": "closed",
      "post_name": "navigation",
      "post_type": "wp_navigation",
      "comment_count": "0"
    }
  ],
  "pagination": {
    "total": 6731,
    "limit": 10,
    "offset": 0
  }
}
```

### Get Specific WordPress Post
```
GET /api/posts/wordpress/:postId
```

**Parameters:**
- `postId` (number): WordPress post ID

**Response:**
```json
{
  "data": {
    "ID": 40,
    "post_author": 1,
    "post_date": "2025-06-27 09:17:03",
    "post_title": "Navigation",
    "post_content": "<!-- wp:page-list /-->",
    ...all post fields
  }
}
```

## Usage Examples

### Example 1: Display Posts in Frontend
```javascript
// Fetch WordPress posts with specific IDs
const postIds = [40, 81, 101];
const response = await fetch(
  `/api/posts/wordpress?ids=${postIds.join(',')}`
);
const { data } = await response.json();

// Display posts
data.forEach(post => {
  console.log(`${post.post_title} - ${post.post_date}`);
});
```

### Example 2: Create a Strapi Post with WordPress Data
```javascript
const payload = {
  data: {
    title: "My Strapi Post",
    wpPostIds: "40,81,101",
    displayWpData: true,
    content: "Content here"
  }
};

const response = await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

## Database Info
- **Server**: 66.29.149.122:3306
- **Database**: qbotica_strapi
- **Table**: qbo_posts
- **Total Records**: 6,731 posts

## Available Post Fields
- ID
- post_author
- post_date / post_date_gmt
- post_content / post_content_filtered
- post_title
- post_excerpt
- post_status
- comment_status
- ping_status
- post_password
- post_name
- to_ping / pinged
- post_modified / post_modified_gmt
- post_parent
- guid
- menu_order
- post_type
- post_mime_type
- comment_count

## Development
The implementation consists of:
- **Service** ([src/api/post/services/post.ts](src/api/post/services/post.ts)): Business logic for fetching WordPress data
- **Controller** ([src/api/post/controllers/post.ts](src/api/post/controllers/post.ts)): API request handlers
- **Routes** ([src/api/post/routes/post.ts](src/api/post/routes/post.ts)): Route definitions
- **Schema** ([src/api/post/content-types/post/schema.json](src/api/post/content-types/post/schema.json)): New fields in post collection type
