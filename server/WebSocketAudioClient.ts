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

export interface AudioDevice {
  deviceId: string;
  name: string;
  isDefault: boolean;
  state: string;
}

export interface CaptureStatus {
  isCapturing: boolean;
  selectedDeviceId?: string;
  selectedDeviceName?: string;
}

export class WebSocketAudioClient {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private callbacks: WebSocketCallbacks;
  
  // WebSocket and API URLs - now configurable
  private baseUrl: string = "http://localhost:5012";
  private wsUrl: string = "ws://localhost:5012";
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  constructor(callbacks: WebSocketCallbacks, baseUrl: string = "http://localhost:5012", wsUrl: string = "ws://localhost:5012") {
    this.callbacks = callbacks;
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
    this.callbacks.onLog('WebSocketAudioClient initialized');
  }

  // Update URLs dynamically
  public updateUrls(baseUrl: string, wsUrl: string) {
    const wasConnected = this.isConnected;
    
    if (wasConnected) {
      this.disconnect();
    }
    
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
    this.callbacks.onLog(`URLs updated - Base: ${baseUrl}, WebSocket: ${wsUrl}`);
    
    if (wasConnected) {
      // Reconnect with new URLs
      setTimeout(() => this.connect(), 1000);
    }
  }

  // Get current WebSocket URL
  private getWsUrl(): string {
    return `${this.wsUrl}/ws/audio`;
  }

  // Get current API base URL
  private getApiBaseUrl(): string {
    return this.baseUrl;
  }

  // Connect to the C# WebSocket server
  public connect() {
    if (this.ws && this.isConnected) {
      this.callbacks.onWarning('Already connected to audio stream');
      return;
    }

    try {
      const wsUrl = this.getWsUrl();
      this.callbacks.onLog(`Connecting to audio stream at ${wsUrl}...`);
      
      this.ws = new WebSocket(wsUrl);

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
    return this.getWsUrl();
  }

  // ===== Device Management API Methods =====

  /**
   * Get list of all available audio devices
   */
  public async getDevices(): Promise<AudioDevice[]> {
    try {
      this.callbacks.onLog('Fetching audio devices list...');
      const response = await fetch(`${this.getApiBaseUrl()}/api/devices`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Parse the response structure with renderDevices and captureDevices
      const allDevices: AudioDevice[] = [];
      
      // Add render devices (output/playback devices)
      if (data.renderDevices && Array.isArray(data.renderDevices)) {
        data.renderDevices.forEach((device: any) => {
          allDevices.push({
            deviceId: device.id,
            name: device.name,
            isDefault: device.index === 0,
            state: device.state
          });
        });
      }
      
      // Add capture devices (input/microphone devices)
      if (data.captureDevices && Array.isArray(data.captureDevices)) {
        data.captureDevices.forEach((device: any) => {
          allDevices.push({
            deviceId: device.id,
            name: device.name,
            isDefault: device.index === 0,
            state: device.state
          });
        });
      }
      
      this.callbacks.onLog(`Retrieved ${allDevices.length} audio devices (${data.renderDevices?.length || 0} render, ${data.captureDevices?.length || 0} capture)`);
      return allDevices;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.callbacks.onError(`Failed to get devices: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Select a specific audio device for capture
   */
  public async selectDevice(deviceId: string): Promise<void> {
    try {
      this.callbacks.onLog(`Selecting audio device: ${deviceId}`);
      const response = await fetch(`${this.getApiBaseUrl()}/api/devices/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      this.callbacks.onLog(`Device selected successfully: ${result.message}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.callbacks.onError(`Failed to select device: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Start audio capture
   */
  public async startCapture(): Promise<void> {
    try {
      this.callbacks.onLog('Starting audio capture...');
      const response = await fetch(`${this.getApiBaseUrl()}/api/capture/start`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      this.callbacks.onLog(`Capture started: ${result.message}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.callbacks.onError(`Failed to start capture: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Stop audio capture
   */
  public async stopCapture(): Promise<void> {
    try {
      this.callbacks.onLog('Stopping audio capture...');
      const response = await fetch(`${this.getApiBaseUrl()}/api/capture/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      this.callbacks.onLog(`Capture stopped: ${result.message}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.callbacks.onError(`Failed to stop capture: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Get current capture status
   */
  public async getCaptureStatus(): Promise<CaptureStatus> {
    try {
      this.callbacks.onLog('Fetching capture status...');
      const response = await fetch(`${this.getApiBaseUrl()}/api/capture/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const status = await response.json();
      this.callbacks.onLog(`Capture status: ${status.isCapturing ? 'Active' : 'Inactive'}`);
      return status;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.callbacks.onError(`Failed to get capture status: ${errorMsg}`);
      throw error;
    }
  }
}