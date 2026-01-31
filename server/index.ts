import { createDeskThing } from "@deskthing/server";
import { ToClientData, GenericTransitData, AudioStreamData, AudioFormatData, AudioStreamStatus } from "./types";
import WebSocket from 'ws';

const DeskThing = createDeskThing<GenericTransitData, ToClientData>();

class AudioStreamService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private audioFormat: AudioFormatData | null = null;
  
  // WebSocket server configuration
  private readonly WS_URL = 'ws://localhost:5024/ws/audio';
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  constructor() {
    DeskThing.sendLog('AudioStreamService initialized');
  }

  // Connect to the C# WebSocket server
  public connect() {
    if (this.ws && this.isConnected) {
      DeskThing.sendWarning('Already connected to audio stream');
      return;
    }

    try {
      DeskThing.sendLog(`Connecting to audio stream at ${this.WS_URL}...`);
      
      this.ws = new WebSocket(this.WS_URL);

      this.ws.on('open', () => {
        this.isConnected = true;
        DeskThing.sendLog('Connected to audio stream successfully');
        this.sendStatus();
        
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
        DeskThing.sendError(`WebSocket error: ${error.message}`);
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        DeskThing.sendLog('Disconnected from audio stream');
        this.sendStatus();
        
        // Auto-reconnect
        this.scheduleReconnect();
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DeskThing.sendError(`Failed to connect to audio stream: ${errorMsg}`);
      this.scheduleReconnect();
    }
  }

  // Handle incoming WebSocket messages
  private handleMessage(data: WebSocket.Data) {
    if (typeof data === 'string') {
      // First message: Audio format info
      try {
        this.audioFormat = JSON.parse(data) as AudioFormatData;
        DeskThing.sendLog(`Audio format received: ${this.audioFormat.sampleRate}Hz, ${this.audioFormat.channels}ch, ${this.audioFormat.bitsPerSample}bit`);
        DeskThing.send({ 
          type: 'audio_format', 
          payload: this.audioFormat
        });
        // Update status with new format
        this.sendStatus();
      } catch (error) {
        DeskThing.sendError(`Failed to parse audio format: ${error}`);
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
    
    DeskThing.send({ 
      type: 'audio_data', 
      payload: audioData
    });
  }

  // Send current status to client
  private sendStatus() {
    const status = this.getStatus();
    console.log('Sending status to client:', status);
    DeskThing.send({ 
      type: 'audio_stream_status', 
      payload: status 
    });
  }

  // Disconnect from WebSocket
  public disconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.ws) {
      DeskThing.sendLog('Disconnecting from audio stream...');
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
      this.audioFormat = null;
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect() {
    if (this.reconnectInterval) {
      return; // Already scheduled
    }

    DeskThing.sendLog(`Will attempt to reconnect in ${this.RECONNECT_DELAY / 1000} seconds...`);
    
    this.reconnectInterval = setInterval(() => {
      DeskThing.sendLog('Attempting to reconnect...');
      this.connect();
    }, this.RECONNECT_DELAY);
  }

  // Get connection status
  public getStatus(): AudioStreamStatus {
    return {
      connected: this.isConnected,
      audioFormat: this.audioFormat || undefined,
      serverUrl: this.WS_URL
    };
  }
}

// Create service instance
const audioStreamService = new AudioStreamService();

// Handle client requests using the generic "get" handler
DeskThing.on("get", async (data: any) => {
  console.log("=== GET REQUEST RECEIVED ===");
  console.log("Request data:", data);
  
  const request = data?.payload?.request || data?.request;
  console.log("Request type:", request);
  
  if (request === "status" || !request) {
    // Send status if requested or if no specific request
    console.log("Sending audio stream status");
    const status = audioStreamService.getStatus();
    DeskThing.send({ type: 'audio_stream_status', payload: status });
  }
});

// Handle CONNECT requests
DeskThing.on("connect", async () => {
  DeskThing.sendLog('Received CONNECT request');
  audioStreamService.connect();
});

// Handle DISCONNECT requests
DeskThing.on("disconnect", async () => {
  DeskThing.sendLog('Received DISCONNECT request');
  audioStreamService.disconnect();
});

// Start listener - runs when the app starts
DeskThing.on('start', async () => {
  console.log("=== AUDIO STREAM APP STARTING ===");
  DeskThing.sendLog('Audio Stream app started');
  
  // Auto-connect on start
  audioStreamService.connect();
  
  // Send initial status after a delay
  setTimeout(() => {
    console.log("Sending initial status to client");
    const status = audioStreamService.getStatus();
    DeskThing.send({ type: 'audio_stream_status', payload: status });
  }, 1000);
  
  console.log("=== AUDIO STREAM APP STARTED SUCCESSFULLY ===");
});

// Handle stop event
DeskThing.on('stop', async () => {
  console.log("=== AUDIO STREAM APP STOPPING ===");
  DeskThing.sendLog('Audio Stream app stopping...');
  audioStreamService.disconnect();
});

export default audioStreamService;