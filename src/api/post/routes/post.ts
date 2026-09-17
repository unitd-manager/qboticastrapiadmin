export default {
  routes: [
    {
      method: 'GET',
      path: '/posts/wordpress',
      handler: 'api::post.post.getWordPressPosts',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/posts/wordpress/:postId',
      handler: 'api::post.post.getWordPressPost',
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};
