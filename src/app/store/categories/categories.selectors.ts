import { Selector } from '@ngxs/store';
import { CategoriesState } from './categories.state';
import { CategoriesStateModel, CategoryItem } from './categories.models';

export class CategoriesSelectors {
  @Selector([CategoriesState])
  static categories(state: CategoriesStateModel): CategoryItem[] {
    return state.categories;
  }

  @Selector([CategoriesState])
  static totalCount(state: CategoriesStateModel): number {
    return state.totalCount;
  }

  @Selector([CategoriesState])
  static loading(state: CategoriesStateModel): boolean {
    return state.loading;
  }
}
