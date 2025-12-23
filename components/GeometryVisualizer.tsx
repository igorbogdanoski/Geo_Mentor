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

const GeometryVisualizer: React.FC = () => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('dark');
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<string>("");
  const requestRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const logicalSizeRef = useRef({ width: 0, height: 0 }); // Track logical size for draw function
  
  // Ref for theme to be accessible inside animation loop
  const themeRef = useRef<ThemeType>('dark');

  // Update theme ref when state changes
  useEffect(() => {
    themeRef.current = currentTheme;
    // Force a single redraw if paused so user sees theme change effect
    if (!isPlaying && codeRef.current && canvasRef.current && containerRef.current) {
         const { width, height } = logicalSizeRef.current;
         const ctx = canvasRef.current.getContext('2d');
         if (ctx) {
             try {
                // Ensure state is clean before single frame draw
                ctx.save();
                const drawFunction = new Function('ctx', 'width', 'height', 'frame', 'theme', codeRef.current);
                drawFunction(ctx, width, height, frameRef.current, currentTheme);
                ctx.restore();
             } catch(e) {}
         }
    }
  }, [currentTheme, isPlaying]);

  const predefinedPrompts = [
    "Ротација на рамностран триаголник околу неговиот центар",
    "Две паралелни прави пресечени со трансверзала, аглите трепкаат",
    "Кружница која се зголемува и намалува (пулсира)",
    "Тангента која се движи по кружница",
    "Симетрала на агол која се исцртува постепено"
  ];

  // Responsive Canvas Sizing (with High DPI support)
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        // Handle Device Pixel Ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        
        // Set physical size
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        
        // Set CSS size
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        // Store logical size for drawing logic
        logicalSizeRef.current = { width, height };

        // Scale context
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas || !codeRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use logical size so the AI code works with CSS pixels (which makes sense for font sizes etc)
    const { width, height } = logicalSizeRef.current;
    const frame = frameRef.current;
    const theme = themeRef.current;

    try {
      ctx.save(); // Save default state (including DPR scale)
      const drawFunction = new Function('ctx', 'width', 'height', 'frame', 'theme', codeRef.current);
      drawFunction(ctx, width, height, frame, theme);
      ctx.restore(); // Restore default state
    } catch (e) {
      console.error("Animation error", e);
      setIsPlaying(false);
      return;
    }

    frameRef.current += 1;
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  // Effect to handle play/pause
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
    frameRef.current = 0;
    
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        // Clear based on logical size, but clearRect works on transformed context
        const { width, height } = logicalSizeRef.current;
        ctx?.clearRect(0, 0, width, height);
        
        if(ctx) {
            ctx.font = "16px Inter";
            ctx.fillStyle = currentTheme === 'light' ? "#64748b" : "#94a3b8";
            ctx.textAlign = "center";
            ctx.fillText("Се вчитува...", width/2, height/2);
        }
    }

    try {
      const code = await generateCanvasAnimation(description);
      codeRef.current = code;
      setIsPlaying(true); // Auto start
    } catch (err: any) {
      alert("Грешка: " + (err.message || "Непозната грешка"));
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (text: string) => {
    setDescription(text);
  };

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas at exact pixel size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;   // Physical pixels
    tempCanvas.height = canvas.height; // Physical pixels
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    // 1. Fill Background
    tCtx.fillStyle = THEMES[currentTheme].hex;
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // 2. Draw original canvas
    tCtx.drawImage(canvas, 0, 0);

    // 3. Download
    try {
        const link = document.createElement('a');
        link.download = `geo-mentor-img-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
        
        // Visual feedback
        const btn = document.getElementById('snapshot-btn');
        if(btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = "✅ Зачувано";
            setTimeout(() => btn.innerHTML = originalText, 2000);
        }
    } catch (e) {
        alert("Грешка при зачувување на сликата.");
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            🎨 AI Визуелизатор
            <span className="text-xs font-normal text-white bg-gradient-to-r from-pink-500 to-purple-500 px-2 py-1 rounded-full shadow-sm">AI 2.0</span>
        </h2>
        <p className="text-slate-500 mt-1">
            Опишете геометриска форма или движење. Изберете тема за подобар приказ.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[500px]">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Опис на анимацијата</label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="На пр: Црвен квадрат кој ротира и се зголемува..."
                    className="w-full p-3 border border-slate-300 rounded-lg h-32 focus:ring-2 focus:ring-purple-500 outline-none resize-none shadow-sm"
                />
            </div>
            
            <button
                onClick={handleGenerate}
                disabled={loading || !description}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all font-bold shadow-md transform active:scale-95"
            >
                {loading ? 'Се црта...' : '🪄 Креирај Анимација'}
            </button>

            <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Брзи идеи:</p>
                <div className="flex flex-col gap-2">
                    {predefinedPrompts.map((prompt, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handlePreset(prompt)}
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
            {/* Toolbar above Canvas */}
            <div className="flex flex-wrap justify-between items-center mb-2 px-1 gap-2">
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase mr-1">Тема:</span>
                    <button 
                        onClick={() => setCurrentTheme('dark')}
                        className={`w-6 h-6 rounded-full border-2 ${currentTheme === 'dark' ? 'border-purple-600 scale-110 shadow-sm' : 'border-slate-300'} bg-slate-900`}
                        title="Темна"
                    />
                    <button 
                        onClick={() => setCurrentTheme('board')}
                        className={`w-6 h-6 rounded-full border-2 ${currentTheme === 'board' ? 'border-purple-600 scale-110 shadow-sm' : 'border-slate-300'} bg-emerald-900`}
                        title="Табла"
                    />
                     <button 
                        onClick={() => setCurrentTheme('light')}
                        className={`w-6 h-6 rounded-full border-2 ${currentTheme === 'light' ? 'border-purple-600 scale-110 shadow-sm' : 'border-slate-300'} bg-white`}
                        title="Светла"
                    />
                 </div>

                 <div className="flex gap-2">
                     <button
                        id="snapshot-btn"
                        onClick={handleDownloadSnapshot}
                        className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-purple-700 bg-white hover:bg-purple-50 px-3 py-1.5 rounded-full border border-slate-200 transition-colors shadow-sm"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        PNG
                     </button>
                 </div>
            </div>

            <div 
                ref={containerRef} 
                className={`relative flex-1 rounded-xl overflow-hidden shadow-2xl border-4 flex items-center justify-center w-full h-full transition-colors duration-500 ${THEMES[currentTheme].bgClass} ${THEMES[currentTheme].borderClass}`}
            >
                <canvas 
                    ref={canvasRef}
                    className="block"
                />
                
                {/* Overlay Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-slate-800/80 backdrop-blur p-2 rounded-full border border-slate-700 z-10 shadow-lg">
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-2 rounded-full bg-white text-slate-900 hover:bg-slate-200 transition-colors"
                        title={isPlaying ? "Паузирај" : "Пушти"}
                    >
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </button>
                    <button 
                        onClick={() => { frameRef.current = 0; }}
                        className="p-2 rounded-full text-white hover:bg-slate-700 transition-colors"
                        title="Рестартирај"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                {loading && (
                    <div className={`absolute inset-0 flex items-center justify-center z-20 ${currentTheme === 'light' ? 'bg-white/80' : 'bg-slate-900/80'}`}>
                        <Loading message="AI црта..." />
                    </div>
                )}
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">
                СОВЕТ: Сликата е векторски скалирана и одговара на вашиот екран.
            </p>
        </div>
      </div>
    </div>
  );
};

export default GeometryVisualizer;
