import React, { useState, useEffect } from 'react';
import { CURRICULUM } from '../constants';
import { generateScenarioContent, generateCanvasAnimation } from '../services/geminiService';
import { GeneratedScenario } from '../types';
import Loading from './Loading';
import FormattedText from './FormattedText';

// Reuse SvgBuilder class locally since it's not exported from GeometryVisualizer
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
        transforms: string[];
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
        // Transparent background for print
        // this.elements.push(`<rect width="${width}" height="${height}" fill="${themeHex}" />`);
    }

    save() { this.stateStack.push(JSON.parse(JSON.stringify(this.currentState))); }
    restore() { if (this.stateStack.length > 0) this.currentState = this.stateStack.pop(); }
    translate(x: number, y: number) { this.currentState.transforms.push(`translate(${x}, ${y})`); }
    rotate(angle: number) { const degrees = (angle * 180) / Math.PI; this.currentState.transforms.push(`rotate(${degrees})`); }
    scale(x: number, y: number) { this.currentState.transforms.push(`scale(${x}, ${y})`); }
    set strokeStyle(v: string) { this.currentState.strokeStyle = v; }
    set fillStyle(v: string) { this.currentState.fillStyle = v; }
    set lineWidth(v: number) { this.currentState.lineWidth = v; }
    set font(v: string) { this.currentState.font = v; }
    set textAlign(v: string) { this.currentState.textAlign = v; }
    setLineDash(segments: number[]) { this.currentState.lineDash = segments; }
    beginPath() { this.currentPath = []; }
    moveTo(x: number, y: number) { this.currentPath.push(`M ${x} ${y}`); }
    lineTo(x: number, y: number) { this.currentPath.push(`L ${x} ${y}`); }
    closePath() { this.currentPath.push("Z"); }
    
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
            this._addEl(`<path d="${d}" fill="none" stroke="${this.currentState.strokeStyle}" stroke-width="${this.currentState.lineWidth}" ${dash} stroke-linecap="round" stroke-linejoin="round" />`);
        }
    }

    fill() {
        if (this.currentPath.length > 0) {
            const d = this.currentPath.join(" ");
             this._addEl(`<path d="${d}" fill="${this.currentState.fillStyle}" stroke="none" />`);
        }
    }
    
    fillText(text: string, x: number, y: number) {
        let anchor = "start";
        if (this.currentState.textAlign === "center") anchor = "middle";
        if (this.currentState.textAlign === "right") anchor = "end";
        // Convert canvas font string to size (rough approx)
        const fontSizeMatch = this.currentState.font.match(/(\d+)px/);
        const size = fontSizeMatch ? fontSizeMatch[1] : "12";
        this._addEl(`<text x="${x}" y="${y}" fill="${this.currentState.fillStyle}" font-family="Inter, sans-serif" font-size="${size}" text-anchor="${anchor}">${text}</text>`);
    }
    
    _addEl(content: string) {
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
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="100%" height="100%">${this.elements.join('\n')}</svg>`;
    }
}

const ScenarioGenerator: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<string>(CURRICULUM[0]?.name || '');
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  
  // Image Generation State
  const [visualLoading, setVisualLoading] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setVisualLoading(false);
    setError(null);
    setScenario(null);
    setSvgContent(null);
    try {
      const result = await generateScenarioContent(selectedTopic);
      setScenario(result);
      
      // If the scenario has an image prompt, auto-generate the visual
      if (result.imagePrompt) {
          generateScenarioVisual(result.imagePrompt);
      }
    } catch (err: any) {
      setError(err.message || "Се појави грешка при генерирање на сценариото.");
    } finally {
      setLoading(false);
    }
  };

  const generateScenarioVisual = async (prompt: string) => {
      setVisualLoading(true);
      try {
          const code = await generateCanvasAnimation(prompt);
          
          // Execute the code against the SvgBuilder
          const width = 400;
          const height = 300;
          const svgBuilder = new SvgBuilder(width, height, '#ffffff');
          
          const mockDrawRotated = (cx: number, cy: number, angle: number, fn: () => void) => {
             svgBuilder.save();
             svgBuilder.translate(cx, cy);
             svgBuilder.rotate(angle);
             svgBuilder.translate(-cx, -cy);
             fn();
             svgBuilder.restore();
          };
          
          // Safe execution wrapper
          try {
             const drawFunc = new Function('ctx', 'width', 'height', 'frame', 'theme', 'showGrid', 'primaryColor', 'registerShape', 'drawRotated', code);
             // Run once (frame 0) to get the static image
             drawFunc(svgBuilder, width, height, 0, 'light', false, '#000000', () => {}, mockDrawRotated);
             setSvgContent(svgBuilder.getSVGString());
          } catch(e) {
              console.error("Failed to execute visual code", e);
          }

      } catch (e) {
          console.error("Failed to generate visual", e);
      } finally {
          setVisualLoading(false);
      }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controls - Hidden during print */}
      <div className="print:hidden space-y-6 animate-fade-in">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              📋 Генератор на Сценарија
              <span className="text-sm font-normal text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">VII Одд.</span>
          </h2>
          <p className="text-slate-500 mt-1">Креирајте детални подготовки за час подготвени за печатење.</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Наставна Тема</label>
                    <select 
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    >
                        {CURRICULUM.map(topic => (
                        <option key={topic.id} value={topic.name}>{topic.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Изготвил (Име)</label>
                            <input 
                                type="text" 
                                value={teacherName} 
                                onChange={(e) => setTeacherName(e.target.value)}
                                placeholder="Вашето име"
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ООУ</label>
                            <input 
                                type="text" 
                                value={schoolName} 
                                onChange={(e) => setSchoolName(e.target.value)}
                                placeholder="Име на училиштето"
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                            />
                        </div>
                     </div>
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors font-semibold shadow-sm flex items-center justify-center gap-2"
            >
                {loading ? 'Се генерира...' : (
                    <><span>✨</span> Генерирај Сценарио</>
                )}
            </button>
        </div>

        {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 shadow-sm">
              <div className="flex items-start gap-3">
                 <div className="text-xl">⚠️</div>
                 <div>
                    <strong>Грешка:</strong> {error}
                 </div>
              </div>
            </div>
        )}

        {loading && <Loading message="Се подготвува сценариото за час..." />}
      </div>

      {/* Scenario Preview / Print View */}
      {scenario && !loading && (
        <div className="animate-slide-up">
            <div className="print:hidden flex justify-end mb-4">
                 <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors shadow-lg"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Печати / PDF (Landscape)
                 </button>
            </div>

            {/* DOCUMENT LAYOUT - Adjusted to Landscape (297mm wide) */}
            <div className="bg-white p-8 print:p-0 border shadow-sm print:shadow-none print:border-none w-full max-w-[297mm] print:max-w-none mx-auto min-h-[210mm] print:min-h-0 text-sm text-black">
                
                {/* Header Table */}
                <table className="w-full border-collapse border border-black mb-6">
                    <tbody>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100 print:bg-gray-100 w-1/3">Предмет:</td>
                            <td className="border border-black p-2 w-2/3">Математика за VII одделение</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100 print:bg-gray-100">Тема:</td>
                            <td className="border border-black p-2 uppercase font-bold">ГЕОМЕТРИЈА - {scenario.topic}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100 print:bg-gray-100">Време за реализација:</td>
                            <td className="border border-black p-2">1 Училишен час (40 мин.)</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100 print:bg-gray-100">Изготвил/-а:</td>
                            <td className="border border-black p-2">{teacherName || '__________________'}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100 print:bg-gray-100">ООУ:</td>
                            <td className="border border-black p-2">{schoolName || '__________________'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Main Content Table */}
                <table className="w-full border-collapse border border-black text-left align-top">
                    <thead>
                        <tr className="bg-slate-100 print:bg-gray-100 text-center font-bold">
                            <th className="border border-black p-2 w-[15%]">Содржина (и поими)</th>
                            <th className="border border-black p-2 w-[20%]">Стандарди за оценување</th>
                            <th className="border border-black p-2 w-[35%]">Сценарио за часот</th>
                            <th className="border border-black p-2 w-[15%]">Средства</th>
                            <th className="border border-black p-2 w-[15%]">Следење на напредокот</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-3 align-top">
                                <FormattedText text={scenario.content} />
                            </td>
                            <td className="border border-black p-3 align-top">
                                <FormattedText text={scenario.standards} />
                            </td>
                            <td className="border border-black p-3 align-top">
                                <div className="space-y-4">
                                    <div>
                                        <p className="font-bold underline mb-1">Воведна активност (10 мин.)</p>
                                        <FormattedText text={scenario.introActivity} className="text-justify" />
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 pt-2">
                                        <p className="font-bold underline mb-1">Главни активности (20 мин.)</p>
                                        <FormattedText text={scenario.mainActivity} className="text-justify" />
                                        
                                        {/* Embedded Visual */}
                                        <div className="mt-4 border rounded p-2 text-center break-inside-avoid">
                                            {visualLoading ? (
                                                <div className="text-xs text-slate-400 py-4 italic">Се генерира илустрација...</div>
                                            ) : svgContent ? (
                                                <>
                                                    <div className="w-full max-w-[250px] mx-auto" dangerouslySetInnerHTML={{ __html: svgContent }} />
                                                    <p className="text-[10px] text-slate-500 mt-1 italic">Сл 1. {scenario.imagePrompt || 'Геометриска илустрација'}</p>
                                                </>
                                            ) : (
                                                <div className="text-[10px] text-slate-300 py-4">Простор за скица</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 pt-2">
                                        <p className="font-bold underline mb-1">Завршна активност (10 мин.)</p>
                                        <FormattedText text={scenario.finalActivity} className="text-justify" />
                                    </div>
                                </div>
                            </td>
                            <td className="border border-black p-3 align-top">
                                <FormattedText text={scenario.resources} />
                            </td>
                            <td className="border border-black p-3 align-top">
                                <FormattedText text={scenario.assessment} />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="mt-8 pt-4 border-t border-black print:block hidden">
                    <div className="flex justify-between text-xs">
                        <p>Датум: ________________</p>
                        <p>Потпис: ________________</p>
                    </div>
                </div>

            </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioGenerator;
