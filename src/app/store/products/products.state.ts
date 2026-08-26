import { inject, Injectable } from '@angular/core';
import { Action, State, StateContext } from '@ngxs/store';
import { catchError, of, switchMap, tap } from 'rxjs';

import { ProductStatus } from 'src/generated/graphql';
import { ProductsService } from './products.service';
import { ILoadProductsParams, ProductsStateModel } from './products.models';
import {
  ClearActiveProduct,
  ClearProductsCache,
  LoadBestSellers,
  LoadProductBySlug,
  LoadProducts,
} from './products.actions';

@State<ProductsStateModel>({
  name: 'products',
  defaults: {
    products: [],
    totalCount: 0,
    loading: false,
    activeProduct: null,
    activeProductLoading: false,
    bestSellers: [],
    bestSellersLoading: false,
    productsCache: {},
    productDetailCache: {},
    loadingQueries: {},
  },
})
@Injectable()
export class ProductsState {
  private readonly productsService = inject(ProductsService);

  private serializeParams(params?: ILoadProductsParams): string {
    if (!params) return 'default';
    try {
      return JSON.stringify(params, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return Object.keys(value)
            .sort()
            .reduce((sorted: any, k) => {
              sorted[k] = value[k];
              return sorted;
            }, {});
        }
        return value;
      });
    } catch {
      return JSON.stringify(params);
    }
  }

  @Action(LoadProducts)
  loadProducts(ctx: StateContext<ProductsStateModel>, action: LoadProducts) {
    const key = this.serializeParams(action.params);
    const state = ctx.getState();
    const cached = state.productsCache[key];

    // Return cached results immediately if available and forceRefresh is false
    if (cached !== undefined && !action.forceRefresh) {
      ctx.patchState({
        products: cached.items,
        totalCount: cached.totalCount,
        loading: false,
      });
      return of(cached);
    }

    ctx.patchState({
      loading: true,
      loadingQueries: { ...state.loadingQueries, [key]: true },
    });

    return this.productsService.getProducts(action.params).pipe(
      tap((res) => {
        const currentState = ctx.getState();
        ctx.patchState({
          products: res.items,
          totalCount: res.totalCount,
          loading: false,
          productsCache: {
            ...currentState.productsCache,
            [key]: res,
          },
          loadingQueries: {
            ...currentState.loadingQueries,
            [key]: false,
          },
        });
      }),
      catchError(() => {
        const currentState = ctx.getState();
        ctx.patchState({
          loading: false,
          loadingQueries: {
            ...currentState.loadingQueries,
            [key]: false,
          },
        });
        return of(null);
      }),
    );
  }

  @Action(LoadProductBySlug)
  loadProductBySlug(ctx: StateContext<ProductsStateModel>, action: LoadProductBySlug) {
    const state = ctx.getState();
    const cached = state.productDetailCache[action.slug];

    if (cached !== undefined && !action.forceRefresh) {
      ctx.patchState({
        activeProduct: cached,
        activeProductLoading: false,
      });
      return of(cached);
    }

    ctx.patchState({ activeProductLoading: true });
    return this.productsService.getProductBySlug(action.slug).pipe(
      tap((activeProduct) => {
        const currentState = ctx.getState();
        ctx.patchState({
          activeProduct,
          activeProductLoading: false,
          productDetailCache: activeProduct
            ? { ...currentState.productDetailCache, [action.slug]: activeProduct }
            : currentState.productDetailCache,
        });
      }),
      catchError(() => {
        ctx.patchState({ activeProduct: null, activeProductLoading: false });
        return of(null);
      }),
    );
  }

  @Action(LoadBestSellers)
  loadBestSellers(ctx: StateContext<ProductsStateModel>, action: LoadBestSellers) {
    const state = ctx.getState();
    if (state.bestSellers.length > 0 && !action.forceRefresh) {
      return of({ items: state.bestSellers, totalCount: state.bestSellers.length });
    }

    ctx.patchState({ bestSellersLoading: true });
    return this.productsService
      .getBestSellers(action.params)
      .pipe(
        catchError(() => {
          return of({ items: [], totalCount: 0 });
        }),
      )
      .pipe(
        switchMap((res) => {
          if (res.items && res.items.length > 0) {
            ctx.patchState({
              bestSellers: res.items,
              bestSellersLoading: false,
            });
            return of(res);
          }

          // Graceful fallback to latest published products if period has 0 best sellers or resolver errors
          return this.productsService
            .getProducts({
              where: {
                status: { eq: ProductStatus.Published },
                isDeleted: { eq: false },
              },
              take: action.params?.take ?? 8,
            })
            .pipe(
              tap((prodRes) => {
                const fallbackItems = (prodRes.items || []).map((p) => ({
                  product: p,
                  soldCount: 0,
                }));
                ctx.patchState({
                  bestSellers: fallbackItems,
                  bestSellersLoading: false,
                });
              }),
              catchError(() => {
                ctx.patchState({ bestSellersLoading: false });
                return of(null);
              }),
            );
        }),
        catchError(() => {
          ctx.patchState({ bestSellersLoading: false });
          return of(null);
        }),
      );
  }

  @Action(ClearActiveProduct)
  clearActiveProduct(ctx: StateContext<ProductsStateModel>) {
    ctx.patchState({ activeProduct: null });
  }

  @Action(ClearProductsCache)
  clearProductsCache(ctx: StateContext<ProductsStateModel>) {
    ctx.patchState({
      productsCache: {},
      productDetailCache: {},
      loadingQueries: {},
      bestSellers: [],
    });
  }
}
