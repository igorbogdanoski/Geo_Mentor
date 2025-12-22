import React from 'react';
import { AppMode } from '../types';

interface LayoutProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentMode, setMode, children }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 print:bg-white">
      {/* Sidebar - Hidden when printing */}
      <aside className="w-full md:w-72 bg-indigo-900 text-white flex-shrink-0 transition-all print:hidden">
        <div className="p-6 border-b border-indigo-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">📐</span> Гео-Ментор 7
          </h1>
          <p className="text-xs text-indigo-300 mt-2">Геометрија за VII одделение</p>
        </div>
        <nav className="p-4 space-y-2">
          <button
            onClick={() => setMode(AppMode.LESSON)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              currentMode === AppMode.LESSON ? 'bg-indigo-700 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800'
            }`}
          >
            <span>📚</span> Лекции
          </button>
          <button
            onClick={() => setMode(AppMode.SCENARIO)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              currentMode === AppMode.SCENARIO ? 'bg-indigo-700 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800'
            }`}
          >
            <span>📋</span> Сценарија
          </button>
          <button
            onClick={() => setMode(AppMode.QUIZ)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              currentMode === AppMode.QUIZ ? 'bg-indigo-700 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800'
            }`}
          >
            <span>📝</span> Тестови
          </button>
          <button
            onClick={() => setMode(AppMode.VISUALIZER)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              currentMode === AppMode.VISUALIZER ? 'bg-indigo-700 text-white shadow-md' : 'text-indigo-200 hover:bg-indigo-800'
            }`}
          >
            <span>🎨</span> AI Визуелизатор
          </button>
        </nav>
        <div className="p-6 mt-auto">
           <div className="bg-indigo-800 rounded-lg p-3 text-xs text-indigo-200 border border-indigo-700">
             <p className="font-bold mb-1">Ново!</p>
             Користете го визуелизаторот за веднаш да ги видите геометриските форми како се движат.
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto h-screen print:h-auto print:overflow-visible print:p-0">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl min-h-[90%] p-6 md:p-8 print:shadow-none print:max-w-none print:rounded-none">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;