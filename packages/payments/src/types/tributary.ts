// Tributary-compatible types for Tributary payments

export interface TributaryCheckoutSession {
  id: string;
  object: "checkout.session";
  url?: string;
  payment_method_types: string[];
  line_items: LineItem[];
  mode: "payment" | "subscription";
  success_url?: string;
  cancel_url?: string;
  customer?: string;
  payment_status: "unpaid" | "paid";
  status: "open" | "complete" | "expired";
  amount_total?: number;
  currency?: string;
  metadata?: Record<string, string>;
  tributaryConfig?: TributaryConfig;
}

export interface LineItem {
  price_data: PriceData;
  quantity?: number;
}

export interface PriceData {
  currency: string;
  product_data: ProductData;
  unit_amount: number;
  recurring?: Recurring;
}

export interface ProductData {
  name: string;
  description?: string;
  images?: string[];
}

export interface Recurring {
  interval: "day" | "week" | "month" | "year";
  interval_count?: number;
}

export interface TributarySubscription {
  id: string;
  object: "subscription";
  customer: string;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";
  current_period_start: number;
  current_period_end: number;
  items: SubscriptionItem[];
  metadata?: Record<string, string>;
}

export interface SubscriptionItem {
  id: string;
  object: "subscription_item";
  price: Price;
  quantity: number;
}

export interface Price {
  id: string;
  object: "price";
  currency: string;
  unit_amount: number;
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    interval_count: number;
  };
}

export interface TributaryConfig {
  gateway: string;
  recipient: string;
  trackingId: string;
  autoRenew?: boolean;
  memo?: string;
}

export interface PaymentStatus {
  status: "pending" | "paid" | "failed";
  transactions: PaymentTransaction[];
}

export interface PaymentTransaction {
  signature: string;
  timestamp: number;
  amount: number;
  recipient: string;
  memo: string;
  trackingId?: string;
}
