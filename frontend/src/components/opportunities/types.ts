export type DataQualitySummary = {
  high?: number;
  medium?: number;
  low?: number;
  none?: number;
  cached?: number;
};

export type OpportunityRow = {
  item_id: string;
  quality: number;
  quality_label: string;
  buy_city: string;
  sell_city: string;
  buy_price: number;
  sell_price: number;
  tax_rate: number;
  tax: number;
  net_revenue: number;
  profit: number;
  roi: number;
  confidence: 'high' | 'medium' | 'low' | 'none' | string;
  buy_age_hours?: number | null;
  sell_age_hours?: number | null;
};
