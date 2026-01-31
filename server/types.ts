export type GenericTransitData = {
  type: 'get' | 'connect' | 'disconnect' | 'refresh' | 'start' | 'stop';
  payload?: any;
};

export type ToClientData = {
  type: 'audio_stream_status' | 'audio_format' | 'audio_data';
  payload: any;
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