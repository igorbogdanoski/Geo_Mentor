import React, { useState } from 'react';
import { CURRICULUM } from '../constants';
import { generateQuizQuestions } from '../services/geminiService';
import { GradeLevel, QuizQuestion } from '../types';
import Loading from './Loading';
import FormattedText from './FormattedText';

const QuizMaker: React.FC = () => {
  const grade = GradeLevel.VII;
  const [selectedTopic, setSelectedTopic] = useState<string>(CURRICULUM[0]?.name || '');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setShowResults(false);
    setSelectedAnswers([]);
    try {
      const result = await generateQuizQuestions(selectedTopic, grade);
      setQuestions(result);
      setSelectedAnswers(new Array(result.length).fill(-1));
    } catch (err: any) {
      setError(err.message || "Неуспешно генерирање на квиз.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (qIndex: number, optionIndex: number) => {
    if (showResults) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[qIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) score++;
    });
    return score;
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📝 Квиз Тестови
            <span className="text-sm font-normal text-teal-600 bg-teal-50 px-2 py-1 rounded-full">VII Одд.</span>
        </h2>
        <p className="text-slate-500 mt-1">Проверка на знаење за теми од 7-мо одделение.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-xl">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-slate-700 mb-1">Тема</label>
          <select 
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
          >
            {CURRICULUM.map(topic => (
              <option key={topic.id} value={topic.name}>{topic.name}</option>
            ))}
          </select>
        </div>
        <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-300 transition-colors font-semibold shadow-sm"
        >
            {loading ? 'Се подготвува...' : '🎲 Старт'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
           <strong>Грешка:</strong> {error}
        </div>
      )}

      {loading && <Loading message="Се генерираат прашања..." />}

      {!loading && questions.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          {questions.map((q, idx) => {
            const isCorrect = selectedAnswers[idx] === q.correctAnswerIndex;
            return (
              <div key={idx} className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 text-slate-800 text-lg">
                        <span className="font-bold text-slate-400 mr-2">{idx + 1}.</span> 
                        <div className="inline-block"><FormattedText text={q.question} /></div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-bold ml-4 uppercase tracking-wider ${
                        q.difficulty === 'Лесно' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'Средно' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                        {q.difficulty}
                    </span>
                </div>

                <div className="space-y-2 pl-6">
                  {q.options.map((opt, optIdx) => {
                    let btnClass = "w-full text-left p-3 rounded-lg border transition-all text-sm flex items-center gap-2 ";
                    
                    if (showResults) {
                        if (optIdx === q.correctAnswerIndex) {
                            btnClass += "bg-green-100 border-green-500 text-green-900 font-bold";
                        } else if (optIdx === selectedAnswers[idx]) {
                            btnClass += "bg-red-50 border-red-300 text-red-900";
                        } else {
                            btnClass += "bg-slate-50 border-slate-200 opacity-50";
                        }
                    } else {
                        if (selectedAnswers[idx] === optIdx) {
                            btnClass += "bg-teal-50 border-teal-500 text-teal-900 font-medium shadow-inner";
                        } else {
                            btnClass += "hover:bg-slate-50 border-slate-200";
                        }
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswerSelect(idx, optIdx)}
                        disabled={showResults}
                        className={btnClass}
                      >
                        <span className="font-mono font-bold text-slate-400">{String.fromCharCode(65 + optIdx)}.</span> 
                        <FormattedText text={opt} />
                      </button>
                    );
                  })}
                </div>

                {showResults && (
                  <div className={`mt-4 ml-6 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    <p className="font-bold mb-1">
                        {isCorrect ? '✅ Точен одговор!' : '❌ Неточен одговор.'}
                    </p>
                    <FormattedText text={q.explanation} />
                  </div>
                )}
              </div>
            );
          })}

          <div className="sticky bottom-6 bg-white/90 backdrop-blur p-4 shadow-2xl rounded-xl border border-slate-200 flex justify-between items-center z-10">
            {showResults ? (
                <div className="text-xl font-bold flex items-center gap-4">
                    <span>Резултат: <span className={calculateScore() > questions.length/2 ? "text-green-600" : "text-orange-600"}>{calculateScore()} / {questions.length}</span></span>
                    <button 
                        onClick={handleGenerate} 
                        className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        Нов Тест
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowResults(true)}
                    disabled={selectedAnswers.includes(-1)}
                    className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed font-bold shadow-lg transform active:scale-95 transition-all"
                >
                    Заврши и Провери
                </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizMaker;