export enum GradeLevel {
  VII = "VII"
}

export interface CurriculumTopic {
  id: string;
  name: string;
  grade: GradeLevel;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: 'Лесно' | 'Средно' | 'Тешко';
}

export interface GeneratedLesson {
  title: string;
  content: string; // Markdown supported
  objectives: string[];
}

export interface GeneratedScenario {
  topic: string;
  standards: string; // Стандарди за оценување
  content: string; // Содржина и поими
  introActivity: string; // Воведна активност
  mainActivity: string; // Главни активности
  finalActivity: string; // Завршна активност
  resources: string; // Средства
  assessment: string; // Следење на напредокот
  imagePrompt?: string; // Опис за автоматска илустрација
}

export enum AppMode {
  LESSON = 'LESSON',
  QUIZ = 'QUIZ',
  VISUALIZER = 'VISUALIZER',
  SCENARIO = 'SCENARIO'
}