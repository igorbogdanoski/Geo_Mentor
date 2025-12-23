import React, { useState, useRef, useEffect } from 'react';
import { generateCanvasAnimation } from '../services/geminiService';
import Loading from './Loading';

type ThemeType = 'dark' | 'light' | 'board';

const THEMES = {
  dark: {
    name: 'Темна',
    bgClass: 'bg-slate-900',
    hex: '#0f172a',
    borderClass: 'border-slate-800'
  },
  light: {
    name: 'Светла',
    bgClass: 'bg-white',
    hex: '#ffffff',
    borderClass: 'border-slate-200'
  },
  board: {
    name: 'Табла',
    bgClass: 'bg-emerald-900',
    hex: '#064e3b',
    borderClass: 'border-emerald-800'
  }
};

/**
 * Shape Registry for Hit Detection
 */
interface InteractiveShape {
    id: string;
    type: 'point' | 'circle' | 'rect';
    x: number;
    y: number;
    r?: number; // Radius for circle/point
    w?: number; // Width for rect
    h?: number; // Height for rect
    info: string;
}

/**
 * A lightweight mock of CanvasRenderingContext2D that generates an SVG string.
 */
class SvgBuilder {
    width: number;
    height: number;
    elements: string[];
    currentPath: string[];
    stateStack: any[];
    currentState: {
        strokeStyle: string;
        fillStyle: string;
        lineWidth: number;
        lineDash: number[];
        font: string;
        transforms: string[]; // List of transform strings
        textAlign: string;
    };
    themeHex: string;

    constructor(width: number, height: number, themeHex: string) {
        this.width = width;
        this.height = height;
        this.themeHex = themeHex;
        this.elements = [];
        this.currentPath = [];
        this.stateStack = [];
        
        this.currentState = {
            strokeStyle: "#000000",
            fillStyle: "#000000",
            lineWidth: 1,
            lineDash: [],
            font: "10px sans-serif",
            transforms: [],
            textAlign: "start"
        };

        // Background
        this.elements.push(`<rect width="${width}" height="${height}" fill="${themeHex}" />`);
    }

    save() {
        this.stateStack.push(JSON.parse(JSON.stringify(this.currentState)));
    }

    restore() {
        if (this.stateStack.length > 0) {
            this.currentState = this.stateStack.pop();
        }
    }

    translate(x: number, y: number) {
        this.currentState.transforms.push(`translate(${x}, ${y})`);
    }

    rotate(angle: number) {
        const degrees = (angle * 180) / Math.PI;
        this.currentState.transforms.push(`rotate(${degrees})`);
    }

    scale(x: number, y: number) {
         this.currentState.transforms.push(`scale(${x}, ${y})`);
    }

    set strokeStyle(v: string) { this.currentState.strokeStyle = v; }
    get strokeStyle() { return this.currentState.strokeStyle; }
    
    set fillStyle(v: string) { this.currentState.fillStyle = v; }
    get fillStyle() { return this.currentState.fillStyle; }

    set lineWidth(v: number) { this.currentState.lineWidth = v; }
    get lineWidth() { return this.currentState.lineWidth; }

    set font(v: string) { this.currentState.font = v; }
    get font() { return this.currentState.font; }
    
    set textAlign(v: string) { this.currentState.textAlign = v; }

    setLineDash(segments: number[]) { this.currentState.lineDash = segments; }

