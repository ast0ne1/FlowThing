import { createDeskThing } from "@deskthing/server";
import { ToClientData, GenericTransitData, AudioStreamData, AudioFormatData, AudioStreamStatus } from "./types";
import WebSocket from 'ws';
import { setupSettings, FlowThingSettingIDs, currentSettings } from './setupSettings.js';

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

// Note: currentSettings is imported from setupSettings.ts and shared

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

// Handle audio data requests from client (for FlowThing compatibility)
DeskThing.on('message', (data: any) => {
  console.log('[AudioStream] Received message from client:', data);
  
  if (data.type === 'audio_request') {
    console.log('[AudioStream] Handling audio request:', data);
    
    switch (data.request) {
      case 'start_stream':
        console.log('[AudioStream] Client requesting audio stream start');
        audioStreamService.connect();
        break;
        
      case 'stop_stream':
        console.log('[AudioStream] Client requesting audio stream stop');
        audioStreamService.disconnect();
        break;
        
      default:
        console.warn('[AudioStream] Unknown audio request:', data.request);
    }
  }
});

// Start listener - runs when the app starts
DeskThing.on('start', async () => {
  console.log("=== AUDIO STREAM APP STARTING ===");
  DeskThing.sendLog('Audio Stream app started');
  
  try {
    // Initialize FlowThing visualization settings
    console.log('[AudioStream] Initializing FlowThing visualization settings...');
    const settingsResult = setupSettings();
    
    if (settingsResult.success) {
      console.log('[AudioStream] Settings configured successfully');
      console.log('[AudioStream] Available settings:', Object.keys(settingsResult.settings));
      
      // Initialize current settings with defaults
      Object.values(FlowThingSettingIDs).forEach(settingId => {
        if (settingsResult.defaultSettings[settingId] !== undefined) {
          currentSettings[settingId] = settingsResult.defaultSettings[settingId];
        }
      });
      
      console.log('[AudioStream] Current settings initialized:', currentSettings);
    } else {
      console.warn('[AudioStream] Settings configuration may have issues');
    }
    
    // Note: Settings change listeners are already set up inside setupSettings()
    // via DeskThing.on(DESKTHING_EVENTS.SETTINGS, ...)
    // We just need to monitor currentSettings or add custom handling here if needed

    // Auto-connect WebSocket audio stream on start
    console.log('[AudioStream] Auto-connecting to WebSocket audio stream...');
    audioStreamService.connect();
    
    // Send initial status and settings after a delay
    setTimeout(() => {
      console.log('[AudioStream] Sending initial data to client');
      
      // Send audio stream status
      const status = audioStreamService.getStatus();
      DeskThing.send({ type: 'audio_stream_status', payload: status });
      console.log('[AudioStream] Audio stream status sent:', status);
      
      // Send initial FlowThing settings to client
      if (Object.keys(currentSettings).length > 0) {
        DeskThing.send({ 
          type: 'settings', 
          payload: currentSettings 
        });
        console.log('[AudioStream] Initial settings sent to client:', currentSettings);
      }
    }, 1000);
    
    console.log('[AudioStream] Server started successfully');
    console.log('[AudioStream] Current settings state:', currentSettings);
    console.log("=== AUDIO STREAM APP STARTED SUCCESSFULLY ===");
    
  } catch (error) {
    console.error('[AudioStream] Error during startup:', error);
    DeskThing.sendError('Audio Stream app failed to start: ' + error);
    throw error;
  }
});

// Handle stop event
DeskThing.on('stop', async () => {
  console.log("=== AUDIO STREAM APP STOPPING ===");
  DeskThing.sendLog('Audio Stream app stopping...');
  
  // Disconnect from WebSocket
  audioStreamService.disconnect();
  
  console.log("=== AUDIO STREAM APP STOPPED ===");
});

export default audioStreamService;