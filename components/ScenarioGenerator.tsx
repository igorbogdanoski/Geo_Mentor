import React, { useState, useRef } from 'react';
import { CURRICULUM } from '../constants';
import { generateScenarioContent } from '../services/geminiService';
import { GeneratedScenario } from '../types';
import Loading from './Loading';
import FormattedText from './FormattedText';

const ScenarioGenerator: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<string>(CURRICULUM[0]?.name || '');
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom fields for the print view
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setScenario(null);
    try {
      const result = await generateScenarioContent(selectedTopic);
      setScenario(result);
    } catch (err: any) {
      setError(err.message || "Се појави грешка при генерирање на сценариото.");
    } finally {
      setLoading(false);
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