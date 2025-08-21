export interface FlowThingSettings {
  visualizationType: string;
  audioSensitivity: number;
  backgroundColor: string;
  primaryColor: string;
  animationSpeed: number;
  audioSource: 'deskthing' | 'system' | 'microphone' | 'mock';
  autoChangeInterval: number;
  showVisualizationName: boolean;
  performanceMode: 'quality' | 'balanced' | 'performance';
}

export interface VisualizationProps {
  settings: FlowThingSettings;
  audioData?: number[];
  isActive: boolean;
}

export type VisualizationType = 'wave' | 'confetti' | 'bars' | 'burning' | 'plasma' | 'meter' | 'triangular' | 'milkdrop' | 'kaleidosync';

export interface VisualizationOption {
  label: string;
  value: VisualizationType;
  description: string;
}

export const VISUALIZATION_OPTIONS: VisualizationOption[] = [
  {
    label: "Wave",
    value: "wave",
    description: "Smooth wave visualization that responds to audio"
  },
  {
    label: "Confetti",
    value: "confetti",
    description: "Colorful confetti particles"
  },
  {
    label: "Bars",
    value: "bars",
    description: "Dynamic bar chart visualization"
  },
  {
    label: "Burning",
    value: "burning",
    description: "Fire-like burning effect visualization"
  },
  {
    label: "Plasma",
    value: "plasma",
    description: "Smooth plasma field visualization"
  },
  {
    label: "Meter",
    value: "meter",
    description: "Audio level meter visualization"
  },
  {
    label: "Triangular",
    value: "triangular",
    description: "Geometric triangular patterns"
  },
  {
    label: "Milkdrop",
    value: "milkdrop",
    description: "Classic milkdrop-style visualization"
  },
  {
    label: "Kaleidosync",
    value: "kaleidosync",
    description: "Kaleidoscope with audio synchronization"
  }
];

export interface AudioSourceOption {
  label: string;
  value: 'system' | 'microphone' | 'mock';
  description: string;
}

export const AUDIO_SOURCE_OPTIONS: AudioSourceOption[] = [
  {
    label: "🔊 System Audio",
    value: "system",
    description: "Capture all system audio including DeskThing music and other applications"
  },
  {
    label: "🎤 Microphone",
    value: "microphone",
    description: "Use microphone input for audio visualization"
  },
  {
    label: "🎲 Demo Mode",
    value: "mock",
    description: "Use mock/random audio data for testing"
  }
];

// Default settings for the client-side app
export const defaultSettings: FlowThingSettings = {
  visualizationType: "wave",
  audioSensitivity: 50,
  backgroundColor: "#000000",
  primaryColor: "#667eea",
  animationSpeed: 50,
  audioSource: "system",
  autoChangeInterval: 30,
  showVisualizationName: true,
  performanceMode: "balanced"
};
