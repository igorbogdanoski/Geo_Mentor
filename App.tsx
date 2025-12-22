import React, { useState } from 'react';
import Layout from './components/Layout';
import LessonGenerator from './components/LessonGenerator';
import QuizMaker from './components/QuizMaker';
import GeometryVisualizer from './components/GeometryVisualizer';
import ScenarioGenerator from './components/ScenarioGenerator';
import { AppMode } from './types';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.LESSON);

  const renderContent = () => {
    switch (currentMode) {
      case AppMode.LESSON:
        return <LessonGenerator />;
      case AppMode.SCENARIO:
        return <ScenarioGenerator />;
      case AppMode.QUIZ:
        return <QuizMaker />;
      case AppMode.VISUALIZER:
        return <GeometryVisualizer />;
      default:
        return <LessonGenerator />;
    }
  };

  return (
    <Layout currentMode={currentMode} setMode={setCurrentMode}>
      {renderContent()}
    </Layout>
  );
};

export default App;