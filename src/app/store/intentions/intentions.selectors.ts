import { Selector } from '@ngxs/store';
import { IntentionsState } from './intentions.state';
import { IntentionItem, IntentionsStateModel } from './intentions.models';
import { ProductListItem } from '@store/products/products.models';

export class IntentionsSelectors {
  @Selector([IntentionsState])
  static intentions(state: IntentionsStateModel): IntentionItem[] {
    return state.intentions;
  }

  @Selector([IntentionsState])
  static loading(state: IntentionsStateModel): boolean {
    return state.loading;
  }

  @Selector([IntentionsState])
  static productsByIntentionId(state: IntentionsStateModel): Record<string, ProductListItem[]> {
    return state.productsByIntentionId;
  }

  @Selector([IntentionsState])
  static loadingIntentions(state: IntentionsStateModel): Record<string, boolean> {
    return state.loadingIntentions;
  }
}

