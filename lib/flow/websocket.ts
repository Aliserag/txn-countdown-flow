import { FlowWebSocketMessage, FlowBlock, FlowEvent } from './types';

const FLOW_WS_URL = 'wss://rest-mainnet.onflow.org/v1/ws';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

export type MessageCallback = (message: FlowWebSocketMessage) => void;
export type StatusCallback = (status: { connected: boolean; error: string | null }) => void;

export class FlowWebSocketClient {
  private ws: WebSocket | null = null;
  private messageCallbacks: Set<MessageCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isIntentionallyClosed = false;
  private subscriptionId: string | null = null;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(FLOW_WS_URL);

      this.ws.onopen = () => {
        console.log('Flow WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyStatus({ connected: true, error: null });
        this.subscribeToBlocks();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyStatus({ connected: false, error: 'Connection error' });
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.stopHeartbeat();
        this.notifyStatus({ connected: false, error: null });

        if (!this.isIntentionallyClosed && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.notifyStatus({ connected: false, error: 'Failed to connect' });
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  private subscribeToBlocks(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    // Subscribe to sealed blocks
    const subscribeMessage = {
      action: 'subscribe',
      topic: 'blocks',
      arguments: {
        block_status: 'sealed',
      },
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    console.log('Subscribed to sealed blocks');
  }

  private handleMessage(data: any): void {
    // Handle subscription confirmation
    if (data.subscription_id) {
      this.subscriptionId = data.subscription_id;
      console.log('Subscription confirmed:', this.subscriptionId);
      return;
    }

    // Handle heartbeat response
    if (data.heartbeat) {
      console.log('Heartbeat received at height:', data.heartbeat.block_height);
      return;
    }

    // Handle block data
    if (data.block) {
      const message: FlowWebSocketMessage = {
        block: data.block,
      };
      this.notifyMessage(message);
    }

    // Handle events
    if (data.events) {
      const message: FlowWebSocketMessage = {
        events: data.events,
      };
      this.notifyMessage(message);
    }

    // Handle errors
    if (data.error) {
      console.error('WebSocket error from server:', data.error);
      this.notifyStatus({ connected: true, error: data.error.message });
    }
  }

  private notifyMessage(message: FlowWebSocketMessage): void {
    this.messageCallbacks.forEach((callback) => callback(message));
  }

  private notifyStatus(status: { connected: boolean; error: string | null }): void {
    this.statusCallbacks.forEach((callback) => callback(status));
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // The Flow WebSocket expects a specific ping format
        this.ws.send(JSON.stringify({ ping: true }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.min(this.reconnectAttempts, 5);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }
}

// Singleton instance for client-side use
let clientInstance: FlowWebSocketClient | null = null;

export function getFlowWebSocketClient(): FlowWebSocketClient {
  if (typeof window === 'undefined') {
    throw new Error('FlowWebSocketClient can only be used on the client side');
  }
  if (!clientInstance) {
    clientInstance = new FlowWebSocketClient();
  }
  return clientInstance;
}
