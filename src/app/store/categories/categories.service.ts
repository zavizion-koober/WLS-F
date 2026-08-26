import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CategoryFilterInput, CategoryStatus, CategoryType, GetCategoriesGQL } from 'src/generated/graphql';
import { CategoryItem, ILoadCategoriesParams } from './categories.models';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private readonly getCategoriesGQL = inject(GetCategoriesGQL);

  public getCategories(params?: ILoadCategoriesParams): Observable<{ items: CategoryItem[]; totalCount: number }> {
    const where: CategoryFilterInput = {
      type: { eq: CategoryType.Category },
      status: { eq: CategoryStatus.Published },
      ...params?.where,
    };

    return this.getCategoriesGQL
      .fetch({
        variables: {
          where,
          order: params?.order,
          skip: params?.skip,
          take: params?.take,
        },
      })
      .pipe(
        map((result) => ({
          items: (result.data?.categories?.items as CategoryItem[]) ?? [],
          totalCount: result.data?.categories?.totalCount ?? 0,
        })),
      );
  }
}
