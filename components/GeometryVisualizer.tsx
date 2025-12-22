import React, { useState, useRef, useEffect } from 'react';
import { generateCanvasAnimation } from '../services/geminiService';
import Loading from './Loading';

const GeometryVisualizer: React.FC = () => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Ref for the canvas element
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Ref to store the current animation code string
  const codeRef = useRef<string>("");
  // Ref to store the animation frame ID so we can cancel it
  const requestRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  const predefinedPrompts = [
    "Ротација на рамностран триаголник околу неговиот центар",
    "Две паралелни прави пресечени со трансверзала, аглите трепкаат",
    "Кружница која се зголемува и намалува (пулсира)",
    "Тангента која се движи по кружница",
    "Симетрала на агол која се исцртува постепено"
  ];

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas || !codeRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const frame = frameRef.current;

    try {
      // Create a function from the AI generated string
      // Function signature: (ctx, width, height, frame)
      const drawFunction = new Function('ctx', 'width', 'height', 'frame', codeRef.current);
      
      // Execute the function
      drawFunction(ctx, width, height, frame);
    } catch (e) {
      console.error("Animation error", e);
      // Stop animation on error to prevent infinite error loops
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
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        // Draw placeholder text
        if(ctx) {
            ctx.font = "16px Inter";
            ctx.fillStyle = "#94a3b8";
            ctx.textAlign = "center";
            ctx.fillText("Се вчитува...", canvas.width/2, canvas.height/2);
        }
    }

    try {
      const code = await generateCanvasAnimation(description);
      codeRef.current = code;
      setIsPlaying(true); // Auto start
    } catch (err: any) {
      alert("Грешка при креирање на анимацијата: " + (err.message || "Непозната грешка"));
      
      // Clear Loading text if error
      if (canvas && canvas.getContext('2d')) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          if (ctx) {
             ctx.fillStyle = "#ef4444";
             ctx.fillText("Грешка: Проверете API Key", canvas.width/2, canvas.height/2);
          }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (text: string) => {
    setDescription(text);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            🎨 AI Визуелизатор
            <span className="text-xs font-normal text-white bg-gradient-to-r from-pink-500 to-purple-500 px-2 py-1 rounded-full shadow-sm">BETA</span>
        </h2>
        <p className="text-slate-500 mt-1">
            Опишете геометриска форма или движење, и AI веднаш ќе го анимира.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
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
        <div className="lg:col-span-2 flex flex-col">
            <div className="relative flex-1 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800 flex items-center justify-center min-h-[400px]">
                <canvas 
                    ref={canvasRef}
                    width={600}
                    height={400}
                    className="bg-slate-900 w-full h-full object-contain"
                />
                
                {/* Overlay Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-slate-800/80 backdrop-blur p-2 rounded-full border border-slate-700">
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
                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                        <Loading message="AI црта..." />
                    </div>
                )}
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">
                Анимацијата е генерирана со Canvas API. Може да содржи визуелни несовршености.
            </p>
        </div>
      </div>
    </div>
  );
};

export default GeometryVisualizer;