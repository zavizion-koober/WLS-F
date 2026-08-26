import { inject, Injectable } from '@angular/core';
import { Action, State, StateContext } from '@ngxs/store';
import { catchError, of, tap } from 'rxjs';

import { CategoriesService } from './categories.service';
import { CategoriesStateModel } from './categories.models';
import { ClearCategoriesCache, LoadCategories } from './categories.actions';

@State<CategoriesStateModel>({
  name: 'categories',
  defaults: {
    categories: [],
    totalCount: 0,
    loading: false,
  },
})
@Injectable()
export class CategoriesState {
  private readonly categoriesService = inject(CategoriesService);

  @Action(LoadCategories)
  loadCategories(ctx: StateContext<CategoriesStateModel>, action: LoadCategories) {
    const state = ctx.getState();
    if (state.categories.length > 0 && !action.forceRefresh && !action.params) {
      return of({ items: state.categories, totalCount: state.totalCount });
    }

    ctx.patchState({ loading: true });
    return this.categoriesService.getCategories(action.params).pipe(
      tap((res) =>
        ctx.patchState({
          categories: res.items,
          totalCount: res.totalCount,
          loading: false,
        }),
      ),
      catchError(() => {
        ctx.patchState({ loading: false });
        return of(null);
      }),
    );
  }

  @Action(ClearCategoriesCache)
  clearCategoriesCache(ctx: StateContext<CategoriesStateModel>) {
    ctx.patchState({
      categories: [],
      totalCount: 0,
      loading: false,
    });
  }
}

