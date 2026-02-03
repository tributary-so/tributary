export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface EncodedSessionData {
  tm: string; // tokenMint (base58)
  r: string; // recipient (base58)
  g: string; // gateway (base58)
  a: string; // amount (string number)
  ar: boolean; // autoRenew
  mr: string; // maxRenewals (string number or "null")
  pf: string; // paymentFrequency
  st: string; // startTime (timestamp or "null")
  tid: string; // trackingId
  li: string; // lineItems (JSON string)
}

export interface SubscriptionParams {
  tokenMint: string;
  recipient: string;
  gateway: string;
  amount: number;
  autoRenew: boolean;
  maxRenewals: number | null;
  paymentFrequency: string;
  startTime: number | null;
  trackingId: string;
  lineItems: LineItem[];
}
