import { InjectionToken } from '@angular/core';

export interface ApiUrls {
  rest: string;
  graphql: string;
}

export const API_URLS = new InjectionToken<ApiUrls>('API_URLS');
