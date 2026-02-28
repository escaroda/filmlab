/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, SlidersHorizontal, Image as ImageIcon, Camera, Eye, Plus, Minus, Keyboard } from 'lucide-react';
import { WebGLCanvas } from './components/WebGLCanvas';

const FILMS = [
  { id: 0, name: 'Portra 400', type: 'Color Negative', color: 'bg-yellow-500' },
  { id: 1, name: 'Superia 400', type: 'Color Negative', color: 'bg-green-500' },
  { id: 6, name: 'Gold 200', type: 'Color Negative', color: 'bg-amber-400' },
  { id: 7, name: 'Vista 200', type: 'Color Negative', color: 'bg-red-500' },
  { id: 9, name: 'Ektar 100', type: 'Color Negative', color: 'bg-orange-500' },
  { id: 4, name: 'Cinestill 800T', type: 'Motion Picture', color: 'bg-blue-500' },
  { id: 5, name: 'Velvia 50', type: 'Color Reversal', color: 'bg-emerald-500' },
  { id: 2, name: 'HP5 Plus', type: 'Black & White', color: 'bg-gray-400' },
  { id: 3, name: 'Tri-X 400', type: 'Black & White', color: 'bg-gray-300' },
  { id: 8, name: 'Delta 3200', type: 'Black & White', color: 'bg-gray-500' },
];

