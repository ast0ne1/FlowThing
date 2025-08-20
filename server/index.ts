import { DeskThing } from '@deskthing/server';
import { DESKTHING_EVENTS } from '@deskthing/types';
import { setupSettings, FlowThingSettingIDs } from './setupSettings.js';

let currentSettings: any = {};

// Handle audio data requests from client
const handleAudioRequest = (data: any) => {
  console.log('[FlowThing] Handling audio request:', data);
  
  switch (data.request) {
    case 'start_stream':
      console.log('[FlowThing] Starting audio stream...');
      // Request audio data from DeskThing system if available
      try {
        // Try to get audio data from DeskThing's audio system
        DeskThing.send({
          type: 'audio_request',
          request: 'subscribe'
        });
        console.log('[FlowThing] Audio stream subscription requested');
      } catch (error) {
        console.warn('[FlowThing] Failed to request audio stream:', error);
      }
      break;
      
    case 'stop_stream':
      console.log('[FlowThing] Stopping audio stream...');
      try {
        DeskThing.send({
          type: 'audio_request',
          request: 'unsubscribe'
        });
        console.log('[FlowThing] Audio stream unsubscription requested');
      } catch (error) {
        console.warn('[FlowThing] Failed to stop audio stream:', error);
      }
      break;
      
    default:
      console.warn('[FlowThing] Unknown audio request:', data.request);
  }
};

const start = async () => {
  console.log('[FlowThing] Server starting...');
  
  try {
    // Initialize settings first - this is critical for global settings to appear
    console.log('[FlowThing] Initializing settings...');
    const settingsResult = setupSettings();
    
    if (settingsResult.success) {
      console.log('[FlowThing] Settings configured successfully');
      console.log('[FlowThing] Available settings:', Object.keys(settingsResult.settings));
      
      // Initialize current settings with defaults
      Object.values(FlowThingSettingIDs).forEach(settingId => {
        if (settingsResult.defaultSettings[settingId] !== undefined) {
          currentSettings[settingId] = settingsResult.defaultSettings[settingId];
        }
      });
    } else {
      console.warn('[FlowThing] Settings configuration may have issues');
    }
    
    // Handle settings updates from DeskThing
    DeskThing.on('settings', (settings: any) => {
      console.log('[FlowThing] Settings updated from DeskThing:', settings);
      currentSettings = { ...currentSettings, ...settings };
    });
    
    // Handle specific setting changes
    DeskThing.on('setting:changed', (data: any) => {
      console.log('[FlowThing] Individual setting changed:', data);
      if (data.key && data.value !== undefined) {
        currentSettings[data.key] = data.value;
      }
    });
    
    // Handle audio data requests from client
    DeskThing.on('message', (data: any) => {
      console.log('[FlowThing] Received message from client:', data);
      
      if (data.type === 'audio_request') {
        handleAudioRequest(data);
      }
    });
    
    // Handle audio data from DeskThing system (if available)
    DeskThing.on('audio', (audioData: any) => {
      console.log('[FlowThing] Received audio data from DeskThing system:', audioData);
      
      // Forward audio data to client
      DeskThing.send({
        app: 'flowthing',
        type: 'audio',
        payload: audioData
      });
    });
    
    console.log('[FlowThing] Server started successfully');
    console.log('[FlowThing] Current settings state:', currentSettings);
    
  } catch (error) {
    console.error('[FlowThing] Error starting server:', error);
    // Re-throw the error so DeskThing knows the app failed to start
    throw error;
  }
};

const stop = async () => {
  console.log('[FlowThing] Server stopping...');
  // Cleanup any resources if needed
};

// Add error handling for the event listeners
try {
  // Main Entrypoint of the server
  DeskThing.on(DESKTHING_EVENTS.START, start);
  
  // Main exit point of the server
  DeskThing.on(DESKTHING_EVENTS.STOP, stop);
  
  console.log('[FlowThing] Event listeners registered successfully');
} catch (error) {
  console.error('[FlowThing] Failed to register event listeners:', error);
}

// Export the start function for potential direct calling
export { start, stop };