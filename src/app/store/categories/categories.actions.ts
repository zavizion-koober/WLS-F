import { ILoadCategoriesParams } from './categories.models';

export class LoadCategories {
  static readonly type = '[Categories] Load Categories';
  constructor(
    public params?: ILoadCategoriesParams,
    public forceRefresh: boolean = false,
  ) {}
}

export class ClearCategoriesCache {
  static readonly type = '[Categories] Clear Categories Cache';
}

