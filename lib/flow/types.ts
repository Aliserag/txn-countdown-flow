export interface Transaction {
  id: string;
  type: 'cadence' | 'evm';
  number: number;
  proposer: string;
  timestamp: number;
  blockHeight: number;
  status: 'sealed' | 'pending';
}

export interface FlowBlock {
  header: {
    id: string;
    height: string;
    timestamp: string;
  };
  payload?: {
    collection_guarantees?: Array<{
      collection_id: string;
    }>;
  };
}

export interface FlowEvent {
  type: string;
  transaction_id: string;
  transaction_index: string;
  event_index: string;
  payload: string;
}

export interface FlowWebSocketMessage {
  block?: FlowBlock;
  events?: FlowEvent[];
  heartbeat?: {
    block_height: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

export interface Stats {
  total: number;
  cadence: number;
  evm: number;
  timestamp: number;
  blockHeight: number;
}

export interface WinnerInfo {
  transaction: Transaction;
  timestamp: number;
  celebrationShown: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
  error: string | null;
}

export interface SSETransaction {
  id: string;
  type: 'cadence' | 'evm';
  number: number;
  proposer: string;
  timestamp: number;
  blockHeight: number;
}

export interface FlowscanTransaction {
  hash: string;
  time: string;
  authorizers: string[];
  payer: string;
  proposer: string;
  status: string;
  events?: Array<{
    type: string;
  }>;
}

export interface FlowscanGraphQLResponse {
  data: {
    transactions?: {
      edges: Array<{
        node: FlowscanTransaction;
      }>;
      pageInfo: {
        hasNextPage: boolean;
      };
    };
    chainStats?: {
      transactionCount: string;
    };
  };
}
