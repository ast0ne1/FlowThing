import React, { useEffect, useRef, useState } from 'react';
import { createDeskThing } from '@deskthing/client';
import { ToClientData, GenericTransitData, AudioFormatData, AudioStreamData, AudioStreamStatus } from './types/types';

const DeskThing = createDeskThing<ToClientData, GenericTransitData>();

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connected, setConnected] = useState(false);
  const [audioFormat, setAudioFormat] = useState<AudioFormatData | null>(null);

  useEffect(() => {
    let invalid = false;
    let statusCheckInterval: NodeJS.Timeout | null = null;

    console.log('Setting up audio stream listeners...');

    // Listen for audio stream status updates
    const removeStatusListener = DeskThing.on('audio_stream_status', (data) => {
      if (invalid) return;
      console.log('✅ Received audio_stream_status event:', data);
      
      if (!data || !data.payload) {
        DeskThing.warn('No audio stream status available');
        return;
      }
      
      const payload = data.payload;
      console.log('Connection status:', payload.connected);
      
      setConnected(payload.connected);
      
      if (payload.audioFormat) {
        console.log('Audio format:', payload.audioFormat);
        setAudioFormat(payload.audioFormat);
      }
    });

    // Listen for audio format updates
    const removeFormatListener = DeskThing.on('audio_format', (data) => {
      if (invalid) return;
      console.log('✅ Received audio_format event');
      if (!data || !data.payload) return;
      setAudioFormat(data.payload);
    });

   // Listen for audio data
  const removeDataListener = DeskThing.on('audio_data', (data) => {
    if (invalid) return;
    console.log('🎵 Received audio_data event, length:', data?.payload?.length);
    
    if (!data || !data.payload) {
      console.warn('No audio data payload');
      return;
    }
    
    visualizeAudio(data.payload);
  });

    console.log('✅ Listeners set up!');

    // Function to request status
    const requestStatus = () => {
      if (invalid) return;
      console.log('📡 Requesting current status from server...');
      DeskThing.send({ 
        type: 'get',
        payload: { request: 'status' }
      });
    };

    // Request initial status
    setTimeout(() => {
      requestStatus();
    }, 100);

    // Set up periodic status checks every 10 seconds
    statusCheckInterval = setInterval(() => {
      console.log('🔄 Periodic status check...');
      requestStatus();
    }, 10000);

    return () => {
      console.log('Cleaning up audio stream listeners...');
      invalid = true;
      
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      
      removeStatusListener();
      removeFormatListener();
      removeDataListener();
    };
  }, []);

  const visualizeAudio = (audioData: AudioStreamData) => {
  const canvas = canvasRef.current;
  if (!canvas) {
    console.warn('Canvas not available');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('Canvas context not available');
    return;
  }

  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!audioData.data || audioData.data.length === 0) {
    console.warn('No audio data to visualize');
    return;
  }

  console.log(`Visualizing ${audioData.data.length} bytes of audio data`);

  // Convert data to Float32Array (32-bit float audio)
  const buffer = new ArrayBuffer(audioData.data.length);
  const view = new Uint8Array(buffer);
  audioData.data.forEach((byte, i) => (view[i] = byte));
  const float32Array = new Float32Array(buffer);

  console.log(`Float32Array has ${float32Array.length} samples`);

  // Draw waveform
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const step = Math.max(1, Math.floor(float32Array.length / canvas.width));

  for (let i = 0; i < canvas.width; i++) {
    const index = i * step;
    if (index < float32Array.length) {
      const value = float32Array[index];
      // Normalize value to canvas height
      const y = ((value + 1) / 2) * canvas.height;

      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
  }

  ctx.stroke();
};

  return (
    <div className="bg-slate-800 w-screen h-screen flex flex-col justify-center items-center p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-6">Audio Visualizer</h1>

        <div className="bg-slate-700 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-3">Status</h3>
          <p className="text-white mb-2">
            <strong>Connected:</strong> {connected ? '✅ Yes' : '❌ No'}
          </p>
          {audioFormat && (
            <p className="text-white">
              <strong>Format:</strong> {audioFormat.sampleRate}Hz, {audioFormat.channels}ch,{' '}
              {audioFormat.bitsPerSample}bit
            </p>
          )}
        </div>

        <div className="bg-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-3">Waveform</h3>
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full bg-black rounded"
          />
        </div>
      </div>
    </div>
  );
};

export default App;