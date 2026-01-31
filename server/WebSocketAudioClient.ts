import WebSocket from 'ws';
import { AudioFormatData, AudioStreamData } from './types';

export interface WebSocketCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onAudioFormat: (format: AudioFormatData) => void;
  onAudioData: (data: AudioStreamData) => void;
  onError: (error: string) => void;
  onLog: (message: string) => void;
  onWarning: (message: string) => void;
}

export class WebSocketAudioClient {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private callbacks: WebSocketCallbacks;
  
  // WebSocket server configuration
  private readonly WS_URL = 'ws://localhost:5024/ws/audio';
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  constructor(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks;
    this.callbacks.onLog('WebSocketAudioClient initialized');
  }

  // Connect to the C# WebSocket server
  public connect() {
    if (this.ws && this.isConnected) {
      this.callbacks.onWarning('Already connected to audio stream');
      return;
    }

    try {
      this.callbacks.onLog(`Connecting to audio stream at ${this.WS_URL}...`);
      
      this.ws = new WebSocket(this.WS_URL);

      this.ws.on('open', () => {
        this.isConnected = true;
        this.callbacks.onLog('Connected to audio stream successfully');
        this.callbacks.onConnected();
        
        // Clear reconnect interval if exists
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        this.callbacks.onError(`WebSocket error: ${error.message}`);
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.callbacks.onLog('Disconnected from audio stream');
        this.callbacks.onDisconnected();
        
        // Auto-reconnect
        this.scheduleReconnect();
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.callbacks.onError(`Failed to connect to audio stream: ${errorMsg}`);
      this.scheduleReconnect();
    }
  }

  // Handle incoming WebSocket messages
  private handleMessage(data: WebSocket.Data) {
    if (typeof data === 'string') {
      // First message: Audio format info
      try {
        const audioFormat = JSON.parse(data) as AudioFormatData;
        this.callbacks.onLog(`Audio format received: ${audioFormat.sampleRate}Hz, ${audioFormat.channels}ch, ${audioFormat.bitsPerSample}bit`);
        this.callbacks.onAudioFormat(audioFormat);
      } catch (error) {
        this.callbacks.onError(`Failed to parse audio format: ${error}`);
      }
    } else {
      // Binary audio data
      this.handleAudioData(data as Buffer);
    }
  }

  // Handle binary audio data
  private handleAudioData(buffer: Buffer) {
    // Send raw audio data to client
    const audioData: AudioStreamData = {
      data: Array.from(buffer),
      length: buffer.length,
      timestamp: Date.now()
    };
    
    this.callbacks.onAudioData(audioData);
  }

  // Disconnect from WebSocket
  public disconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.ws) {
      this.callbacks.onLog('Disconnecting from audio stream...');
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect() {
    if (this.reconnectInterval) {
      return; // Already scheduled
    }

    this.callbacks.onLog(`Will attempt to reconnect in ${this.RECONNECT_DELAY / 1000} seconds...`);
    
    this.reconnectInterval = setInterval(() => {
      this.callbacks.onLog('Attempting to reconnect...');
      this.connect();
    }, this.RECONNECT_DELAY);
  }

  // Get connection status
  public getIsConnected(): boolean {
    return this.isConnected;
  }

  // Get WebSocket URL
  public getServerUrl(): string {
    return this.WS_URL;
  }
}