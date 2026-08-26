import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  BestSellerPeriod,
  GetBestSellerProductsGQL,
  GetProductBySlugGQL,
  GetProductsGQL,
} from 'src/generated/graphql';
import {
  BestSellerSummaryItem,
  ILoadBestSellersParams,
  ILoadProductsParams,
  ProductDetailItem,
  ProductListItem,
} from './products.models';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly getProductsGQL = inject(GetProductsGQL);
  private readonly getProductBySlugGQL = inject(GetProductBySlugGQL);
  private readonly getBestSellerProductsGQL = inject(GetBestSellerProductsGQL);

  public getProducts(
    params?: ILoadProductsParams,
  ): Observable<{ items: ProductListItem[]; totalCount: number }> {
    return this.getProductsGQL
      .fetch({
        variables: {
          where: params?.where,
          order: params?.order,
          skip: params?.skip,
          take: params?.take,
        },
      })
      .pipe(
        map((result) => ({
          items: (result.data?.products?.items as ProductListItem[]) ?? [],
          totalCount: result.data?.products?.totalCount ?? 0,
        })),
      );
  }

  public getProductBySlug(slug: string): Observable<ProductDetailItem | null> {
    return this.getProductBySlugGQL
      .fetch({
        variables: { slug },
      })
      .pipe(map((result) => (result.data?.products?.items?.[0] as ProductDetailItem) ?? null));
  }

  public getBestSellers(
    params?: ILoadBestSellersParams,
  ): Observable<{ items: BestSellerSummaryItem[]; totalCount: number }> {
    return this.getBestSellerProductsGQL
      .fetch({
        variables: {
          period: params?.period ?? BestSellerPeriod.AllTime,
          skip: params?.skip,
          take: params?.take ?? 8,
        },
      })
      .pipe(
        map((result) => ({
          items: (result.data?.bestSellerProducts?.items as BestSellerSummaryItem[]) ?? [],
          totalCount: result.data?.bestSellerProducts?.totalCount ?? 0,
        })),
      );
  }
}
