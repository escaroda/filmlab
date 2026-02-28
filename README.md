# Film Emulator

A high-performance, WebGL-based film emulation tool built with React and Tailwind CSS. It allows you to apply realistic film grain, halation, and color grading profiles to your images directly in the browser.

This project was vibe coded in February 2026 using Gemini 3.1 Pro Preview.

## Features

- **Real-time WebGL Processing**: Hardware-accelerated image processing for instant feedback.
- **Film Stocks**: 10 authentic film stock profiles including Kodak Portra 400, Fujifilm Velvia 50, Cinestill 800T, and Ilford HP5 Plus.
- **Advanced Light Controls**: Exposure, Contrast, Highlights, and Shadows adjustments.
- **Color Grading**: Temperature, Tint, Vibrance, and Saturation with Target Hue and Color Range selection.
- **Realistic Effects**: 
  - **Halation**: Simulates the red glow around bright highlights typical of analog film.
  - **Molecular Grain**: Procedurally generated film grain mimicking silver halide crystals.
  - **Lens Vignette**: Adds a subtle darkening to the edges of the image.
- **Zoom & Pan**: Inspect grain at a pixel level with mouse wheel zoom anchored to the cursor and drag-to-pan.
- **Export**: Save your processed images in high-quality PNG, AVIF, or JPEG formats.

## Tech Stack

- React
- TypeScript
- WebGL
- Tailwind CSS
- Lucide React (Icons)

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser and navigate to the provided local URL.

## Usage

1. Upload an image using the "Upload Image" button.
2. Select a film stock from the left sidebar.
3. Adjust the light, color, effects, and grain settings to your liking.
4. Use the mouse wheel to zoom in and drag to pan around the image.
5. Hold the "Hold to Compare" button to see the original image.
6. Select your desired export format and click "Export" to save the result.

## License

MIT
