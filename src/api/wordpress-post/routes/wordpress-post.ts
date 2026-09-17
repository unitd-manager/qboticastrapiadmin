export default {
  routes: [
    {
      method: 'GET',
      path: '/wordpress-posts',
      handler: 'api::wordpress-post.wordpress-post.getAllPosts',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/wordpress-posts/:id',
      handler: 'api::wordpress-post.wordpress-post.getPostById',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/wordpress-posts/search',
      handler: 'api::wordpress-post.wordpress-post.searchPosts',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/wordpress-posts/stats',
      handler: 'api::wordpress-post.wordpress-post.getStats',
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};