export default function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [filmType, setFilmType] = useState(0);
  
  // Light
  const [exposure, setExposure] = useState(0);
  const [contrast, setContrast] = useState(1.1);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  
  // Color
  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [vibrance, setVibrance] = useState(0);
  const [targetHue, setTargetHue] = useState(0);
  const [colorRange, setColorRange] = useState(1.0);
  
  // Grain & Effects
  const [grainAmount, setGrainAmount] = useState(0.15);
  const [grainSize, setGrainSize] = useState(1.5);
  const [halation, setHalation] = useState(0.2);
  const [vignette, setVignette] = useState(0.3);
  
  const [showOriginal, setShowOriginal] = useState(false);
  const [exportFormat, setExportFormat] = useState('image/jpeg');
  
  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const zoomIntervalRef = useRef<number | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftPressed(true); };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftPressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startZoom = (delta: number) => {
    if (zoomIntervalRef.current) return;
    const tick = () => {
      setZoom(z => Math.max(0.1, Math.min(10, z + delta)));
      zoomIntervalRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stopZoom = () => {
    if (zoomIntervalRef.current) {
      cancelAnimationFrame(zoomIntervalRef.current);
      zoomIntervalRef.current = null;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const zoomFactor = e.altKey ? 1 / 1.5 : 1.5;
    const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));
    
    if (newZoom !== zoom) {
      const scaleRatio = newZoom / zoom;
      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * scaleRatio,
        y: mouseY - (mouseY - prev.y) * scaleRatio
      }));
      setZoom(newZoom);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 0.1;
    const delta = e.deltaY < 0 ? zoomFactor : -zoomFactor;
    const newZoom = Math.max(0.1, Math.min(10, zoom + delta));
    
    if (newZoom !== zoom) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const scaleRatio = newZoom / zoom;

      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * scaleRatio,
        y: mouseY - (mouseY - prev.y) * scaleRatio
      }));
      
      setZoom(newZoom);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoom100 = () => {
    if (!canvasRef.current || !image) return;
    const unscaledWidth = canvasRef.current.offsetWidth;
    if (unscaledWidth === 0) return;
    const targetZoom = image.width / unscaledWidth;
    setZoom(targetZoom);
    setPan({ x: 0, y: 0 });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
    };
    img.src = url;
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    // Use 1.0 quality for lossy formats, ignored for lossless like PNG
    const dataUrl = canvasRef.current.toDataURL(exportFormat, 1.0);
    const extension = exportFormat.split('/')[1];
    
    const link = document.createElement('a');
    link.download = `film-simulation-${Date.now()}.${extension}`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a0a] text-gray-200 flex flex-col font-sans">
      <header className="border-b border-white/10 bg-[#141414] px-4 py-3 md:px-6 md:py-4 flex items-center justify-between flex-wrap gap-2 z-30">
        <div className="flex items-center gap-2 md:gap-3">
          <Camera className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
          <h1 className="text-lg md:text-xl font-medium tracking-tight text-white">Film<span className="text-gray-500">Lab</span></h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs md:text-sm font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Open Image</span>
            <span className="sm:hidden">Open</span>
          </button>
          
          <div className="flex items-center gap-1 md:gap-2 bg-white/5 rounded-lg p-1">
            <select 
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="bg-transparent text-xs md:text-sm font-medium px-1 md:px-2 py-1 outline-none cursor-pointer max-w-[70px] md:max-w-none"
            >
              <option value="image/png" className="bg-[#141414]">PNG</option>
              <option value="image/avif" className="bg-[#141414]">AVIF</option>
              <option value="image/jpeg" className="bg-[#141414]">JPG</option>
            </select>
            <button 
              onClick={handleDownload}
              disabled={!image}
              className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-md text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 relative bg-[#050505] flex items-center justify-center p-4 md:p-8 overflow-hidden min-h-[40vh] md:min-h-0">
          {!image ? (
            <div className="flex flex-col items-center justify-center text-gray-500 gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-sm">Upload an image to start processing</p>
            </div>
          ) : (
            <div 
              className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden cursor-grab active:cursor-grabbing"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onDoubleClick={handleDoubleClick}
            >
              <div 
                style={{ 
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }} 
                className="flex items-center justify-center w-full h-full pointer-events-none"
              >
                <canvas 
                  ref={canvasRef} 
                  className="shadow-2xl shadow-black/50 max-w-full max-h-full object-contain pointer-events-auto"
                />
                <WebGLCanvas 
                  image={image}
                  filmType={filmType}
                  exposure={exposure}
                  contrast={contrast}
                  highlights={highlights}
                  shadows={shadows}
                  temperature={temperature}
                  tint={tint}
                  saturation={saturation}
                  vibrance={vibrance}
                  targetHue={targetHue}
                  colorRange={colorRange}
                  grainAmount={grainAmount}
                  grainSize={grainSize}
                  showOriginal={showOriginal}
                  halation={halation}
                  vignette={vignette}
                  canvasRef={canvasRef}
                />
              </div>

              {/* Zoom Controls */}
              <div 
                className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center gap-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-1 z-10"
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <button onClick={resetZoom} className="px-2 py-1.5 text-[10px] md:text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors">Fit</button>
                <button onClick={handleZoom100} className="px-2 py-1.5 text-[10px] md:text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors">1:1</button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button 
                  onPointerDown={(e) => { e.stopPropagation(); startZoom(-0.05); }}
                  onPointerUp={stopZoom}
                  onPointerLeave={stopZoom}
                  className="p-1 md:p-1.5 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
                ><Minus className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                <span className="px-1 md:px-2 text-[10px] md:text-xs font-mono text-gray-300 min-w-[2.5rem] md:min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                <button 
                  onPointerDown={(e) => { e.stopPropagation(); startZoom(0.05); }}
                  onPointerUp={stopZoom}
                  onPointerLeave={stopZoom}
                  className="p-1 md:p-1.5 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
                ><Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
              </div>
              
              <button
                onPointerDown={(e) => { e.stopPropagation(); setShowOriginal(true); }}
                onPointerUp={(e) => { e.stopPropagation(); setShowOriginal(false); }}
                onPointerLeave={(e) => { e.stopPropagation(); setShowOriginal(false); }}
                onDoubleClick={(e) => e.stopPropagation()}
                className="absolute bottom-4 right-4 md:bottom-8 md:right-8 flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-black/80 backdrop-blur-md border border-white/10 hover:bg-black rounded-full text-xs md:text-sm font-medium transition-colors select-none z-10"
              >
                <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Hold to Compare</span>
                <span className="sm:hidden">Compare</span>
              </button>
            </div>
          )}
        </div>

        <aside className="w-full md:w-80 h-[45vh] md:h-full border-t md:border-t-0 md:border-l border-white/10 bg-[#141414] overflow-y-auto flex flex-col custom-scrollbar shrink-0 z-20">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-3 h-3" />
              Film Stock
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {FILMS.map((film) => (
                <button
                  key={film.id}
                  onClick={() => setFilmType(film.id)}
                  className={`text-left p-2 rounded-lg border transition-all flex flex-col gap-1 ${
                    filmType === film.id 
                      ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' 
                      : 'bg-white/5 border-transparent text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${film.color}`} />
                    <div className="font-medium text-xs truncate">{film.name}</div>
                  </div>
                  <div className="text-[10px] opacity-60 truncate pl-3">{film.type}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* LIGHT SECTION */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider border-b border-white/10 pb-2">Light</h3>
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Exposure</label>
                  <span className="text-xs font-mono text-gray-500">{exposure > 0 ? '+' : ''}{exposure.toFixed(2)}</span>
                </div>
                <input type="range" min="-2.0" max="2.0" step={isShiftPressed ? 0.01 : 0.05} value={exposure} onChange={(e) => setExposure(parseFloat(e.target.value))} onDoubleClick={() => setExposure(0)} className="w-full accent-yellow-500" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Contrast</label>
                  <span className="text-xs font-mono text-gray-500">{contrast.toFixed(2)}</span>
                </div>
                <input type="range" min="0.8" max="1.5" step={isShiftPressed ? 0.002 : 0.01} value={contrast} onChange={(e) => setContrast(parseFloat(e.target.value))} onDoubleClick={() => setContrast(1.1)} className="w-full accent-yellow-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-gray-400">Highlights</label>
                  </div>
                  <input type="range" min="-1.0" max="1.0" step={isShiftPressed ? 0.01 : 0.05} value={highlights} onChange={(e) => setHighlights(parseFloat(e.target.value))} onDoubleClick={() => setHighlights(0)} className="w-full accent-yellow-500" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-gray-400">Shadows</label>
                  </div>
                  <input type="range" min="-1.0" max="1.0" step={isShiftPressed ? 0.01 : 0.05} value={shadows} onChange={(e) => setShadows(parseFloat(e.target.value))} onDoubleClick={() => setShadows(0)} className="w-full accent-yellow-500" />
                </div>
              </div>
            </div>

            {/* COLOR SECTION */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider border-b border-white/10 pb-2">Color</h3>
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Temperature</label>
                  <span className="text-xs font-mono text-gray-500">{temperature > 0 ? '+' : ''}{temperature.toFixed(2)}</span>
                </div>
                <input type="range" min="-1.0" max="1.0" step={isShiftPressed ? 0.01 : 0.05} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} onDoubleClick={() => setTemperature(0)} className="w-full accent-yellow-500" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Tint</label>
                  <span className="text-xs font-mono text-gray-500">{tint > 0 ? '+' : ''}{tint.toFixed(2)}</span>
                </div>
                <input type="range" min="-1.0" max="1.0" step={isShiftPressed ? 0.01 : 0.05} value={tint} onChange={(e) => setTint(parseFloat(e.target.value))} onDoubleClick={() => setTint(0)} className="w-full accent-yellow-500" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Vibrance</label>
                  <span className="text-xs font-mono text-gray-500">{vibrance > 0 ? '+' : ''}{vibrance.toFixed(2)}</span>
                </div>
                <input type="range" min="-1.0" max="1.0" step={isShiftPressed ? 0.01 : 0.05} value={vibrance} onChange={(e) => setVibrance(parseFloat(e.target.value))} onDoubleClick={() => setVibrance(0)} className="w-full accent-yellow-500" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Saturation</label>
                  <span className="text-xs font-mono text-gray-500">{saturation > 0 ? '+' : ''}{saturation.toFixed(2)}</span>
                </div>
                <input type="range" min="-1.0" max="1.0" step={isShiftPressed ? 0.01 : 0.05} value={saturation} onChange={(e) => setSaturation(parseFloat(e.target.value))} onDoubleClick={() => setSaturation(0)} className="w-full accent-yellow-500" />
              </div>

              <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Target Hue</label>
                  <span className="text-xs font-mono text-gray-500">{targetHue.toFixed(isShiftPressed ? 1 : 0)}°</span>
                </div>
                <input type="range" min="0" max="360" step={isShiftPressed ? 0.1 : 1} value={targetHue} onChange={(e) => setTargetHue(parseFloat(e.target.value))} onDoubleClick={() => setTargetHue(0)} className="w-full" style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)', height: '4px', borderRadius: '2px', appearance: 'none', outline: 'none' }} />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Color Range</label>
                  <span className="text-xs font-mono text-gray-500">{colorRange === 1.0 ? 'All' : `${(colorRange * 100).toFixed(0)}%`}</span>
                </div>
                <input type="range" min="0.05" max="1.0" step={isShiftPressed ? 0.01 : 0.05} value={colorRange} onChange={(e) => setColorRange(parseFloat(e.target.value))} onDoubleClick={() => setColorRange(1.0)} className="w-full accent-yellow-500" />
              </div>
            </div>

            {/* EFFECTS SECTION */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider border-b border-white/10 pb-2">Effects</h3>
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Halation</label>
                  <span className="text-xs font-mono text-gray-500">{(halation * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="1.0" step={isShiftPressed ? 0.002 : 0.01} value={halation} onChange={(e) => setHalation(parseFloat(e.target.value))} onDoubleClick={() => setHalation(0.2)} className="w-full accent-yellow-500" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Lens Vignette</label>
                  <span className="text-xs font-mono text-gray-500">{(vignette * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="1.0" step={isShiftPressed ? 0.002 : 0.01} value={vignette} onChange={(e) => setVignette(parseFloat(e.target.value))} onDoubleClick={() => setVignette(0.3)} className="w-full accent-yellow-500" />
              </div>
            </div>

            {/* GRAIN SECTION */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider border-b border-white/10 pb-2">Film Grain</h3>
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Amount</label>
                  <span className="text-xs font-mono text-gray-500">{(grainAmount * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="1.0" step={isShiftPressed ? 0.002 : 0.01} value={grainAmount} onChange={(e) => setGrainAmount(parseFloat(e.target.value))} onDoubleClick={() => setGrainAmount(0.15)} className="w-full accent-yellow-500" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-gray-400">Crystal Size</label>
                  <span className="text-xs font-mono text-gray-500">{grainSize.toFixed(1)}</span>
                </div>
                <input type="range" min="0.5" max="6.0" step={isShiftPressed ? 0.02 : 0.1} value={grainSize} onChange={(e) => setGrainSize(parseFloat(e.target.value))} onDoubleClick={() => setGrainSize(1.5)} className="w-full accent-yellow-500" />
              </div>
            </div>

            {/* TIPS SECTION */}
            <div className="mt-6 p-4 bg-white/[0.02] rounded-xl border border-white/5 text-xs text-gray-400">
              <div className="flex items-center gap-2 text-gray-300 font-medium mb-3">
                <Keyboard className="w-4 h-4 text-yellow-500/70" />
                Pro Tips
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Fine-tune sliders</span>
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-sans text-gray-300 border border-white/5 shadow-sm whitespace-nowrap">Shift + Drag</kbd>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Reset slider</span>
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-sans text-gray-300 border border-white/5 shadow-sm whitespace-nowrap">Double Click</kbd>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Zoom in</span>
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-sans text-gray-300 border border-white/5 shadow-sm whitespace-nowrap">Double Click</kbd>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Zoom out</span>
                  <div className="flex items-center gap-1">
                    <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-sans text-gray-300 border border-white/5 shadow-sm whitespace-nowrap">Alt</kbd>
                    <span className="text-gray-600">+</span>
                    <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-sans text-gray-300 border border-white/5 shadow-sm whitespace-nowrap">Dbl Click</kbd>
                  </div>
                </li>
              </ul>
            </div>

          </div>
        </aside>
      </main>
    </div>
  );
}
