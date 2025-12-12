// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'trader' | 'view_only' | 'admin';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// Market data types
export interface MarketPrice {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  change24h: number;
  changePercent24h: number;
  timestamp: string;
}

export interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Strategy types
export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  parameters: Record<string, any>;
  is_active: boolean;
  max_risk: number;
  prompt?: string;
  technical_info?: string;
  performance?: {
    since: string;
    trades: number;
    win_rate: number;
    total_pnl: number;
    avg_rr: number;
  };
  created_at: string;
  updated_at: string;
}

export interface StrategySignal {
  id: string;
  strategy_id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  metadata: {
    entry_reason?: string;
    news_analysis?: string;
    technical_conditions?: string;
    risk_assessment?: string;
  };
  created_at: string;
}

// Order types
export interface Order {
  id: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  take_profit?: number;
  stop_loss?: number;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';
  created_at: string;
  executed_at?: string;
  updated_at: string;
}

// Position types
export interface Position {
  id: string;
  order_id: string;
  symbol: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  is_open: boolean;
  created_at: string;
  closed_at?: string;
  updated_at: string;
}

// Session types
export interface TradingSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  start_balance: number;
  end_balance?: number;
  total_pnl: number;
  trade_count: number;
  metadata: {
    strategy_performance?: Record<string, any>;
    risk_metrics?: Record<string, any>;
  };
  created_at: string;
  updated_at: string;
}

// Trade types
export interface Trade {
  id: string;
  session_id: string;
  order_id: string;
  pnl: number;
  executed_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// WebSocket message types
export interface WsMessage {
  type: 'price_update' | 'order_update' | 'position_update' | 'signal_update';
  data: any;
  timestamp: string;
}

// Chart types
export interface ChartConfig {
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  indicators: string[];
  theme: 'dark' | 'light';
}

// Order form types
export interface OrderFormData {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  take_profit?: number;
  stop_loss?: number;
}

// Strategy execution types
export interface StrategyExecutionRequest {
  strategyId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  parameters?: Record<string, any>;
}

export interface StrategyExecutionResponse {
  orderId: string;
  status: string;
  message?: string;
}

// Risk management types
export interface RiskSettings {
  max_position_size: number;
  max_daily_loss: number;
  max_drawdown: number;
  stop_loss_percentage: number;
  take_profit_percentage: number;
  leverage_max: number;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
