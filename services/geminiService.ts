import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SYSTEM_PERSONA } from "../constants";
import { QuizQuestion, GeneratedLesson, GeneratedScenario } from "../types";

// Helper to safely get the API client
const getAiClient = () => {
  let apiKey = '';

  // 1. Check VITE Environment Variable (Standard way)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const envKey = import.meta.env.VITE_API_KEY;
      if (envKey && typeof envKey === 'string' && !envKey.includes("CLIENT_KEY")) {
          apiKey = envKey;
      }
    }
  } catch (e) {
    // Ignore execution environment errors if import.meta is not supported
  }

  // 2. Check LocalStorage (Emergency Fallback)
  if (!apiKey) {
      if (typeof window !== 'undefined' && window.localStorage) {
          const localKey = localStorage.getItem('gemini_api_key');
          if (localKey) {
              console.log("[GeminiService] Using API Key from LocalStorage");
              apiKey = localKey;
          }
      }
  }

  // 3. Fallback to process.env
  if (!apiKey && typeof process !== 'undefined' && process.env) {
    apiKey = process.env.VITE_API_KEY || process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY || '';
  }

  // Debugging logs (visible in F12 Console)
  if (!apiKey) {
      console.warn("[GeminiService] API Key missing in Env and LocalStorage.");
  } else {
      // Clean up key
      apiKey = apiKey.trim();
      if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
        apiKey = apiKey.slice(1, -1);
      }
  }

  if (!apiKey) {
    throw new Error("API Клучот недостасува! Ве молиме кликнете на '⚙️ API Подесувања' во менито и внесете го рачно.");
  }

  return new GoogleGenAI({ apiKey });
};

// Common instruction for Math Formatting
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
            const fixed = clean.replace(/\\/g, '/');
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
      Task: Create a JavaScript/HTML5 Canvas animation.
      
      INPUT: "${description}"
      
      SUPPORTED INPUT FORMATS:
      1. Natural Language (e.g., "Draw a triangle").
      2. Python/Manim Code.
      3. **ASYMPTOTE CODE**: If the user provides Asymptote code, TRANSLATE it into Canvas commands.
      
      The code will be executed inside a function body.
      Available variables: 
      - ctx (Context2D)
      - width, height (Canvas dimensions)
      - frame (Animation counter)
      - theme (Current visual theme)
      - showGrid (Boolean)
      - primaryColor (String, User selected color. USE THIS for main lines!)
      - registerShape(id, {type, x, y, r, w, h}, infoText) (Function to make shapes clickable)
      - drawRotated(x, y, angle, drawFunction) (Helper to rotate an object around (x,y) without displacing it)
      
      RULES:
      1. **COORDINATE LOGIC**: 
         - Center: cx = width/2, cy = height/2.
         - Scale: R = Math.min(width, height) * 0.45;
         - Use absolute coordinates like: x = cx + Math.cos(a)*R.
      2. **COLOR & STYLE**:
         - **ALWAYS** use 'primaryColor' for the main geometric object.
         - Use 'ctx.strokeStyle = primaryColor;'
         - Use 'ctx.lineWidth = 3;' for main lines.
      3. **INTERACTIVITY (MANDATORY)**:
         - **EVERY** Point, Circle, or Polygon you draw MUST be registered for click detection.
         - Example Point: \`registerShape('P1', {type:'point', x:cx, y:cy, r:10}, 'Center Point O');\`
         - Example Circle: \`registerShape('C1', {type:'circle', x:cx, y:cy, r:R}, 'Circle k');\`
      4. **ROTATION LOGIC (CRITICAL)**:
         - **DO NOT** manually calculate cos/sin for rotation of the entire shape.
         - **MUST USE** \`drawRotated(cx, cy, frame * 0.02, () => { ... drawing commands ... });\`
         - This ensures the object rotates perfectly around the pivot (cx, cy) without drifting.
      5. **CONSTRUCTION RULES**:
         - For bisectors/intersections, ensure Radius > 0.5 * distance so arcs intersect clearly.
      6. **STRICTLY JAVASCRIPT**: 
         - Output standard ES6 JavaScript. NO TypeScript.
      7. **ANIMATION LOOP**:
         - The canvas is automatically cleared. Draw the frame.
         
      IMPORTANT:
      - Output ONLY the code inside the function.
      - DO NOT wrap it in "function draw() { ... }".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Geometry Engine. You translate English, Python, and ASYMPTOTE code into HTML5 Canvas JavaScript. You prioritize mathematical accuracy, interactivity, and style customization.",
      }
    });

    let code = response.text || "";
    
    // 1. Remove Markdown
    code = code.replace(/```javascript/g, "").replace(/```js/g, "").replace(/```/g, "").trim();
    if(code.startsWith("javascript")) code = code.substring(10);
    
    // 2. Remove Function Wrapper if present
    if (code.includes("function draw") || code.includes("function")) {
        const firstBrace = code.indexOf("{");
        const lastBrace = code.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            code = code.substring(firstBrace + 1, lastBrace);
        }
    }
    
    return code.trim();
  } catch (error: any) {
    console.error("Canvas generation error:", error);
    throw new Error(error.message || "Failed to generate animation");
  }
};
