import { Selector } from '@ngxs/store';
import { ProductsState } from './products.state';
import {
  BestSellerSummaryItem,
  ProductDetailItem,
  ProductListItem,
  ProductsStateModel,
} from './products.models';

export class ProductsSelectors {
  @Selector([ProductsState])
  static products(state: ProductsStateModel): ProductListItem[] {
    return state.products;
  }

  @Selector([ProductsState])
  static totalCount(state: ProductsStateModel): number {
    return state.totalCount;
  }

  @Selector([ProductsState])
  static loading(state: ProductsStateModel): boolean {
    return state.loading;
  }

  @Selector([ProductsState])
  static activeProduct(state: ProductsStateModel): ProductDetailItem | null {
    return state.activeProduct;
  }

  @Selector([ProductsState])
  static activeProductLoading(state: ProductsStateModel): boolean {
    return state.activeProductLoading;
  }

  @Selector([ProductsState])
  static bestSellers(state: ProductsStateModel): BestSellerSummaryItem[] {
    return state.bestSellers;
  }

  @Selector([ProductsState])
  static bestSellersLoading(state: ProductsStateModel): boolean {
    return state.bestSellersLoading;
  }

  @Selector([ProductsState])
  static productsCache(state: ProductsStateModel) {
    return state.productsCache;
  }

  @Selector([ProductsState])
  static productDetailCache(state: ProductsStateModel) {
    return state.productDetailCache;
  }

  @Selector([ProductsState])
  static loadingQueries(state: ProductsStateModel) {
    return state.loadingQueries;
  }
}

