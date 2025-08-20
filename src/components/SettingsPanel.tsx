import React from 'react';
import { DeskVizorSettings, AUDIO_SOURCE_OPTIONS } from '../types/visualization';

interface SettingsPanelProps {
  settings: DeskVizorSettings;
  onSettingChange: (key: keyof DeskVizorSettings, value: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingChange,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  // Default color options for quick selection
  const defaultBackgroundColors = [
    { name: "Black", value: "#000000" },
    { name: "Dark Blue", value: "#1a1a2e" },
    { name: "Dark Purple", value: "#16213e" },
    { name: "Dark Green", value: "#0f1419" },
    { name: "Dark Gray", value: "#1f1f1f" }
  ];

  const defaultPrimaryColors = [
    { name: "Blue", value: "#667eea" },
    { name: "Green", value: "#48bb78" },
    { name: "Purple", value: "#9f7aea" },
    { name: "Red", value: "#f56565" },
    { name: "Orange", value: "#ed8936" },
    { name: "Pink", value: "#ed64a6" },
    { name: "Cyan", value: "#38b2ac" },
    { name: "Yellow", value: "#ecc94b" }
  ];

  return (
    <div className={`panel-container fixed right-0 top-0 h-full w-full sm:w-96 bg-gray-900 text-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="panel-content p-3 sm:p-6 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 sticky top-0 bg-gray-900 pb-2">
          <h2 className="text-xl sm:text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 flex-shrink-0"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Content */}
        <div className="settings-list space-y-4 sm:space-y-6 pb-6">
          {/* Audio Sensitivity */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Audio Sensitivity: {settings.audioSensitivity}
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={settings.audioSensitivity}
              onChange={(e) => onSettingChange('audioSensitivity', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Background Color
            </label>
            <div className="space-y-3">
              {/* Custom Color Picker */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => onSettingChange('backgroundColor', e.target.value)}
                  className="w-10 h-8 sm:w-12 sm:h-10 bg-transparent border border-gray-600 rounded cursor-pointer"
                />
                <span className="text-xs sm:text-sm truncate">{settings.backgroundColor}</span>
              </div>
              
              {/* Default Color Options */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Quick Select:</p>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {defaultBackgroundColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => onSettingChange('backgroundColor', color.value)}
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded border-2 transition-all relative overflow-hidden ${
                        settings.backgroundColor === color.value 
                          ? 'border-white scale-110 shadow-lg ring-2 ring-white ring-opacity-50' 
                          : 'border-gray-400 hover:border-gray-200 hover:scale-105'
                      }`}
                      style={{ 
                        backgroundColor: color.value,
                        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.2)'
                      }}
                      title={color.name}
                    >
                      {/* Inner highlight for better visibility of dark colors */}
                      <div 
                        className="absolute inset-0 border border-white border-opacity-20 rounded pointer-events-none"
                      />
                      {/* Check mark for selected color */}
                      {settings.backgroundColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Primary Color
            </label>
            <div className="space-y-3">
              {/* Custom Color Picker */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => onSettingChange('primaryColor', e.target.value)}
                  className="w-10 h-8 sm:w-12 sm:h-10 bg-transparent border border-gray-600 rounded cursor-pointer"
                />
                <span className="text-xs sm:text-sm truncate">{settings.primaryColor}</span>
              </div>
              
              {/* Default Color Options */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Quick Select:</p>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {defaultPrimaryColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => onSettingChange('primaryColor', color.value)}
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded border-2 transition-all relative overflow-hidden ${
                        settings.primaryColor === color.value 
                          ? 'border-white scale-110 shadow-lg ring-2 ring-white ring-opacity-50' 
                          : 'border-gray-400 hover:border-gray-200 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {/* Check mark for selected color */}
                      {settings.primaryColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Animation Speed */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Animation Speed: {settings.animationSpeed}
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={settings.animationSpeed}
              onChange={(e) => onSettingChange('animationSpeed', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Audio Source */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Audio Source
            </label>
            <select
              value={settings?.audioSource || 'mock'}
              onChange={(e) => {
                try {
                  const value = e.target.value as 'deskthing' | 'system' | 'microphone' | 'mock';
                  onSettingChange('audioSource', value);
                } catch (error) {
                  console.error('[DeskVizor] Error changing audio source:', error);
                }
              }}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {AUDIO_SOURCE_OPTIONS?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              )) || []}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {AUDIO_SOURCE_OPTIONS?.find(opt => opt.value === settings?.audioSource)?.description || 'Select audio source'}
            </p>
          </div>

          {/* Auto Change Interval */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Auto Change Interval: {settings.autoChangeInterval}s
            </label>
            <input
              type="range"
              min="0"
              max="300"
              step="10"
              value={settings.autoChangeInterval}
              onChange={(e) => onSettingChange('autoChangeInterval', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Disabled</span>
              <span>5 min</span>
            </div>
          </div>

          {/* Show Visualization Name */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Show Visualization Name
            </label>
            <input
              type="checkbox"
              checked={settings.showVisualizationName}
              onChange={(e) => onSettingChange('showVisualizationName', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>

          {/* Performance Mode */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Performance Mode
            </label>
            <select
              value={settings?.performanceMode || 'balanced'}
              onChange={(e) => {
                try {
                  const value = e.target.value as 'quality' | 'balanced' | 'performance';
                  console.log('[DeskVizor] Performance mode changing to:', value);
                  onSettingChange('performanceMode', value);
                } catch (error) {
                  console.error('[DeskVizor] Error changing performance mode:', error);
                  // Fallback to balanced mode if there's an error
                  onSettingChange('performanceMode', 'balanced');
                }
              }}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="quality">🎨 Quality - Best visual quality, higher resource usage</option>
              <option value="balanced">⚖️ Balanced - Good balance of quality and performance</option>
              <option value="performance">🚀 Performance - Optimized for smooth performance</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Choose between quality and performance for heavy visualizations like Plasma, Milkdrop, and Kaleidoscope
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
