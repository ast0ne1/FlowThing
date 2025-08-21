import React, { useState, useEffect, useCallback } from 'react';
import VisualizationCanvas from './components/VisualizationCanvas';
import SettingsPanel from './components/SettingsPanel';
import VisualizationSelector from './components/VisualizationSelector';
import { FlowThingSettings, defaultSettings, VISUALIZATION_OPTIONS } from './types/visualization';

// DeskThing client-side API (if available)
declare global {
  interface Window {
    DeskThing?: {
      on: (event: string, callback: (data: any) => void) => void;
      sendData: (data: any) => void;
      getSetting: (key: string) => any;
      setSetting: (key: string, value: any) => void;
    };
  }
}

const App: React.FC = () => {
  const [settings, setSettings] = useState<FlowThingSettings>(defaultSettings);
  const [isVisualizationPanelOpen, setIsVisualizationPanelOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [audioSource, setAudioSource] = useState<'system' | 'microphone' | 'mock'>(() => {
    try {
      return (settings?.audioSource as 'system' | 'microphone' | 'mock') || 'system';
    } catch (error) {
      console.warn('[FlowThing] Error initializing audioSource, using default:', error);
      return 'system';
    }
  });
  const [showAudioIndicator, setShowAudioIndicator] = useState(false);
  const [lastAudioSource, setLastAudioSource] = useState<string | null>(null);

  // Load settings from localStorage on startup
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('flowthing-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        // Handle migration from old colorScheme to new backgroundColor/primaryColor
        if (parsed.colorScheme && !parsed.backgroundColor && !parsed.primaryColor) {
          parsed.backgroundColor = "#000000"; // Default black background
          parsed.primaryColor = parsed.colorScheme; // Use old colorScheme as primary color
          delete parsed.colorScheme; // Remove old setting
          console.log('[FlowThing] Migrated colorScheme to backgroundColor/primaryColor');
        }
        
        setSettings(prev => ({ ...prev, ...parsed }));
        if (parsed.audioSource && typeof parsed.audioSource === 'string') {
          setAudioSource(parsed.audioSource as 'system' | 'microphone' | 'mock');
        }
        console.log('[FlowThing] Loaded settings from localStorage:', parsed);
      }
    } catch (error) {
      console.warn('[FlowThing] Failed to load settings from localStorage:', error);
    }

    // Listen for settings updates from DeskThing if available
    if (window.DeskThing) {
      window.DeskThing.on('settings', (newSettings: any) => {
        try {
          console.log('[FlowThing] Received settings from DeskThing:', newSettings);
          if (newSettings && typeof newSettings === 'object') {
            setSettings(prev => ({ ...prev, ...newSettings }));
            if (newSettings.audioSource && typeof newSettings.audioSource === 'string') {
              setAudioSource(newSettings.audioSource as 'system' | 'microphone' | 'mock');
            }
            // Also save to localStorage as backup
            localStorage.setItem('flowthing-settings', JSON.stringify({ ...settings, ...newSettings }));
          }
        } catch (error) {
          console.error('[FlowThing] Error processing DeskThing settings:', error);
        }
      });
    }
  }, []);

  // Handle audio source changes and show indicator briefly
  useEffect(() => {
    // Only show indicator if this is a real change (not initial load)
    if (lastAudioSource !== null && audioSource !== lastAudioSource) {
      setShowAudioIndicator(true);
      
      // Hide indicator after delay (shorter for Demo Mode)
      const delay = audioSource === 'mock' ? 2000 : 4000; // 2s for Demo, 4s for others
      const timer = setTimeout(() => {
        setShowAudioIndicator(false);
      }, delay);
      
      return () => clearTimeout(timer);
    }
    
    // Update lastAudioSource for next comparison
    setLastAudioSource(audioSource);
  }, [audioSource, lastAudioSource]);

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
      
      // Update audio source if it changed
      if (key === 'audioSource' && typeof value === 'string') {
        setAudioSource(value as 'system' | 'microphone' | 'mock');
      }
      
      // Save to localStorage immediately
      try {
        localStorage.setItem('flowthing-settings', JSON.stringify(newSettings));
      } catch (error) {
        console.warn('[FlowThing] Failed to save settings to localStorage:', error);
      }
      
      // Send to DeskThing if available
      if (window.DeskThing && window.DeskThing.setSetting) {
        try {
          window.DeskThing.setSetting(key, value);
        } catch (error) {
          console.warn('[FlowThing] Failed to send setting to DeskThing:', error);
        }
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

  // Close panels when clicking outside (settings are already saved by handleSettingChange)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.panel') && !target.closest('.panel-toggle')) {
        // Settings are automatically saved when changed, so safe to close panels
        setIsVisualizationPanelOpen(false);
        setIsSettingsPanelOpen(false);
      }
    };

    // Also close panels on Escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVisualizationPanelOpen(false);
        setIsSettingsPanelOpen(false);
      }
    };

    // Mobile-friendly touch gestures for closing panels
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const target = event.target as HTMLElement;
      
      // Only handle touches on panels, not on toggle areas
      if (target.closest('.panel') && !target.closest('.panel-toggle')) {
        const panel = target.closest('.panel');
        if (panel) {
          const rect = panel.getBoundingClientRect();
          const startX = touch.clientX;
          const startY = touch.clientY;
          
          const handleTouchMove = (moveEvent: TouchEvent) => {
            const moveTouch = moveEvent.touches[0];
            const deltaX = moveTouch.clientX - startX;
            const deltaY = moveTouch.clientY - startY;
            
            // If swiping left on left panel or right on right panel, close it
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
              if ((panel.classList.contains('left-panel') && deltaX < 0) ||
                  (panel.classList.contains('right-panel') && deltaX > 0)) {
                setIsVisualizationPanelOpen(false);
                setIsSettingsPanelOpen(false);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
              }
            }
          };
          
          const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
          };
          
          document.addEventListener('touchmove', handleTouchMove);
          document.addEventListener('touchend', handleTouchEnd);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchstart', handleTouchStart);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', handleTouchStart);
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

  // Audio data management with audio source integration
  useEffect(() => {
    let audioInterval: NodeJS.Timeout;
    
         const initializeAudio = async () => {
       try {
         const currentAudioSource = settings?.audioSource || 'mock';
         if (currentAudioSource === 'system') {
          console.log('[FlowThing] Attempting to capture system audio...');
          
          try {
            const systemAudioStream = await captureSystemAudio();
            if (systemAudioStream) {
              startSystemAudio(systemAudioStream);
            } else {
              console.log('[FlowThing] System audio capture failed, falling back to mock data');
              startMockAudio();
            }
          } catch (error) {
            console.warn('[FlowThing] System audio failed, using mock data:', error);
            startMockAudio();
          }
                 } else if (currentAudioSource === 'microphone') {
          console.log('[FlowThing] Using microphone audio...');
          
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startMicrophoneAudio(micStream);
          } catch (error) {
            console.warn('[FlowThing] Microphone audio failed, using mock data:', error);
            startMockAudio();
          }
        } else {
          console.log('[FlowThing] Using mock audio data...');
          startMockAudio();
        }
      } catch (error) {
        console.error('[FlowThing] Audio initialization failed:', error);
        startMockAudio();
      }
    };
    
    // Try to capture system audio (what's playing through speakers/headphones)
    const captureSystemAudio = async (): Promise<MediaStream | null> => {
      try {
        console.log('[FlowThing] Attempting to capture system audio...');
        
        // Method 1: Try to get system audio via getDisplayMedia (Chrome/Edge)
        if (navigator.mediaDevices.getDisplayMedia) {
          try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
              video: false, 
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
              }
            });
            
            // Check if we actually got audio tracks
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
              console.log('[FlowThing] System audio captured via getDisplayMedia');
              return stream;
            } else {
              console.log('[FlowThing] getDisplayMedia returned no audio tracks');
              stream.getTracks().forEach(track => track.stop());
            }
          } catch (error) {
            console.log('[FlowThing] getDisplayMedia failed:', error);
          }
        }
        
        // Method 2: Try to get system audio via getUserMedia with specific constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              // Try to get system audio if available
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            } as any
          });
          
          console.log('[FlowThing] System audio captured via getUserMedia');
          return stream;
        } catch (error) {
          console.log('[FlowThing] getUserMedia system audio failed:', error);
        }
        
        // Method 3: Try to get system audio via desktop capture (if available)
        if ((navigator as any).getUserMedia) {
          try {
            const stream = await (navigator as any).getUserMedia({
              audio: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: 'desktop'
                }
              }
            });
            
            console.log('[FlowThing] Legacy getUserMedia system audio failed');
            return stream;
          } catch (error) {
            console.log('[FlowThing] Legacy getUserMedia system audio failed:', error);
          }
        }
        
        console.log('[FlowThing] No system audio capture method available');
        return null;
        
      } catch (error) {
        console.error('[FlowThing] System audio capture failed:', error);
        return null;
      }
    };
    
    // Start system audio processing
    const startSystemAudio = (stream: MediaStream) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateAudioData = () => {
          analyser.getByteFrequencyData(dataArray);
          const normalizedData = Array.from(dataArray).map(value => value / 255);
          setAudioData(normalizedData);
        };
        
        audioInterval = setInterval(updateAudioData, 100);
        setAudioSource('system');
        console.log('[FlowThing] System audio processing started');
        
      } catch (error) {
        console.error('[FlowThing] System audio processing failed:', error);
        startMockAudio();
      }
    };
    
    // Start microphone audio processing
    const startMicrophoneAudio = (stream: MediaStream) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateAudioData = () => {
          analyser.getByteFrequencyData(dataArray);
          const normalizedData = Array.from(dataArray).map(value => value / 255);
          setAudioData(normalizedData);
        };
        
        audioInterval = setInterval(updateAudioData, 100);
        setAudioSource('microphone');
        console.log('[FlowThing] Microphone audio processing started');
        
      } catch (error) {
        console.error('[FlowThing] Microphone audio processing failed:', error);
        startMockAudio();
      }
    };
    
    const startMockAudio = () => {
      const generateMockData = () => {
        const data = Array.from({ length: 128 }, () => Math.random() * 0.5 + 0.1);
        setAudioData(data);
      };
      
      setAudioSource('mock');
      audioInterval = setInterval(generateMockData, 100);
    };
    
    initializeAudio();
    
    return () => {
      if (audioInterval) {
        clearInterval(audioInterval);
      }
      
             // Clean up DeskThing audio connection
       if (settings?.audioSource === 'system' && window.DeskThing) {
        window.DeskThing.sendData({
          app: 'flowthing',
          type: 'audio_request',
          request: 'stop_stream'
        });
      }
    };
     }, [settings?.audioSource]);

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
            {audioSource === 'system' && '🔊 System Audio'}
            {audioSource === 'microphone' && '🎤 Microphone'}
            {audioSource === 'mock' && '🎲 Demo Mode'}
          </div>
        )}
      </div>

      {/* Panel Toggle Areas */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Left Panel Toggle - Clickable edge without icon */}
        <div 
          className="absolute left-0 top-0 w-8 h-full panel-toggle cursor-pointer"
          onClick={toggleVisualizationPanel}
        >
        </div>

        {/* Right Panel Toggle - Clickable edge without icon */}
        <div 
          className="absolute right-0 top-0 w-8 h-full panel-toggle cursor-pointer"
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
