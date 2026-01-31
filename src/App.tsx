import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createDeskThing } from '@deskthing/client';
import VisualizationCanvas from './components/VisualizationCanvas';
import SettingsPanel from './components/SettingsPanel';
import VisualizationSelector from './components/VisualizationSelector';
import { FlowThingSettings, defaultSettings, VISUALIZATION_OPTIONS } from './types/visualization';
import { ToClientData, GenericTransitData, AudioFormatData, AudioStreamData } from './types/types';
import { AudioProcessor } from './AudioProcessor';

const DeskThing = createDeskThing<ToClientData, GenericTransitData>();

const App: React.FC = () => {
  const [settings, setSettings] = useState<FlowThingSettings>(defaultSettings);
  const [isVisualizationPanelOpen, setIsVisualizationPanelOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [connected, setConnected] = useState(false);
  const [audioFormat, setAudioFormat] = useState<AudioFormatData | null>(null);
  const [showAudioIndicator, setShowAudioIndicator] = useState(false);
  const [lastAudioSource, setLastAudioSource] = useState<string | null>(null);

  // Create a single instance of AudioProcessor
  const audioProcessor = useMemo(() => new AudioProcessor(), []);

  // Load settings from localStorage on startup
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('flowthing-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        // Handle migration from old colorScheme to new backgroundColor/primaryColor
        if (parsed.colorScheme && !parsed.backgroundColor && !parsed.primaryColor) {
          parsed.backgroundColor = "#000000";
          parsed.primaryColor = parsed.colorScheme;
          delete parsed.colorScheme;
          console.log('[FlowThing] Migrated colorScheme to backgroundColor/primaryColor');
        }
        
        setSettings(prev => ({ ...prev, ...parsed }));
        console.log('[FlowThing] Loaded settings from localStorage:', parsed);
      }
    } catch (error) {
      console.warn('[FlowThing] Failed to load settings from localStorage:', error);
    }
  }, []);

  // Process audio data from WebSocket
  const processAudioData = useCallback((audioStreamData: AudioStreamData) => {
    // Only process if audio source is set to 'system'
    if (settings?.audioSource !== 'system') {
      console.log('[FlowThing] Ignoring WebSocket audio - current source is:', settings?.audioSource);
      return;
    }
    
    const analysisMethod = settings?.audioAnalysisMethod || 'fft';
    const bins = audioProcessor.processAudioData(audioStreamData, analysisMethod);
    setAudioData(bins);
  }, [settings?.audioAnalysisMethod, settings?.audioSource, audioProcessor]);

  // WebSocket Audio Stream Connection
  useEffect(() => {
    let invalid = false;
    let statusCheckInterval: NodeJS.Timeout | null = null;

    console.log('[FlowThing] Setting up audio stream listeners...');

    // Listen for audio stream status updates
    const removeStatusListener = DeskThing.on('audio_stream_status', (data) => {
      if (invalid) return;
      console.log('✅ Received audio_stream_status event:', data);
      
      if (!data || !data.payload) {
        console.warn('[FlowThing] No audio stream status available');
        return;
      }
      
      const payload = data.payload;
      console.log('[FlowThing] Connection status:', payload.connected);
      
      setConnected(payload.connected);
      
      if (payload.audioFormat) {
        console.log('[FlowThing] Audio format:', payload.audioFormat);
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
        console.warn('[FlowThing] No audio data payload');
        return;
      }
      
      processAudioData(data.payload);
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
      console.log('[FlowThing] Cleaning up audio stream listeners...');
      invalid = true;
      
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      
      removeStatusListener();
      removeFormatListener();
      removeDataListener();
    };
  }, [processAudioData]);

  // Show audio indicator when connection status or audio source changes
  useEffect(() => {
    const currentSource = settings?.audioSource || 'mock';
    
    if (lastAudioSource !== null && currentSource !== lastAudioSource) {
      setShowAudioIndicator(true);
      
      const timer = setTimeout(() => {
        setShowAudioIndicator(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
    
    setLastAudioSource(currentSource);
  }, [settings?.audioSource, lastAudioSource]);

  // Mock audio generation for testing
  useEffect(() => {
    if (settings?.audioSource !== 'mock') {
      return;
    }

    console.log('[FlowThing] Starting mock audio generation');
    
    const generateMockAudioData = () => {
      const bins: number[] = [];
      const time = Date.now() / 1000;
      
      for (let i = 0; i < 128; i++) {
        // Create varied frequencies with different patterns
        const bass = Math.sin(time * 2 + i * 0.1) * 0.3;
        const mid = Math.sin(time * 4 + i * 0.2) * 0.2;
        const treble = Math.sin(time * 8 + i * 0.3) * 0.15;
        
        const value = Math.abs(bass + mid + treble);
        bins.push(Math.min(1, value));
      }
      
      setAudioData(bins);
    };

    // Generate mock data at ~60 FPS
    const interval = setInterval(generateMockAudioData, 1000 / 60);

    return () => {
      console.log('[FlowThing] Stopping mock audio generation');
      clearInterval(interval);
    };
  }, [settings?.audioSource]);

  // Handle setting changes with persistence
  const handleSettingChange = useCallback((key: keyof FlowThingSettings, value: any) => {
    try {
      console.log(`[FlowThing] Setting changed: ${key} = ${value}`);
      
      if (!settings || typeof settings !== 'object') {
        console.warn('[FlowThing] Settings object is invalid, cannot update');
        return;
      }
      
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      // Save to localStorage immediately
      try {
        localStorage.setItem('flowthing-settings', JSON.stringify(newSettings));
      } catch (error) {
        console.warn('[FlowThing] Failed to save settings to localStorage:', error);
      }
    } catch (error) {
      console.error('[FlowThing] Error in handleSettingChange:', error);
    }
  }, [settings]);

  // Toggle panels
  const toggleVisualizationPanel = useCallback(() => {
    setIsVisualizationPanelOpen(prev => !prev);
    if (isSettingsPanelOpen) setIsSettingsPanelOpen(false);
  }, [isSettingsPanelOpen]);

  const toggleSettingsPanel = useCallback(() => {
    setIsSettingsPanelOpen(prev => !prev);
    if (isVisualizationPanelOpen) setIsVisualizationPanelOpen(false);
  }, [isVisualizationPanelOpen]);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.panel') && !target.closest('.panel-toggle')) {
        setIsVisualizationPanelOpen(false);
        setIsSettingsPanelOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVisualizationPanelOpen(false);
        setIsSettingsPanelOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-change visualization timer
  useEffect(() => {
    if (!settings?.autoChangeInterval || settings.autoChangeInterval === 0) return;

    const interval = setInterval(() => {
      const currentIndex = VISUALIZATION_OPTIONS.findIndex(opt => opt.value === settings?.visualizationType);
      const nextIndex = (currentIndex + 1) % VISUALIZATION_OPTIONS.length;
      handleSettingChange('visualizationType', VISUALIZATION_OPTIONS[nextIndex].value);
    }, (settings?.autoChangeInterval || 30) * 1000);

    return () => clearInterval(interval);
  }, [settings?.autoChangeInterval, settings?.visualizationType, handleSettingChange]);

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Main Visualization Canvas */}
      <div className="w-full h-full relative">
        <VisualizationCanvas
          settings={settings || defaultSettings}
          audioData={audioData}
          isActive={true}
        />
        
        {/* Current Visualization Indicator */}
        {settings?.showVisualizationName && (
          <div className="absolute top-2 sm:top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg select-none pointer-events-none text-xs sm:text-sm">
            {VISUALIZATION_OPTIONS.find(opt => opt.value === settings?.visualizationType)?.label}
          </div>
        )}
        
        {/* Audio Source Indicator */}
        {showAudioIndicator && (
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-black bg-opacity-50 text-white px-2 sm:px-3 py-1 rounded-lg text-xs select-none pointer-events-none transition-opacity duration-500">
            {settings?.audioSource === 'system' && connected ? '🔊 System Audio' : 
             settings?.audioSource === 'mock' ? '🎵 Mock Audio' :
             settings?.audioSource === 'microphone' ? '🎤 Microphone' :
             '❌ No Audio'}
          </div>
        )}

        {/* Connection Status Indicator (always visible) */}
        <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-black bg-opacity-50 text-white px-2 sm:px-3 py-1 rounded-lg text-xs select-none pointer-events-none">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
            {audioFormat && connected && (
              <span className="text-gray-400">
                | {audioFormat.sampleRate}Hz, {audioFormat.channels}ch
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Panel Toggle Areas */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Left Panel Toggle - Clickable edge without icon */}
        <div 
          className="absolute left-0 top-0 w-8 h-full panel-toggle cursor-pointer pointer-events-auto"
          onClick={toggleVisualizationPanel}
        >
        </div>

        {/* Right Panel Toggle - Clickable edge without icon */}
        <div 
          className="absolute right-0 top-0 w-8 h-full panel-toggle cursor-pointer pointer-events-auto"
          onClick={toggleSettingsPanel}
        >
        </div>
      </div>

      {/* Left Panel - Visualization Selector */}
      <div className={`${isVisualizationPanelOpen ? 'panel' : ''} left-panel`}>
        <VisualizationSelector
          currentType={(settings?.visualizationType || 'wave') as any}
          onTypeChange={(type) => handleSettingChange('visualizationType', type)}
          isOpen={isVisualizationPanelOpen}
          onClose={() => setIsVisualizationPanelOpen(false)}
        />
      </div>

      {/* Right Panel - Settings */}
      <div className={`${isSettingsPanelOpen ? 'panel' : ''} right-panel`}>
        <SettingsPanel
          settings={settings || defaultSettings}
          onSettingChange={handleSettingChange}
          isOpen={isSettingsPanelOpen}
          onClose={() => setIsSettingsPanelOpen(false)}
        />
      </div>
    </div>
  );
};

export default App;