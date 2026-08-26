import { OrderStatus } from 'src/generated/graphql';

export interface OrderProductInfo {
  id: string;
  slug?: { value: string } | null;
  images?: ReadonlyArray<{ url: string; altText?: string | null }> | null;
  translations?: ReadonlyArray<{ name: string; language: string }> | null;
}

export interface OrderItemSummary {
  id: string;
  quantity: number;
  price: { amount: number | string };
  product?: OrderProductInfo | null;
}

export interface ShippingAddressSummary {
  country: string;
  city: string;
  street: string;
  zipCode: string;
  additionalInfo?: string | null;
}

export interface CustomerOrder {
  id: string;
  status: OrderStatus;
  totalPrice: number | string;
  createdAt: string;
  shippingAddress: ShippingAddressSummary;
  items?: OrderItemSummary[] | null;
}

export interface ILoadMyOrdersParams {
  skip?: number;
  take?: number;
}

export interface OrdersStateModel {
  orders: CustomerOrder[];
  totalCount: number;
  loading: boolean;
  placingOrder: boolean;
  lastCreatedOrderId: string | null;
}