    beginPath() { this.currentPath = []; }
    moveTo(x: number, y: number) { this.currentPath.push(`M ${x} ${y}`); }
    lineTo(x: number, y: number) { this.currentPath.push(`L ${x} ${y}`); }
    
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise = false) {
        if (Math.abs(endAngle - startAngle) >= 2 * Math.PI - 0.001) {
            this._addEl(`<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${this.currentState.strokeStyle}" stroke-width="${this.currentState.lineWidth}" />`);
        } else {
             const startX = x + radius * Math.cos(startAngle);
             const startY = y + radius * Math.sin(startAngle);
             const endX = x + radius * Math.cos(endAngle);
             const endY = y + radius * Math.sin(endAngle);
             const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
             const sweepFlag = counterclockwise ? "0" : "1";
             
             if (this.currentPath.length === 0) this.currentPath.push(`M ${startX} ${startY}`);
             else this.currentPath.push(`L ${startX} ${startY}`);
             this.currentPath.push(`A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`);
        }
    }
    
    rect(x: number, y: number, w: number, h: number) {
        this.currentPath.push(`M ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`);
    }

    stroke() {
        if (this.currentPath.length > 0) {
            const d = this.currentPath.join(" ");
            const dash = this.currentState.lineDash.length > 0 ? `stroke-dasharray="${this.currentState.lineDash.join(',')}"` : "";
            this._addEl(`<path d="${d}" fill="none" stroke="${this.currentState.strokeStyle}" stroke-width="${this.currentState.lineWidth}" ${dash} stroke-linecap="round" stroke-linejoin="round" class="geo-line" />`);
        }
    }

    fill() {
        if (this.currentPath.length > 0) {
            const d = this.currentPath.join(" ");
             this._addEl(`<path d="${d}" fill="${this.currentState.fillStyle}" stroke="none" class="geo-shape" />`);
        }
    }
    
    fillText(text: string, x: number, y: number) {
        let anchor = "start";
        if (this.currentState.textAlign === "center") anchor = "middle";
        if (this.currentState.textAlign === "right") anchor = "end";
        const fontSizeMatch = this.currentState.font.match(/(\d+)px/);
        const size = fontSizeMatch ? fontSizeMatch[1] : "12";
        this._addEl(`<text x="${x}" y="${y}" fill="${this.currentState.fillStyle}" font-family="Inter, sans-serif" font-size="${size}" text-anchor="${anchor}" class="geo-text">${text}</text>`);
    }
    
    _addEl(content: string) {
        // Apply current transforms
        if (this.currentState.transforms.length > 0) {
            const t = this.currentState.transforms.join(" ");
            this.elements.push(`<g transform="${t}">${content}</g>`);
        } else {
            this.elements.push(content);
        }
    }

    clearRect() { /* Ignore */ }
    clip() { /* Ignore */ }

    getSVGString() {
        const styleBlock = `
        <defs>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
                .geo-text { font-family: 'Inter', sans-serif; font-weight: 600; }
                .geo-line { stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
                .geo-shape { transition: fill 0.3s; }
            </style>
        </defs>`;
        
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">${styleBlock}${this.elements.join('\n')}</svg>`;
    }
}


