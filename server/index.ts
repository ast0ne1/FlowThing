import { createDeskThing } from "@deskthing/server";
import { ToClientData, GenericTransitData, AudioStreamData, AudioFormatData, AudioStreamStatus } from "./types";
import { setupSettings, FlowThingSettingIDs, currentSettings, setWebSocketClient, setAudioStreamService, triggerDeviceRefresh } from './setupSettings.js';
import { WebSocketAudioClient, WebSocketCallbacks } from './Websocketaudioclient.js';
import { spawn, type ChildProcess } from "child_process";
import { join as pathJoin, dirname as pathDirname } from "path";
import { existsSync as fsExistsSync } from "fs";
import { homedir } from "os";

const DeskThing = createDeskThing<GenericTransitData, ToClientData>();

class AudioStreamService {
  private wsClient: WebSocketAudioClient;
  private audioFormat: AudioFormatData | null = null;
  
  // WebSocket server configuration
  private readonly WS_URL = 'ws://localhost:5000/ws/audio';

  // Server process management
  private serverProcess: ChildProcess | null = null;
  private serverExecutablePath: string = "";
  private isServerRunning: boolean = false;
  private serverStartupDelay: number = 3000; // 3 seconds for audio server to start
  private autoStartServer: boolean = true;

  constructor() {
    // Set default server path (can be configured via settings)
    const appData = process.env.APPDATA || pathJoin(homedir(), 'AppData', 'Roaming');
    this.serverExecutablePath = pathJoin(appData, "deskthing", "apps", "weatherwaves", "client", "Audio.exe");
    
    DeskThing.sendLog('AudioStreamService initialized');
    
    // Initialize WebSocket client with default ports (will be updated from settings)
    const wsPort = 5000;
    const apiPort = 5000;
    
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
    
    this.wsClient = new WebSocketAudioClient(callbacks, wsPort, apiPort);
  }

  // Check if server executable exists
  private checkServerExecutable(): boolean {
    if (!this.serverExecutablePath) {
      DeskThing.sendLog('No server executable path configured');
      return false;
    }

    if (!fsExistsSync(this.serverExecutablePath)) {
      DeskThing.sendLog(`Server executable not found at: ${this.serverExecutablePath}`);
      return false;
    }

    return true;
  }

  // Start the audio server process
  public async startServer(): Promise<boolean> {
    if (this.isServerRunning) {
      DeskThing.sendWarning('Audio server is already running');
      return true;
    }

    if (!this.checkServerExecutable()) {
      return false;
    }

    DeskThing.sendLog(`Starting audio server from: ${this.serverExecutablePath}`);

    try {
      this.serverProcess = spawn(this.serverExecutablePath, [], {
        cwd: pathDirname(this.serverExecutablePath),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          DeskThing.sendLog(`[Audio Server] ${output}`);
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        const error = data.toString().trim();
        if (error) {
          DeskThing.sendError(`[Audio Server Error] ${error}`);
        }
      });

      this.serverProcess.on('exit', (code) => {
        this.isServerRunning = false;
        this.sendServerStatus();
        
        if (code === 0) {
          DeskThing.sendLog('Audio server stopped gracefully');
        } else {
          DeskThing.sendError(`Audio server exited with code ${code}`);
        }
      });

      this.serverProcess.on('error', (err) => {
        DeskThing.sendError(`Failed to start audio server: ${err.message}`);
        this.isServerRunning = false;
        this.sendServerStatus();
      });

      this.isServerRunning = true;
      this.sendServerStatus();
      DeskThing.sendLog('Audio server process started');

      DeskThing.sendLog(`Waiting ${this.serverStartupDelay}ms for server to initialize...`);
      await new Promise(resolve => setTimeout(resolve, this.serverStartupDelay));

      return true;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DeskThing.sendError(`Failed to start audio server: ${errorMsg}`);
      this.isServerRunning = false;
      this.sendServerStatus();
      return false;
    }
  }

  // Stop the audio server process
  public async stopServer(): Promise<void> {
    if (!this.serverProcess || !this.isServerRunning) {
      DeskThing.sendWarning('Audio server is not running');
      return;
    }

    DeskThing.sendLog('Stopping audio server...');

    try {
      this.serverProcess.kill('SIGTERM');
      
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.serverProcess && this.isServerRunning) {
            DeskThing.sendWarning('Forcing audio server to stop...');
            this.serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.serverProcess?.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.serverProcess = null;
      this.isServerRunning = false;
      this.sendServerStatus();
      DeskThing.sendLog('Audio server stopped');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DeskThing.sendError(`Error stopping server: ${errorMsg}`);
    }
  }

  // Restart the audio server
  public async restartServer(): Promise<boolean> {
    DeskThing.sendLog('Restarting audio server...');
    await this.stopServer();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.startServer();
  }

