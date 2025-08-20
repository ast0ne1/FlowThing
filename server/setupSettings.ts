import { DeskThing } from '@deskthing/server';
import { DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';

// Define setting IDs for consistency
export const FlowThingSettingIDs = {
  AUDIO_SENSITIVITY: 'audioSensitivity',
  BACKGROUND_COLOR: 'backgroundColor',
  PRIMARY_COLOR: 'primaryColor',
  ANIMATION_SPEED: 'animationSpeed',
  AUDIO_SOURCE: 'audioSource',
  AUTO_CHANGE_INTERVAL: 'autoChangeInterval',
  SHOW_VISUALIZATION_NAME: 'showVisualizationName',
  PERFORMANCE_MODE: 'performanceMode'
} as const;

// Define default settings locally for server-side use
const defaultSettings = {
  [FlowThingSettingIDs.AUDIO_SENSITIVITY]: 50,
  [FlowThingSettingIDs.BACKGROUND_COLOR]: "#000000",
  [FlowThingSettingIDs.PRIMARY_COLOR]: "#667eea",
  [FlowThingSettingIDs.ANIMATION_SPEED]: 50,
  [FlowThingSettingIDs.AUDIO_SOURCE]: "mock",
  [FlowThingSettingIDs.AUTO_CHANGE_INTERVAL]: 30,
  [FlowThingSettingIDs.SHOW_VISUALIZATION_NAME]: true,
  [FlowThingSettingIDs.PERFORMANCE_MODE]: "balanced"
};

export function setupSettings() {
  console.log('[FlowThing] Setting up settings configuration...');
  
  try {
    // Use the same structure as Spotify - object with setting IDs as keys
    const deskThingSettings = {
      [DeskVizorSettingIDs.AUDIO_SENSITIVITY]: {
        id: DeskVizorSettingIDs.AUDIO_SENSITIVITY,
        type: SETTING_TYPES.RANGE,
        label: "Audio Sensitivity",
        description: "Adjust how sensitive the visualization is to audio input",
        value: defaultSettings[DeskVizorSettingIDs.AUDIO_SENSITIVITY],
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
          { label: "🎵 DeskThing Audio", value: "deskthing" },
          { label: "🔊 System Audio", value: "system" },
          { label: "🎤 Microphone", value: "microphone" },
          { label: "🎲 Demo Mode", value: "mock" }
        ]
      },
      [FlowThingSettingIDs.AUTO_CHANGE_INTERVAL]: {
        id: FlowThingSettingIDs.AUTO_CHANGE_INTERVAL,
        type: SETTING_TYPES.RANGE,
        label: "Auto Change Timer",
        description: "Automatically change visualization every X seconds (0 = disabled)",
        value: defaultSettings[FlowThingSettingIDs.AUTO_CHANGE_INTERVAL],
        min: 0,
        max: 300,
        step: 10
      },
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
      
      // Process setting changes as needed
      Object.entries(settings).forEach(([key, setting]) => {
        console.log(`[FlowThing] Setting updated: ${key} = ${setting.value}`);
        // Add any server-side processing logic here if needed
      });
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
