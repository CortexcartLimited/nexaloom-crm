
import { GoogleGenAI } from "@google/genai";
import { Lead, Interaction } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateEmailDraft = async (lead: Lead, context: string) => {
  const ai = createClient();
  if (!ai) return "Error: API Key missing.";

  const prompt = `
    You are an elite sales executive at Nexaloom, a cutting-edge multi-tenant CRM provider.
    Draft a professional, warm, and highly engaging email to a lead.
    
    Lead Profile:
    - Name: ${lead.name}
    - Company: ${lead.company}
    - Pipeline Stage: ${lead.status}
    - Estimated Value: $${lead.value}
    
    Context/Goal of this email: ${context}
    
    Guidelines:
    - Tone: Professional, helpful, and concise. Avoid "salesy" clichés.
    - Structure: Acknowledge their company (${lead.company}), state the purpose clearly, and provide a low-friction call to action.
    - Length: Max 120 words.
    - Format: Provide only the body text. Do not include a subject line or placeholders like [Your Name].
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate draft.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating content. Please check API configuration.";
  }
};

export const analyzeLeadPotential = async (lead: Lead, interactions: Interaction[]) => {
  const ai = createClient();
  if (!ai) return null;

  const history = interactions.map(i => `${i.date} [${i.type}]: ${i.notes}`).join('\n');
  const prompt = `
    Analyze this sales lead and provide a JSON response with a score (0-100) and a brief reasoning.
    
    Lead: ${lead.name} from ${lead.company}
    Value: $${lead.value}
    Status: ${lead.status}
    
    Interaction History:
    ${history}
    
    Return JSON format only:
    {
      "score": number,
      "reasoning": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Analysis Error", error);
    return null;
  }
};
