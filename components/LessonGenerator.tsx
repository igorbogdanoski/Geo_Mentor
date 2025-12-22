import React, { useState } from 'react';
import { CURRICULUM } from '../constants';
import { generateLessonContent } from '../services/geminiService';
import { GradeLevel, GeneratedLesson } from '../types';
import Loading from './Loading';
import FormattedText from './FormattedText';

const LessonGenerator: React.FC = () => {
  // Hardcoded to Grade VII
  const grade = GradeLevel.VII;
  const [selectedTopic, setSelectedTopic] = useState<string>(CURRICULUM[0]?.name || '');
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setLesson(null);
    try {
      const result = await generateLessonContent(selectedTopic, grade);
      setLesson(result);
    } catch (err: any) {
      setError(err.message || "Се појави грешка при генерирање на лекцијата.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📚 Генератор на Лекции
            <span className="text-sm font-normal text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">VII Одд.</span>
        </h2>
        <p className="text-slate-500 mt-1">Изберете тема од геометријата за 7-мо одделение.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-xl">
        <div className="flex-1 w-full">
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

        <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors font-semibold shadow-sm"
        >
            {loading ? 'Се пишува...' : '✨ Генерирај'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <strong>Грешка:</strong> {error}
          <br/>
          <span className="text-sm opacity-80">Проверете дали е внесен API_KEY во Vercel Environment Variables.</span>
        </div>
      )}

      {loading && <Loading message="Наставникот ја подготвува лекцијата..." />}

      {lesson && !loading && (
        <div className="mt-8 space-y-6 animate-slide-up">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-indigo-50 to-white p-6 border-b border-indigo-100">
              <h3 className="text-2xl font-bold text-indigo-900 mb-4">{lesson.title}</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Цели:</span>
                <div className="flex flex-wrap gap-2">
                    {lesson.objectives.map((obj, idx) => (
                    <span key={idx} className="bg-indigo-100 text-indigo-800 text-xs px-3 py-1 rounded-full font-medium border border-indigo-200">
                        {obj}
                    </span>
                    ))}
                </div>
              </div>
            </div>
            <div className="p-8 text-slate-700 leading-relaxed">
              <FormattedText text={lesson.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonGenerator;