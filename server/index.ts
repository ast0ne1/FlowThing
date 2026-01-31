import { createDeskThing } from "@deskthing/server";
import { ToClientData, GenericTransitData, AudioStreamData, AudioFormatData, AudioStreamStatus } from "./types";
import { setupSettings, FlowThingSettingIDs, currentSettings } from './setupSettings.js';
import { WebSocketAudioClient, WebSocketCallbacks } from './Websocketaudioclient.js';

const DeskThing = createDeskThing<GenericTransitData, ToClientData>();

class AudioStreamService {
  private wsClient: WebSocketAudioClient;
  private audioFormat: AudioFormatData | null = null;
  
  // WebSocket server configuration
  private readonly WS_URL = 'ws://localhost:5024/ws/audio';

  constructor() {
    DeskThing.sendLog('AudioStreamService initialized');
    
    // Set up callbacks for WebSocket client
    const callbacks: WebSocketCallbacks = {
      onConnected: () => {
        this.sendStatus();
      },
      onDisconnected: () => {
        this.sendStatus();
      },
      onAudioFormat: (format: AudioFormatData) => {
        this.audioFormat = format;
        DeskThing.send({ 
          type: 'audio_format', 
          payload: this.audioFormat
        });
        // Update status with new format
        this.sendStatus();
      },
      onAudioData: (data: AudioStreamData) => {
        DeskThing.send({ 
          type: 'audio_data', 
          payload: data
        });
      },
      onError: (error: string) => {
        DeskThing.sendError(error);
      },
      onLog: (message: string) => {
        DeskThing.sendLog(message);
      },
      onWarning: (message: string) => {
        DeskThing.sendWarning(message);
      }
    };
    
    this.wsClient = new WebSocketAudioClient(callbacks);
  }

  // Connect to the C# WebSocket server
  public connect() {
    this.wsClient.connect();
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
    this.wsClient.disconnect();
    this.audioFormat = null;
  }

  // Get connection status
  public getStatus(): AudioStreamStatus {
    return {
      connected: this.wsClient.getIsConnected(),
      audioFormat: this.audioFormat || undefined,
      serverUrl: this.wsClient.getServerUrl()
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