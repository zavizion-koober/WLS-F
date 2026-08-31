export const env = {
  TOKEN: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
  },

  GOOGLE_CLIENT_ID: '686928675584-6shsd3e31n7akf5l21vrvm2ldg9ec7ks.apps.googleusercontent.com',

  APPLE: {
    CLIENT_ID: 'com.gra.si',
    REDIRECT_URI: 'https://gra.ge',
  },

  API_URLS: {
    rest: '/api/v1',
    graphql: '/graphql',
  },
  SERVER_API_FALLBACK_BASE: 'http://localhost:5210' as string | undefined,
};
