# FlowThing 🎵✨
A music visualizer app for DeskThing with multiple visualization types, customizable settings, and real-time audio response.

Vibe coded with Cursor based on the DeskThing app template.

## Features

### 🎨 Visualization Types
- **Wave** - Smooth wave visualization that responds to audio
- **Bars** - Dynamic bar chart visualization
- **Confetti** - Colorful confetti particles
- **Burning** - Fire-like burning effect visualization
- **Plasma** - Smooth plasma field visualization
- **Meter** - Audio level meter visualization
- **Triangular** - Geometric triangular patterns
- **Milkdrop** - Classic milkdrop-style visualization
- **Kaleidosync** - Kaleidoscope with audio synchronization

### ⚙️ Customizable Settings
- Audio sensitivity control
- Background and primary color selection
- Animation speed adjustment
- Multiple audio source options (DeskThing, System, Microphone, Mock)
- Auto-change visualization timer
- Visualization name display toggle
- Performance mode selection (Quality, Balanced, Performance)

### 🚀 Performance Optimizations
- **Adaptive rendering** based on performance mode
- **Intelligent frame rate limiting** for heavy visualizations
- **Optimized algorithms** for Plasma, Milkdrop, and Kaleidoscope
- **Responsive design** that scales to device capabilities

### 🎛️ User Interface
- **Left Panel** - Quick visualization type selection
- **Right Panel** - Comprehensive settings control
- **Toggle Areas** - Easy panel access from main screen
- **Responsive Design** - Works on all screen sizes
- **Touch-friendly** - Optimized for mobile and touch devices

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- DeskThing application

### Installation

1. **Clone or download** the FlowThing app
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run setup script:**
   ```bash
   npm run setup
   ```

### Development

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Open in browser** at `http://localhost:5173`

### Building

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Install in DeskThing:**
   - Copy the generated package to your DeskThing apps folder
   - Restart DeskThing
   - FlowThing will appear in your app list

## Usage

### Main Interface
- **Full-screen visualization** with real-time audio response
- **Left edge** - Click to open visualization selector
- **Right edge** - Click to open settings panel
- **Top center** - Current visualization name (if enabled)
- **Top right** - Audio source indicator

### Panel Controls
- **Visualization Selector (Left):** Choose from 9 different visualization types
- **Settings Panel (Right):** Fine-tune all visualization parameters

### Audio Integration
- **DeskThing Audio:** Uses DeskThing's audio system when available
- **System Audio:** Captures audio playing through speakers/headphones
- **Microphone:** Uses microphone input for audio visualization
- **Mock Mode:** Demo mode with random audio data for testing

### Performance Modes
- **🎨 Quality:** Best visual quality, higher resource usage
- **⚖️ Balanced:** Good balance of quality and performance (default)
- **🚀 Performance:** Optimized for smooth performance on lower-end devices

## Technical Details

### Architecture
- **React-based** frontend with TypeScript
- **Canvas-based** rendering for smooth animations
- **Modular component** system for easy maintenance
- **Responsive design** with Tailwind CSS

### Performance Features
- **Adaptive frame rates** (10-60 FPS based on visualization type and performance mode)
- **Optimized rendering** with efficient canvas operations
- **Memory management** for particle systems
- **Smooth transitions** between visualization types
- **Performance-based quality scaling** for heavy visualizations

### Compatibility
- **Windows** - Full support
- **Modern browsers** - Chrome, Edge, Firefox
- **Touch devices** - Mobile and tablet optimized
- **DeskThing 10+** - Server and client compatibility

## Troubleshooting

### Performance Issues
- Use **Performance Mode** for smoother operation on lower-end devices
- Reduce **Animation Speed** for better performance
- Close other resource-intensive applications

### Audio Issues
- Ensure microphone permissions are granted
- Check system audio settings
- Try different audio source options

### Build Issues
- Run `npm run setup` to ensure all dependencies are installed
- Clear `node_modules` and run `npm install` if needed
- Ensure Node.js version is 16 or higher

## Contributing

Feel free to contribute to FlowThing by:
- Reporting bugs
- Suggesting new features
- Submitting pull requests
- Improving documentation

## License

This project is part of the DeskThing ecosystem and follows the same licensing terms.