  // Connect to the WebSocket server (with optional auto-start)
  public async connect() {
    // Auto-start server if enabled and not running
    if (this.autoStartServer && !this.isServerRunning) {
      DeskThing.sendLog('Auto-starting audio server...');
      const started = await this.startServer();
      if (!started) {
        DeskThing.sendError('Failed to auto-start server. Cannot connect.');
        return;
      }
      
      // Server is now ready, trigger device refresh directly
      DeskThing.sendLog('Server started successfully, fetching audio devices...');
      triggerDeviceRefresh();
    }

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

  // Send server status to client
  private sendServerStatus() {
    DeskThing.send({ 
      type: 'server_status', 
      payload: { 
        isRunning: this.isServerRunning,
        executablePath: this.serverExecutablePath
      } 
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

  // Get server status
  public getServerStatus() {
    return {
      isRunning: this.isServerRunning,
      executablePath: this.serverExecutablePath
    };
  }

  // Update settings
  public updateSettings(settings: any) {
    if (!settings) {
      DeskThing.sendWarning('No settings provided');
      return;
    }

    try {
      const newAutoStartServer = Boolean(settings.autoStartServer?.value ?? settings.autoStartServer ?? true);
      const newServerPath = String(settings.serverExecutablePath?.value ?? settings.serverExecutablePath ?? this.serverExecutablePath);
      const newWsPort = parseInt(String(settings.wsPort?.value ?? settings.wsPort ?? "5000"));
      const newApiPort = parseInt(String(settings.apiPort?.value ?? settings.apiPort ?? "5000"));
      
      const serverPathChanged = newServerPath !== this.serverExecutablePath;
      
      this.autoStartServer = newAutoStartServer;
      this.serverExecutablePath = newServerPath;

      DeskThing.sendLog(`Settings updated - Auto-start: ${this.autoStartServer}, WS Port: ${newWsPort}, API Port: ${newApiPort}`);

      if (serverPathChanged) {
        DeskThing.sendLog(`Server path updated: ${this.serverExecutablePath}`);
      }


    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DeskThing.sendError(`Error updating settings: ${errorMsg}`);
    }
  }

  // Add method to get the WebSocket client
  public getWebSocketClient(): WebSocketAudioClient {
    return this.wsClient;
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
  } else if (request === "server_status") {
    // Send server status
    const serverStatus = audioStreamService.getServerStatus();
    DeskThing.send({ type: 'server_status', payload: serverStatus });
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

// Handle server control requests
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

      case 'start_server':
        console.log('[AudioStream] Client requesting server start');
        audioStreamService.startServer().then(started => {
          if (started) {
            DeskThing.sendLog('Server started by user request, fetching devices...');
            triggerDeviceRefresh();
          }
        });
        break;

      case 'stop_server':
        console.log('[AudioStream] Client requesting server stop');
        audioStreamService.stopServer();
        break;

      case 'restart_server':
        console.log('[AudioStream] Client requesting server restart');
        audioStreamService.restartServer().then(started => {
          if (started) {
            DeskThing.sendLog('Server restarted, fetching devices...');
            triggerDeviceRefresh();
          }
        });
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
    // Initialize FlowThing visualization settings FIRST
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
    
    // NOW set the WebSocket client reference (but don't fetch devices yet)
    console.log('[AudioStream] Setting WebSocket client reference...');
    setWebSocketClient(audioStreamService.getWebSocketClient());
    
    // Set the AudioStreamService reference for settings updates
    console.log('[AudioStream] Setting AudioStreamService reference...');
    setAudioStreamService(audioStreamService);
    
    // Auto-connect WebSocket audio stream on start (will auto-start server if enabled)
    console.log('[AudioStream] Auto-connecting to WebSocket audio stream...');
    await audioStreamService.connect();
    
    // Send initial status and settings after a delay to allow device fetch to complete
    setTimeout(() => {
      console.log('[AudioStream] Sending initial data to client');
      
      // Send audio stream status
      const status = audioStreamService.getStatus();
      DeskThing.send({ type: 'audio_stream_status', payload: status });
      console.log('[AudioStream] Audio stream status sent:', status);

      // Send server status
      const serverStatus = audioStreamService.getServerStatus();
      DeskThing.send({ type: 'server_status', payload: serverStatus });
      console.log('[AudioStream] Server status sent:', serverStatus);
      
      // Send initial FlowThing settings to client
      if (Object.keys(currentSettings).length > 0) {
        DeskThing.send({ 
          type: 'settings', 
          payload: currentSettings 
        });
        console.log('[AudioStream] Initial settings sent to client:', currentSettings);
      }
    }, 2000); // Increased to 2 seconds to give more time for device fetch
    
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
  
  // Stop the server process
  await audioStreamService.stopServer();
  
  console.log("=== AUDIO STREAM APP STOPPED ===");
});

export default audioStreamService;