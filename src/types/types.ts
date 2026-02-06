export type GenericTransitData = {
  type: 'get' | 'connect' | 'disconnect' | 'refresh' | 'start' | 'stop';
  payload?: any;
};

export type ToClientData = 
  | {
      type: 'audio_stream_status';
      payload: AudioStreamStatus;
    }
  | {
      type: 'audio_format';
      payload: AudioFormatData;
    }
  | {
      type: 'audio_data';
      payload: AudioStreamData;
    };

export interface AudioStreamData {
  data: number[]; // Audio buffer as array
  length: number;
  timestamp: number;
}

export interface AudioFormatData {
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
  encoding: string;
  downsampleFactor?: number;
  originalSampleRate?: number;
}

export interface AudioStreamStatus {
  connected: boolean;
  audioFormat?: AudioFormatData;
  serverUrl: string;
}