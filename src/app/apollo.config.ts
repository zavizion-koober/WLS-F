import { InMemoryCache } from '@apollo/client/core';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { inject } from '@angular/core';

import { API_URLS } from '@core/http/api-urls.token';

export const graphqlProvider = provideApollo(() => {
  const httpLink = inject(HttpLink);
  const urls = inject(API_URLS);

  return {
    cache: new InMemoryCache(),
    link: httpLink.create({ uri: urls.graphql }),
  };
});
