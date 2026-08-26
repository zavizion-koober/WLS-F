import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { GetIntentionProductsGQL, GetIntentionsGQL } from 'src/generated/graphql';
import { IntentionItem } from './intentions.models';
import { ProductListItem } from '@store/products/products.models';

@Injectable({
  providedIn: 'root',
})
export class IntentionsService {
  private readonly getIntentionsGQL = inject(GetIntentionsGQL);
  private readonly getIntentionProductsGQL = inject(GetIntentionProductsGQL);

  public getIntentions(): Observable<IntentionItem[]> {
    return this.getIntentionsGQL
      .fetch()
      .pipe(map((result) => (result.data?.categories?.items as IntentionItem[]) ?? []));
  }

  public getIntentionProducts(
    intentionId: string,
    skip?: number,
    take?: number,
  ): Observable<ProductListItem[]> {
    return this.getIntentionProductsGQL
      .fetch({
        variables: { intentionId, skip, take },
      })
      .pipe(map((result) => (result.data?.products?.items as ProductListItem[]) ?? []));
  }
}
