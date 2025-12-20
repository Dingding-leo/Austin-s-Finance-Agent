// Re-export core client
export { supabase, supabaseUrl } from './api'

// Re-export services
export { authService } from './auth'
export { marketService } from './market'
export { 
  strategyService, 
  strategyAssetsService, 
  promptService, 
  strategyDecisionService 
} from './strategy'
export { intradayReportService } from './reports'
export { orderService, positionService } from './orders'
export { okxCredentialsService } from './okx'
export { sessionService } from './sessions'
export { accountBalanceService } from './balance'