const GeometryVisualizer: React.FC = () => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('dark');
  const [showGrid, setShowGrid] = useState(true);
  
  const [lineColor, setLineColor] = useState('#60a5fa');
  const [wipeAnimation, setWipeAnimation] = useState(false);
  const [wipeProgress, setWipeProgress] = useState(1);
  const [hoveredInfo, setHoveredInfo] = useState<{x:number, y:number, text:string} | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<string>("");
  const compiledDrawRef = useRef<Function | null>(null);
  const requestRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const logicalSizeRef = useRef({ width: 0, height: 0 });
  const interactiveObjectsRef = useRef<InteractiveShape[]>([]);
  
  const themeRef = useRef<ThemeType>('dark');
  const showGridRef = useRef<boolean>(true);
  const lineColorRef = useRef<string>(lineColor);
  const wipeRef = useRef<boolean>(wipeAnimation);

  // Sync Refs
  useEffect(() => {
    themeRef.current = currentTheme;
    showGridRef.current = showGrid;
    lineColorRef.current = lineColor;
    wipeRef.current = wipeAnimation;
    
    // Only reset frames if we are actively playing or restarting.
    // If paused/static, we don't want to reset just because a setting changed.
    if (isPlaying && wipeAnimation) {
       // Allow animation to continue or reset if needed
    }
  }, [currentTheme, showGrid, lineColor, wipeAnimation]);

  // Resize Observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container && canvasRef.current) {
            const { width, height } = entry.contentRect;
            const dpr = window.devicePixelRatio || 1;
            
            if (width === 0 || height === 0) return;

            canvasRef.current.width = width * dpr;
            canvasRef.current.height = height * dpr;
            canvasRef.current.style.width = '100%';
            canvasRef.current.style.height = '100%';
            
            logicalSizeRef.current = { width, height };
            
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.resetTransform();
                ctx.scale(dpr, dpr);
            }
            
            // Force redraw immediately
             requestRef.current = requestAnimationFrame(() => animate());
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Animation Loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas || !compiledDrawRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = logicalSizeRef.current;
    
    interactiveObjectsRef.current = [];

    const registerShape = (id: string, data: any, info: string) => {
        interactiveObjectsRef.current.push({ id, info, ...data });
    };

    const drawRotated = (cx: number, cy: number, angle: number, drawFn: () => void) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.translate(-cx, -cy);
        drawFn();
        ctx.restore();
    };

    try {
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Wipe/Clip Effect
      // If NOT playing (static image mode), we force progress to 1 (visible)
      // If playing, we use the wipe calculation
      if (wipeRef.current && isPlaying) {
          const duration = 120;
          let p = frameRef.current / duration;
          if (p > 1) p = 1;
          setWipeProgress(p);
          
          ctx.beginPath();
          ctx.rect(0, 0, width * p, height);
          ctx.clip();
      } else if (wipeRef.current && !isPlaying) {
          // Static mode with wipe enabled -> Show full
           setWipeProgress(1);
      }

      compiledDrawRef.current(
          ctx, 
          width, 
          height, 
          frameRef.current, 
          themeRef.current, 
          showGridRef.current, 
          lineColorRef.current, 
          registerShape,
          drawRotated
      );
      
      ctx.restore();
    } catch (e) {
      console.error("Runtime error", e);
      setIsPlaying(false);
      return;
    }

    if (isPlaying) {
      frameRef.current += 1;
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying]);

  const handleGenerate = async () => {
    if (!description) return;
    setLoading(true);
    setIsPlaying(false);
    
    // Clear
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const { width, height } = logicalSizeRef.current;
        ctx?.clearRect(0, 0, width, height);
        if(ctx) {
            ctx.font = "16px Inter";
            ctx.fillStyle = currentTheme === 'light' ? "#64748b" : "#94a3b8";
            ctx.textAlign = "center";
            ctx.fillText("AI ја анализира геометријата...", width/2, height/2);
        }
    }

    try {
      const code = await generateCanvasAnimation(description);
      codeRef.current = code;
      
      try {
          const drawFunc = new Function('ctx', 'width', 'height', 'frame', 'theme', 'showGrid', 'primaryColor', 'registerShape', 'drawRotated', code);
          compiledDrawRef.current = drawFunc;

          // STATIC MODE DEFAULT:
          // Instead of playing immediately, we set a high frame count to render the final state
          // and draw it once.
          frameRef.current = 6000; // Arbitrary high number to ensure construction is finished
          setWipeProgress(1);
          setIsPlaying(false);
          
          // Execute one draw call for the image
          requestAnimationFrame(() => animate());
          
      } catch (compileError) {
          console.error(compileError);
          alert("Грешка при компајлирање.");
      }
    } catch (err: any) {
      alert("Грешка: " + (err.message || "Непозната грешка"));
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = () => {
      if (!compiledDrawRef.current) return;
      frameRef.current = 0;
      setWipeProgress(0);
      setIsPlaying(true);
  };

  const handleInteraction = (e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = logicalSizeRef.current.width / rect.width;
      const scaleY = logicalSizeRef.current.height / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      let found = null;
      for (let i = interactiveObjectsRef.current.length - 1; i >= 0; i--) {
          const obj = interactiveObjectsRef.current[i];
          if (obj.type === 'point' || obj.type === 'circle') {
              const r = obj.r || 10;
              const dist = Math.hypot(x - obj.x, y - obj.y);
              if (dist <= r + 5) {
                  found = obj;
                  break;
              }
          } else if (obj.type === 'rect') {
              if (obj.w && obj.h && x >= obj.x && x <= obj.x + obj.w && y >= obj.y && y <= obj.y + obj.h) {
                  found = obj;
                  break;
              }
          }
      }

      if (found) {
          if (e.type === 'click') {
              alert(`Инфо: ${found.info}`);
          } else {
              setHoveredInfo({ x: e.clientX, y: e.clientY, text: found.info });
              canvasRef.current.style.cursor = 'pointer';
          }
      } else {
          setHoveredInfo(null);
          canvasRef.current.style.cursor = 'default';
      }
  };

  const handleDownloadSVG = () => {
    if (!compiledDrawRef.current) return;
    try {
        const { width, height } = logicalSizeRef.current;
        const svgBuilder = new SvgBuilder(width, height, THEMES[currentTheme].hex);
        const mockDrawRotated = (cx: number, cy: number, angle: number, fn: () => void) => {
             svgBuilder.save();
             svgBuilder.translate(cx, cy);
             svgBuilder.rotate(angle);
             svgBuilder.translate(-cx, -cy);
             fn();
             svgBuilder.restore();
        }
        compiledDrawRef.current(
            svgBuilder, width, height, frameRef.current, currentTheme, showGrid, lineColor, () => {}, mockDrawRotated
        );
        const svgString = svgBuilder.getSVGString();
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `geo-vector-${Date.now()}.svg`;
        link.click();
    } catch (e) {
        console.error(e);
        alert("Грешка при SVG експорт.");
    }
  };

  const handleDownloadPNG = () => {
      if (!canvasRef.current) return;
      try {
          // Temporarily ensure high quality
          const dataUrl = canvasRef.current.toDataURL("image/png");
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `geo-image-${Date.now()}.png`;
          link.click();
      } catch (e) {
          console.error(e);
          alert("Грешка при експорт на слика.");
      }
  };

  const predefinedPrompts = [
    "Ротација на рамностран триаголник околу неговиот центар",
    "Две паралелни прави пресечени со трансверзала, аглите трепкаат",
    "Кружница која се зголемува и намалува (пулсира)",
    "Тангента која се движи по кружница",
    "Симетрала на отсечка AB (со големи лаци R > AB/2)"
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            🎨 AI Визуелизатор (v2.5)
            <span className="text-xs font-normal text-white bg-gradient-to-r from-blue-500 to-teal-500 px-2 py-1 rounded-full shadow-sm">Interactive</span>
        </h2>
        <p className="text-slate-500 mt-1">
            Генерирајте, анимирајте и експортирајте геометриски конструкции.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[500px]">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Опис / Код</label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Пример: Draw a circle... ИЛИ asy code: draw((0,0)--(100,100));"
                    className="w-full p-3 border border-slate-300 rounded-lg h-32 focus:ring-2 focus:ring-purple-500 outline-none resize-none shadow-sm font-mono text-sm"
                />
            </div>

             {/* New Controls */}
             <div className="grid grid-cols-2 gap-4">
                <div>
                     <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Боја на Линија</label>
                     <div className="flex items-center gap-2">
                        <input 
                            type="color" 
                            value={lineColor}
                            onChange={(e) => setLineColor(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                        />
                        <span className="text-xs text-slate-600 font-mono">{lineColor}</span>
                     </div>
                </div>
                <div>
                     <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Анимација</label>
                     <button
                        onClick={() => setWipeAnimation(!wipeAnimation)}
                        className={`text-xs px-3 py-2 rounded-lg border w-full transition-colors font-semibold ${wipeAnimation ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-slate-600 border-slate-200'}`}
                     >
                        {wipeAnimation ? '⏩ Ефект (ON)' : '⏹️ Ефект (OFF)'}
                     </button>
                </div>
            </div>
            
            <button
                onClick={handleGenerate}
                disabled={loading || !description}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all font-bold shadow-md transform active:scale-95 flex items-center justify-center gap-2"
            >
                {loading ? 'Се процесира...' : '🪄 Нацртај Слика'}
            </button>
            
            {/* Play Button only visible when we have code */}
            {compiledDrawRef.current && !loading && (
                <button
                    onClick={handleReplay}
                    className="w-full py-3 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-all font-bold shadow-sm flex items-center justify-center gap-2"
                >
                    ▶️ Анимирај го цртањето
                </button>
            )}

            <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Примери:</p>
                <div className="flex flex-col gap-2">
                    {predefinedPrompts.map((prompt, idx) => (
                        <button 
                            key={idx}
                            onClick={() => { setDescription(prompt); }}
                            className="text-left text-xs p-2 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 rounded transition-colors border border-slate-100 truncate"
                        >
                            ✨ {prompt}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Canvas Display */}
        <div className="lg:col-span-2 flex flex-col order-1 lg:order-2 h-full min-h-[300px]">
            {/* Toolbar */}
            <div className="flex flex-wrap justify-between items-center mb-2 px-1 gap-2">
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase mr-1">Тема:</span>
                    <button onClick={() => setCurrentTheme('dark')} className={`w-6 h-6 rounded-full border-2 ${currentTheme === 'dark' ? 'border-purple-600 scale-110' : 'border-slate-300'} bg-slate-900`} title="Dark" />
                    <button onClick={() => setCurrentTheme('board')} className={`w-6 h-6 rounded-full border-2 ${currentTheme === 'board' ? 'border-purple-600 scale-110' : 'border-slate-300'} bg-emerald-900`} title="Board" />
                    <button onClick={() => setCurrentTheme('light')} className={`w-6 h-6 rounded-full border-2 ${currentTheme === 'light' ? 'border-purple-600 scale-110' : 'border-slate-300'} bg-white`} title="Light" />
                 </div>

                 <div className="flex items-center gap-2">
                     <button onClick={() => setShowGrid(!showGrid)} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${showGrid ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500'}`}># Мрежа</button>
                     <button id="png-btn" onClick={handleDownloadPNG} className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 hover:bg-blue-100">🖼️ PNG</button>
                     <button id="svg-btn" onClick={handleDownloadSVG} className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 hover:bg-indigo-100">📐 SVG</button>
                 </div>
            </div>

            <div 
                ref={containerRef} 
                className={`relative flex-1 rounded-xl overflow-hidden shadow-2xl border-4 flex items-center justify-center w-full h-full transition-colors duration-500 ${THEMES[currentTheme].bgClass} ${THEMES[currentTheme].borderClass}`}
            >
                <canvas 
                    ref={canvasRef}
                    onClick={handleInteraction}
                    onMouseMove={handleInteraction}
                    className="block w-full h-full"
                />
                
                {/* Overlay Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-slate-800/80 backdrop-blur p-2 rounded-full border border-slate-700 z-10 shadow-lg">
                    {isPlaying ? (
                        <button onClick={() => setIsPlaying(false)} className="p-2 rounded-full bg-white text-slate-900 hover:bg-slate-200" title="Пауза">
                            ⏸
                        </button>
                    ) : (
                        <button onClick={() => setIsPlaying(true)} className="p-2 rounded-full bg-white text-slate-900 hover:bg-slate-200" title="Продолжи">
                            ▶
                        </button>
                    )}
                    <button onClick={handleReplay} className="p-2 rounded-full text-white hover:bg-slate-700" title="Рестартирај">
                        🔄
                    </button>
                </div>
                
                {/* Tooltip */}
                {hoveredInfo && (
                    <div 
                        className="fixed z-50 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none"
                        style={{ left: hoveredInfo.x + 10, top: hoveredInfo.y + 10 }}
                    >
                        {hoveredInfo.text}
                    </div>
                )}

                {loading && <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50"><Loading message="Се црта..." /></div>}
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">Кликнете на 'Нацртај' за статична слика, потоа 'Анимирај' за движење.</p>
        </div>
      </div>
    </div>
  );
};

export default GeometryVisualizer;
