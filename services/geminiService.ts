import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_PERSONA } from "../constants";
import { QuizQuestion, GeneratedLesson, GeneratedScenario } from "../types";

// Helper to safely get the API client
const getAiClient = () => {
  // 1. Try accessing via Vite standard (import.meta.env)
  // 2. Try accessing via Create React App standard (process.env.REACT_APP_)
  // 3. Fallback to standard process.env (Node/Server)
  
  let apiKey = '';

  try {
    // @ts-ignore - Vite specific
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_API_KEY;
    } 
    // Check standard process.env variants
    else if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.VITE_API_KEY || process.env.REACT_APP_API_KEY || process.env.API_KEY || '';
    }
  } catch (e) {
    console.warn("Environment variable access error", e);
  }

  if (!apiKey) {
    console.error("API_KEY is missing. Check Vercel Settings -> Environment Variables.");
    console.error("Ensure variable is named 'VITE_API_KEY' for Vite projects.");
    throw new Error("API Key is missing. Please configure VITE_API_KEY in Vercel settings.");
  }

  return new GoogleGenAI({ apiKey });
};

// Common instruction for Math Formatting - UPDATED TO FORBID LATEX IN JSON
const MATH_INSTRUCTION = `
ВАЖНО ЗА ФОРМАТИРАЊЕ И JSON (СТРОГИ ПРАВИЛА):
1. Враќај ЧИТЛИВ ТЕКСТ.
2. ЗАБРАНЕТО Е КОРИСТЕЊЕ НА LATEX СИНТАКСА ($...$, \\frac, \\pi, \\circ) во JSON вредностите.
3. ЗАБРАНЕТО Е КОРИСТЕЊЕ НА КОСИ ЦРТИ (BACKSLASHES \\) бидејќи тие го рушат JSON форматот.
4. Наместо LaTeX, користи UNICODE симболи и обичен текст:
   - π (Unicode) наместо \\pi
   - ° (Unicode) наместо ^\\circ
   - ² (Unicode) наместо ^2
   - ³ (Unicode) наместо ^3
   - √ (Unicode) наместо \\sqrt
   - Δ (Unicode) наместо \\triangle
   - α, β, γ (Unicode) за агли.
   - P = 2·r·π (обичен запис).
5. За болдирање користи **текст**.
`;

// Helper function to handle JSON parsing more robustly
const parseJsonSafe = (text: string) => {
    if (!text) return null;

    // 1. Remove Markdown code blocks if present
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(clean);
    } catch (e) {
        console.warn("Standard JSON parse failed, attempting fallback...", e);
        try {
            // 2. Fallback: If AI still messed up backslashes despite instructions
            const fixed = clean.replace(/\\/g, '/'); // Replace all backslashes with forward slashes as a last resort
            return JSON.parse(fixed);
        } catch (e2) {
            console.error("Auto-fix failed. Original text:", text);
            throw new Error("Неуспешно читање на одговорот од AI (Invalid JSON). Ве молиме обидете се повторно.");
        }
    }
};

export const generateLessonContent = async (topic: string, grade: string): Promise<GeneratedLesson> => {
  try {
    const ai = getAiClient();
    
    const prompt = `
      Креирај лекција за VII одделение на тема: "${topic}".
      Лекцијата треба да биде интерактивна и разбирлива.
      
      Структура:
      1. Наслов.
      2. Што ќе научиме (3 цели).
      3. Главен дел (Дефиниции, Својства, Примери). 
      4. Задача за вежбање.
      
      ${MATH_INSTRUCTION}

      Врати JSON:
      {
        "title": "String",
        "objectives": ["String", "String", "String"],
        "content": "String (Markdown + Unicode Math)"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PERSONA,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response content");
    
    return parseJsonSafe(text) as GeneratedLesson;
  } catch (error: any) {
    console.error("Lesson generation error:", error);
    throw new Error(error.message || "Failed to generate lesson");
  }
};

export const generateScenarioContent = async (topic: string): Promise<GeneratedScenario> => {
    try {
      const ai = getAiClient();
      
      const prompt = `
        Креирај детално Сценарио за час по математика за VII одделение на тема: "${topic}".
        Пополни ги полињата за да одговараат на официјалниот формат за подготовки.
        
        ${MATH_INSTRUCTION}
        
        Биди конкретен, методичен и јасен.
        Врати JSON формат со следните полиња (сите се string):
        - topic: Насловот на темата.
        - standards: Стандарди за оценување (Користи булети).
        - content: Содржина и нови поими кои се воведуваат.
        - introActivity: Опис на воведната активност (околу 10 мин).
        - mainActivity: Опис на главните активности, работа во групи, задачи (околу 20-25 мин). Користи Unicode за формули.
        - finalActivity: Завршна активност, рефлексија и домашна работа (околу 10 мин).
        - resources: Потребни средства и материјали.
        - assessment: Начини на следење на напредокот.
      `;
  
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PERSONA,
          responseMimeType: "application/json",
        }
      });
  
      const text = response.text;
      if (!text) throw new Error("No response content");
      
      return parseJsonSafe(text) as GeneratedScenario;
    } catch (error: any) {
      console.error("Scenario generation error:", error);
      throw new Error(error.message || "Failed to generate scenario");
    }
  };

export const generateQuizQuestions = async (topic: string, grade: string): Promise<QuizQuestion[]> => {
  try {
    const ai = getAiClient();

    const prompt = `
      Генерирај 5 прашања за геометрија, тема: "${topic}" (VII одделение).
      Прашањата треба да бидат соодветни за возраста.
      ${MATH_INSTRUCTION}
    `;

    const schema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswerIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ['Лесно', 'Средно', 'Тешко'] }
        },
        required: ['question', 'options', 'correctAnswerIndex', 'explanation', 'difficulty']
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PERSONA,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) return [];
    return parseJsonSafe(text) as QuizQuestion[];
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    throw new Error(error.message || "Failed to generate quiz");
  }
};

export const generateCanvasAnimation = async (description: string): Promise<string> => {
  try {
    const ai = getAiClient();

    const prompt = `
      Write a JavaScript function body for an HTML5 Canvas animation about: "${description}".
      
      The function signature must be:
      function draw(ctx, width, height, frame) { ... }
      
      Parameters:
      - ctx: CanvasRenderingContext2D
      - width: Number (canvas width)
      - height: Number (canvas height)
      - frame: Number (incrementing frame counter for animation)
      
      Requirements:
      1. Clear the canvas at the start: ctx.clearRect(0, 0, width, height);
      2. Draw geometry shapes clearly (lines, circles, triangles).
      3. Use 'frame' to create movement (e.g. rotation, translation).
      4. Use Math.sin/Math.cos for smooth geometric animations.
      5. Set stroke styles and fill styles (use bright colors).
      6. Do NOT include the function declaration wrapper, only the body code.
      7. Do NOT use external libraries. Use standard Canvas API.
      
      Example output format (string only):
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.arc(width/2, height/2, 50 + Math.sin(frame/20)*10, 0, Math.PI*2);
      ctx.stroke();
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert JavaScript Canvas developer. Return only valid raw JavaScript code for the function body.",
      }
    });

    // Strip markdown code blocks if present
    let code = response.text || "";
    code = code.replace(/```javascript/g, "").replace(/```js/g, "").replace(/```/g, "");
    return code;
  } catch (error: any) {
    console.error("Canvas generation error:", error);
    throw new Error(error.message || "Failed to generate animation");
  }
};
