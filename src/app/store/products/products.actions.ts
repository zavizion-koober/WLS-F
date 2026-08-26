import { ILoadBestSellersParams, ILoadProductsParams } from './products.models';

export class LoadProducts {
  static readonly type = '[Products] Load Products';
  constructor(
    public params?: ILoadProductsParams,
    public forceRefresh: boolean = false,
  ) {}
}

export class LoadProductBySlug {
  static readonly type = '[Products] Load Product By Slug';
  constructor(
    public slug: string,
    public forceRefresh: boolean = false,
  ) {}
}

export class LoadBestSellers {
  static readonly type = '[Products] Load Best Sellers';
  constructor(
    public params?: ILoadBestSellersParams,
    public forceRefresh: boolean = false,
  ) {}
}

export class ClearActiveProduct {
  static readonly type = '[Products] Clear Active Product';
}

export class ClearProductsCache {
  static readonly type = '[Products] Clear Products Cache';
}

