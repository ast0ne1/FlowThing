import React from 'react';
import { VisualizationType, VISUALIZATION_OPTIONS } from '../types/visualization';

interface VisualizationSelectorProps {
  currentType: VisualizationType;
  onTypeChange: (type: VisualizationType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const VisualizationSelector: React.FC<VisualizationSelectorProps> = ({
  currentType,
  onTypeChange,
  isOpen,
  onClose
}) => {
  return (
    <div className={`panel-container fixed left-0 top-0 h-full w-full sm:w-96 bg-gray-900 text-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="panel-content p-3 sm:p-6 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 sticky top-0 bg-gray-900 pb-2">
          <h2 className="text-xl sm:text-2xl font-bold">Visualizations</h2>
        </div>

        {/* Visualization Options */}
        <div className="visualization-list space-y-3 sm:space-y-4 pb-6">
          {VISUALIZATION_OPTIONS.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onTypeChange(option.value);
                onClose();
              }}
              className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                currentType === option.value
                  ? 'bg-blue-600 border-2 border-blue-400'
                  : 'bg-gray-800 hover:bg-gray-700 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Preview Icon */}
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 sm:w-6 sm:h-6">
                    {getVisualizationIcon(option.value)}
                  </div>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-lg truncate">{option.label}</h3>
                  <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">{option.description}</p>
                </div>
                
                {/* Current Indicator */}
                {currentType === option.value && (
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full flex-shrink-0"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to get visualization preview icons
const getVisualizationIcon = (type: VisualizationType) => {
  switch (type) {
    case 'wave':
      return (
        <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2 12h2l2-8 2 16 2-8h2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'confetti':
      return (
        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="1" fill="currentColor"/>
          <circle cx="18" cy="8" r="1" fill="currentColor"/>
          <circle cx="12" cy="18" r="1" fill="currentColor"/>
          <circle cx="20" cy="16" r="1" fill="currentColor"/>
        </svg>
      );
    case 'bars':
      return (
        <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="8" width="3" height="8" fill="currentColor"/>
          <rect x="7" y="4" width="3" height="12" fill="currentColor"/>
          <rect x="12" y="2" width="3" height="14" fill="currentColor"/>
          <rect x="17" y="6" width="3" height="10" fill="currentColor"/>
        </svg>
      );
    case 'burning':
      return (
        <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
        </svg>
      );
    case 'plasma':
      return (
        <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.3"/>
          <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.6"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      );
    case 'meter':
      return (
        <svg className="w-6 h-6 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
          <rect x="4" y="6" width="4" height="12" fill="currentColor"/>
          <rect x="10" y="6" width="4" height="12" fill="currentColor"/>
          <rect x="16" y="6" width="4" height="12" fill="currentColor"/>
        </svg>
      );
    case 'triangular':
      return (
        <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 22h20L12 2z" fill="currentColor"/>
        </svg>
      );
    case 'milkdrop':
      return (
        <svg className="w-6 h-6 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="currentColor"/>
          <path d="M12 6c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z" fill="currentColor"/>
        </svg>
      );
    case 'kaleidosync':
      return (
        <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L13.09 8.26L20 9.27L14.5 14.14L15.68 21.02L12 17.27L8.32 21.02L9.5 14.14L4 9.27L10.91 8.26L12 2z" fill="currentColor"/>
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      );
  }
};

export default VisualizationSelector;
