import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { GetMyOrdersGQL, Language } from 'src/generated/graphql';

import { Locale, LocaleService } from '@core/services/locale.service';
import { CustomerOrder, ILoadMyOrdersParams } from './orders.models';

const LANGUAGE_BY_LOCALE: Record<Locale, Language> = {
  en: Language.En,
  ka: Language.Ka,
  ru: Language.Ru,
};

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly getMyOrdersGQL = inject(GetMyOrdersGQL);
  private readonly locale = inject(LocaleService);

  public checkout(addressId: string): Observable<string> {
    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    return this.http.post<string>('/api/v1/orders/checkout', { addressId }, { headers });
  }

  public getMyOrders(
    params?: ILoadMyOrdersParams,
  ): Observable<{ items: CustomerOrder[]; totalCount: number }> {
    return this.getMyOrdersGQL
      .fetch({
        variables: {
          language: LANGUAGE_BY_LOCALE[this.locale.active()] || Language.En,
          skip: params?.skip,
          take: params?.take,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => ({
          items: (result.data?.myOrders?.items as CustomerOrder[]) ?? [],
          totalCount: result.data?.myOrders?.totalCount ?? 0,
        })),
      );
  }

  public cancel(orderId: string): Observable<void> {
    return this.http.post<void>('/api/v1/orders/cancel', { value: orderId });
  }
}
