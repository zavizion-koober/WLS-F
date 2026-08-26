import { CategoryFilterInput, CategorySortInput, CategoryStatus, CategoryType } from 'src/generated/graphql';

export interface CategoryTranslationItem {
  name: string;
  description?: string | null;
  language: string;
}

export interface CategoryItem {
  id: string;
  imageUrl?: string | null;
  status: CategoryStatus;
  type: CategoryType;
  translations?: CategoryTranslationItem[] | null;
}

export interface ILoadCategoriesParams {
  where?: CategoryFilterInput;
  order?: CategorySortInput[];
  skip?: number;
  take?: number;
}

export interface CategoriesStateModel {
  categories: CategoryItem[];
  totalCount: number;
  loading: boolean;
}
