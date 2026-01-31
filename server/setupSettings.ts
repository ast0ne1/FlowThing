import { DeskThing } from '@deskthing/server';
import { DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';
import { WebSocketAudioClient, AudioDevice } from './WebSocketAudioClient.js';

// Define setting IDs for consistency
export const FlowThingSettingIDs = {
  AUDIO_SENSITIVITY: 'audioSensitivity',
  BACKGROUND_COLOR: 'backgroundColor',
  PRIMARY_COLOR: 'primaryColor',
  ANIMATION_SPEED: 'animationSpeed',
  AUDIO_SOURCE: 'audioSource',
  AUDIO_DEVICE: 'audioDevice',
  //AUTO_CHANGE_INTERVAL: 'autoChangeInterval',
  SHOW_VISUALIZATION_NAME: 'showVisualizationName',
  PERFORMANCE_MODE: 'performanceMode',
  STOP_CAPTURE: 'stopCapture',
  BASE_URL: 'baseUrl',
  WS_URL: 'wsUrl',
  AUTO_START_SERVER: 'autoStartServer'
} as const;

// Define default settings locally for server-side use
const defaultSettings = {
  [FlowThingSettingIDs.AUDIO_SENSITIVITY]: 50,
  [FlowThingSettingIDs.BACKGROUND_COLOR]: "#000000",
  [FlowThingSettingIDs.PRIMARY_COLOR]: "#667eea",
  [FlowThingSettingIDs.ANIMATION_SPEED]: 50,
  [FlowThingSettingIDs.AUDIO_SOURCE]: "system",
  [FlowThingSettingIDs.AUDIO_DEVICE]: "",
  //[FlowThingSettingIDs.AUTO_CHANGE_INTERVAL]: 0,
  [FlowThingSettingIDs.SHOW_VISUALIZATION_NAME]: true,
  [FlowThingSettingIDs.PERFORMANCE_MODE]: "balanced",
  [FlowThingSettingIDs.STOP_CAPTURE]: false,
  [FlowThingSettingIDs.BASE_URL]: "http://localhost:5012",
  [FlowThingSettingIDs.WS_URL]: "ws://localhost:5012",
  [FlowThingSettingIDs.AUTO_START_SERVER]: true
};

// Export function to update current settings from outside
export let currentSettings: Record<string, any> = {};

// Store WebSocket client reference
let wsClient: WebSocketAudioClient | null = null;

// Store AudioStreamService reference for settings updates
let audioStreamService: any = null;

// Store available devices
let availableDevices: AudioDevice[] = [];

export function setWebSocketClient(client: WebSocketAudioClient) {
  wsClient = client;
  // Don't fetch devices immediately - wait for server to be ready
  console.log('[FlowThing] WebSocket client set, waiting for server to be ready...');
}

// Function to manually trigger device refresh (called when server is ready)
export function triggerDeviceRefresh() {
  console.log('[FlowThing] Triggering device refresh...');
  refreshDeviceList();
}

export function setAudioStreamService(service: any) {
  audioStreamService = service;
  console.log('[FlowThing] AudioStreamService reference set');
}

async function refreshDeviceList() {
  if (!wsClient) {
    console.warn('[FlowThing] WebSocket client not available, cannot fetch devices');
    return;
  }

  try {
    console.log('[FlowThing] Fetching audio devices...');
    availableDevices = await wsClient.getDevices();
    console.log('[FlowThing] Found devices:', availableDevices);
    
    // Update the audio device setting with new options
    if (availableDevices.length > 0) {
      const deviceOptions = availableDevices.map(device => ({
        label: `${device.name}${device.isDefault ? ' (Default)' : ''}`,
        value: device.deviceId
      }));
      
      // Use setSettingOptions to update the dropdown options dynamically
      console.log('[FlowThing] Updating device options with setSettingOptions:', deviceOptions);
      DeskThing.setSettingOptions(FlowThingSettingIDs.AUDIO_DEVICE, deviceOptions);
      
      // Determine the default device value
      const defaultDeviceId = availableDevices.find(d => d.isDefault)?.deviceId || availableDevices[0].deviceId;
      
      // Update current settings with the default device if not already set
      if (!currentSettings[FlowThingSettingIDs.AUDIO_DEVICE]) {
        currentSettings[FlowThingSettingIDs.AUDIO_DEVICE] = defaultDeviceId;
        
        // Update the setting value as well
        const updatedSettings = {
          [FlowThingSettingIDs.AUDIO_DEVICE]: {
            id: FlowThingSettingIDs.AUDIO_DEVICE,
            type: SETTING_TYPES.SELECT,
            label: "Audio Device",
            description: "Select the audio device to capture from",
            value: defaultDeviceId,
            options: deviceOptions
          }
        };
        
        DeskThing.addSettings(updatedSettings as any);
      }
      
      console.log('[FlowThing] Updated device list with', deviceOptions.length, 'devices');
    } else {
      console.warn('[FlowThing] No audio devices found!');
      DeskThing.setSettingOptions(FlowThingSettingIDs.AUDIO_DEVICE, [
        { label: "No devices available", value: "" }
      ]);
    }
  } catch (error) {
    console.error('[FlowThing] Error fetching devices:', error);
    DeskThing.setSettingOptions(FlowThingSettingIDs.AUDIO_DEVICE, [
      { label: "Error loading devices - Check server", value: "" }
    ]);
  }
}

async function handleDeviceSelection(deviceId: string) {
  if (!wsClient) {
    console.error('[FlowThing] WebSocket client not available');
    return;
  }

  // Don't do anything if the device ID is empty or unchanged
  if (!deviceId || deviceId === currentSettings[FlowThingSettingIDs.AUDIO_DEVICE]) {
    console.log('[FlowThing] Device ID unchanged or empty, skipping selection');
    return;
  }

  try {
    console.log('[FlowThing] Selecting device:', deviceId);
    
    // Select the device
    await wsClient.selectDevice(deviceId);
    console.log('[FlowThing] Device selected successfully');
    
    // Automatically start capture
    console.log('[FlowThing] Starting capture automatically...');
    await wsClient.startCapture();
    console.log('[FlowThing] Capture started successfully');
    
    // Update current settings
    currentSettings[FlowThingSettingIDs.AUDIO_DEVICE] = deviceId;
    
    // Notify client
    DeskThing.send({ 
      type: 'settings', 
      payload: currentSettings 
    });
    
    DeskThing.sendLog(`Audio capture started on device: ${availableDevices.find(d => d.deviceId === deviceId)?.name || deviceId}`);
  } catch (error) {
    console.error('[FlowThing] Error handling device selection:', error);
    DeskThing.sendError(`Failed to select device: ${error}`);
  }
}

async function handleStopCapture() {
  if (!wsClient) {
    console.error('[FlowThing] WebSocket client not available');
    return;
  }

  try {
    console.log('[FlowThing] Stopping capture...');
    await wsClient.stopCapture();
    console.log('[FlowThing] Capture stopped successfully');
  } catch (error) {
    console.error('[FlowThing] Error stopping capture:', error);
    DeskThing.sendError(`Failed to stop capture: ${error}`);
  }
}

export function setupSettings() {
  console.log('[FlowThing] Setting up settings configuration...');
  
  try {
    // Use the same structure as Spotify - object with setting IDs as keys
    const deskThingSettings = {
      [FlowThingSettingIDs.BASE_URL]: {
        id: FlowThingSettingIDs.BASE_URL,
        type: SETTING_TYPES.STRING,
        label: "Base URL",
        description: "Base URL for HTTP API requests (will reconnect on change)",
        value: defaultSettings[FlowThingSettingIDs.BASE_URL]
      },
      [FlowThingSettingIDs.WS_URL]: {
        id: FlowThingSettingIDs.WS_URL,
        type: SETTING_TYPES.STRING,
        label: "WebSocket URL",
        description: "WebSocket URL for audio stream connection (will reconnect on change)",
        value: defaultSettings[FlowThingSettingIDs.WS_URL]
      },
      [FlowThingSettingIDs.AUTO_START_SERVER]: {
        id: FlowThingSettingIDs.AUTO_START_SERVER,
        type: SETTING_TYPES.BOOLEAN,
        label: "Auto-Start Server",
        description: "Automatically start the C# audio server on app launch",
        value: defaultSettings[FlowThingSettingIDs.AUTO_START_SERVER]
      },
      [FlowThingSettingIDs.AUDIO_SENSITIVITY]: {
        id: FlowThingSettingIDs.AUDIO_SENSITIVITY,
        type: SETTING_TYPES.RANGE,
        label: "Audio Sensitivity",
        description: "Adjust how sensitive the visualization is to audio input",
        value: defaultSettings[FlowThingSettingIDs.AUDIO_SENSITIVITY],
        min: 1,
        max: 100,
        step: 1
      },
      [FlowThingSettingIDs.BACKGROUND_COLOR]: {
        id: FlowThingSettingIDs.BACKGROUND_COLOR,
        type: SETTING_TYPES.COLOR,
        label: "Background Color",
        description: "Choose the background color for visualizations",
        value: defaultSettings[FlowThingSettingIDs.BACKGROUND_COLOR]
      },
      [FlowThingSettingIDs.PRIMARY_COLOR]: {
        id: FlowThingSettingIDs.PRIMARY_COLOR,
        type: SETTING_TYPES.COLOR,
        label: "Primary Color",
        description: "Choose the primary color for visualization elements",
        value: defaultSettings[FlowThingSettingIDs.PRIMARY_COLOR]
      },
      [FlowThingSettingIDs.ANIMATION_SPEED]: {
        id: FlowThingSettingIDs.ANIMATION_SPEED,
        type: SETTING_TYPES.RANGE,
        label: "Animation Speed",
        description: "Control the speed of visualization animations",
        value: defaultSettings[FlowThingSettingIDs.ANIMATION_SPEED],
        min: 1,
        max: 100,
        step: 1
      },
      [FlowThingSettingIDs.AUDIO_SOURCE]: {
        id: FlowThingSettingIDs.AUDIO_SOURCE,
        type: SETTING_TYPES.SELECT,
        label: "Audio Source",
        description: "Choose the audio source for visualizations",
        value: defaultSettings[FlowThingSettingIDs.AUDIO_SOURCE],
        options: [
          { label: "🔊 System Audio", value: "system" },
          { label: "🎤 Microphone", value: "microphone" },
          { label: "🎲 Demo Mode", value: "mock" }
        ]
      },
      [FlowThingSettingIDs.AUDIO_DEVICE]: {
        id: FlowThingSettingIDs.AUDIO_DEVICE,
        type: SETTING_TYPES.SELECT,
        label: "Audio Device",
        description: "Select the audio device to capture from (loading...)",
        value: defaultSettings[FlowThingSettingIDs.AUDIO_DEVICE],
        options: [
          { label: "Loading devices...", value: "" }
        ]
      },
      // [FlowThingSettingIDs.AUTO_CHANGE_INTERVAL]: {
      //   id: FlowThingSettingIDs.AUTO_CHANGE_INTERVAL,
      //   type: SETTING_TYPES.RANGE,
      //   label: "Auto Change Timer",
      //   description: "Automatically change visualization every X seconds (0 = disabled)",
      //   value: defaultSettings[FlowThingSettingIDs.AUTO_CHANGE_INTERVAL],
      //   min: 0,
      //   max: 300,
      //   step: 10
      // },
      [FlowThingSettingIDs.SHOW_VISUALIZATION_NAME]: {
        id: FlowThingSettingIDs.SHOW_VISUALIZATION_NAME,
        type: SETTING_TYPES.BOOLEAN,
        label: "Show Visualization Name",
        description: "Display the current visualization name on screen",
        value: defaultSettings[FlowThingSettingIDs.SHOW_VISUALIZATION_NAME]
      },
      [FlowThingSettingIDs.PERFORMANCE_MODE]: {
        id: FlowThingSettingIDs.PERFORMANCE_MODE,
        type: SETTING_TYPES.SELECT,
        label: "Performance Mode",
        description: "Choose between quality and performance for heavy visualizations",
        value: defaultSettings[FlowThingSettingIDs.PERFORMANCE_MODE],
        options: [
          { label: "Quality", value: "quality" },
          { label: "Balanced", value: "balanced" },
          { label: "Performance", value: "performance" }
        ]
      },
      [FlowThingSettingIDs.STOP_CAPTURE]: {
        id: FlowThingSettingIDs.STOP_CAPTURE,
        type: SETTING_TYPES.BOOLEAN,
        label: "Stop Audio Capture",
        description: "Stop capturing audio from the selected device",
        value: false
      }
    };

    // Initialize settings with DeskThing using the correct structure
    const result = DeskThing.initSettings(deskThingSettings as any);
    console.log('[FlowThing] Settings initialized successfully:', result);
    console.log('[FlowThing] Available settings:', Object.keys(deskThingSettings));
    
    // Listen for settings changes from DeskThing (following Spotify's pattern)
    DeskThing.on(DESKTHING_EVENTS.SETTINGS, async (settingData) => {
      const settings = settingData.payload;
      
      if (!settings) return;
      
      console.log('[FlowThing] Received settings update from DeskThing:', settings);
      
      // Track if URL settings changed
      let urlsChanged = false;
      let baseUrlValue = currentSettings[FlowThingSettingIDs.BASE_URL];
      let wsUrlValue = currentSettings[FlowThingSettingIDs.WS_URL];
      
      // Process setting changes and update currentSettings
      Object.entries(settings).forEach(([key, setting]: [string, any]) => {
        if (setting && setting.value !== undefined) {
          console.log(`[FlowThing] Setting updated: ${key} = ${setting.value}`);
          
          // Handle special cases
          if (key === FlowThingSettingIDs.BASE_URL && setting.value !== currentSettings[key]) {
            baseUrlValue = setting.value;
            urlsChanged = true;
          } else if (key === FlowThingSettingIDs.WS_URL && setting.value !== currentSettings[key]) {
            wsUrlValue = setting.value;
            urlsChanged = true;
          } else if (key === FlowThingSettingIDs.AUDIO_DEVICE && setting.value !== currentSettings[key]) {
            // Device selection changed
            handleDeviceSelection(setting.value);
          } else if (key === FlowThingSettingIDs.STOP_CAPTURE && setting.value === true) {
            // Stop capture button pressed
            handleStopCapture();
            // Reset the button
            setting.value = false;
          }
          
          currentSettings[key] = setting.value;
        }
      });
      
      // If URLs changed or server settings changed, notify AudioStreamService
      if (audioStreamService) {
        audioStreamService.updateSettings(currentSettings);
      }
      
      // Forward updated settings to client
      DeskThing.send({ 
        type: 'settings', 
        payload: currentSettings 
      });
      
      console.log('[FlowThing] Settings forwarded to client:', currentSettings);
    });
    
    return {
      success: true,
      settings: deskThingSettings,
      defaultSettings
    };
  } catch (error) {
    console.error('[FlowThing] Error initializing settings:', error);
    throw error;
  }
}