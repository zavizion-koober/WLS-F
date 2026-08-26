import { inject, Injectable } from '@angular/core';
import { Action, State, StateContext } from '@ngxs/store';
import { catchError, of, tap } from 'rxjs';

import { IntentionsService } from './intentions.service';
import { IntentionsStateModel } from './intentions.models';
import { ClearIntentionsCache, LoadIntentionProducts, LoadIntentions } from './intentions.actions';

@State<IntentionsStateModel>({
  name: 'intentions',
  defaults: {
    intentions: [],
    loading: false,
    productsByIntentionId: {},
    loadingIntentions: {},
  },
})
@Injectable()
export class IntentionsState {
  private readonly intentionsService = inject(IntentionsService);

  @Action(LoadIntentions)
  loadIntentions(ctx: StateContext<IntentionsStateModel>, action: LoadIntentions) {
    const state = ctx.getState();
    if (state.intentions.length > 0 && !action?.forceRefresh) {
      return of(state.intentions);
    }

    ctx.patchState({
      loading: true,
      productsByIntentionId: {},
      loadingIntentions: {},
    });
    return this.intentionsService.getIntentions().pipe(
      tap((intentions) => ctx.patchState({ intentions, loading: false })),
      catchError(() => {
        ctx.patchState({ loading: false });
        return of([]);
      }),
    );
  }

  @Action(LoadIntentionProducts)
  loadIntentionProducts(ctx: StateContext<IntentionsStateModel>, action: LoadIntentionProducts) {
    const state = ctx.getState();
    const existing = state.productsByIntentionId[action.intentionId];

    // If already queried (even if 0 products found) and not forceRefresh, return cached result
    if (existing !== undefined && !action.forceRefresh) {
      return of(existing);
    }

    ctx.patchState({
      loadingIntentions: {
        ...state.loadingIntentions,
        [action.intentionId]: true,
      },
    });

    return this.intentionsService
      .getIntentionProducts(action.intentionId, action.skip, action.take)
      .pipe(
        tap((products) => {
          const currentState = ctx.getState();
          ctx.patchState({
            productsByIntentionId: {
              ...currentState.productsByIntentionId,
              [action.intentionId]: products ?? [],
            },
            loadingIntentions: {
              ...currentState.loadingIntentions,
              [action.intentionId]: false,
            },
          });
        }),
        catchError(() => {
          const currentState = ctx.getState();
          ctx.patchState({
            productsByIntentionId: {
              ...currentState.productsByIntentionId,
              [action.intentionId]: [],
            },
            loadingIntentions: {
              ...currentState.loadingIntentions,
              [action.intentionId]: false,
            },
          });
          return of([]);
        }),
      );
  }

  @Action(ClearIntentionsCache)
  clearIntentionsCache(ctx: StateContext<IntentionsStateModel>) {
    ctx.patchState({
      productsByIntentionId: {},
      loadingIntentions: {},
    });
  }
}
