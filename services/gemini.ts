
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, JobDetails, GeneratedAssets, GenerationOptions } from "../types";

// We use gemini-3-pro-preview for complex reasoning and content generation tasks (Creative Writer)
const GENERATOR_MODEL = 'gemini-3-pro-preview';

// We use gemini-2.5-flash for the "Judge" phase for maximum stability (no 503s) and speed
const JUDGE_MODEL = 'gemini-2.5-flash';

// Definitions for schema parts
const resumeSchemaPart = {
  type: Type.STRING,
  description: "A complete, stand-alone HTML document string for the tailored resume. It MUST be designed to fit exactly on one A4 page. It must include internal CSS for professional styling, layout (columns/grids), and print optimization."
};

const coverLetterSchemaPart = {
  type: Type.STRING,
  description: "The text content of a professional cover letter tailored to the job. Plain text only, no markdown."
};

const strategySchemaPart = {
  type: Type.STRING,
  description: "A strategic narrative for the candidate. Plain text only, no markdown."
};

const interviewSchemaPart = {
  type: Type.ARRAY,
  description: "A list of 5 interview questions tailored to the specific gaps or strengths of this candidate for this specific job.",
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      context: { type: Type.STRING, description: "Why the interviewer is asking this." },
      suggestedAnswer: { type: Type.STRING, description: "Key points the candidate should mention in their answer." }
    },
    required: ["question", "context", "suggestedAnswer"]
  }
};

const outreachSchemaPart = {
  type: Type.OBJECT,
  description: "Templates for communication.",
  properties: {
    linkedInConnection: { type: Type.STRING, description: "A short (<300 chars) connection note to a hiring manager." },
    followUpEmail: { type: Type.STRING, description: "A professional post-interview thank you email." }
  },
  required: ["linkedInConnection", "followUpEmail"]
};

export const generateApplicationAssets = async (
  profile: UserProfile,
  job: JobDetails,
  apiKey: string,
  options: GenerationOptions
): Promise<GeneratedAssets> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please log in again.");
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log(`Gemini: Generating Draft using ${GENERATOR_MODEL}...`);

  // Dynamically build Schema Properties
  const properties: Record<string, any> = {
    resumeHtml: resumeSchemaPart // Resume is always mandatory
  };
  const requiredFields = ["resumeHtml"];

  if (options.coverLetter) {
    properties.coverLetter = coverLetterSchemaPart;
    requiredFields.push("coverLetter");
  }
  if (options.strategy) {
    properties.strategyStory = strategySchemaPart;
    requiredFields.push("strategyStory");
  }
  if (options.interviewPrep) {
    properties.interviewPrep = interviewSchemaPart;
    requiredFields.push("interviewPrep");
  }
  if (options.outreach) {
    properties.emailKit = outreachSchemaPart;
    requiredFields.push("emailKit");
  }

  const dynamicSchema: Schema = {
    type: Type.OBJECT,
    properties: properties,
    required: requiredFields
  };

  const prompt = `
    You are an expert executive career coach and professional resume writer.
    
    I will provide you with a candidate's raw profile (in Markdown format) and a target Job Description.
    
    Your goal is to "power-up" this candidate's application by generating a comprehensive Job Search Kit.
    
    ### 1. The Tailored Resume (HTML)
    **CRITICAL REQUIREMENT**: The resume must be designed to fit on **EXACTLY ONE A4 PAGE** (210mm x 297mm). 
    
    **Content Strategy (STRICT BREVITY):**
    - **Summary**: Maximum 2-3 lines.
    - **Experience**: 
      - Focus strictly on the 2-3 most relevant roles. 
      - Limit these roles to 3-4 high-impact bullet points each.
      - For older or less relevant roles, use a single line (Title, Company, Dates) or omit them entirely.
    - **Skills**: Use a compact comma-separated list or a dense grid sidebar.
    - **IF CONTENT IS TOO LONG, CUT IT.** Do not allow spillover to page 2.
    
    **Technical/CSS Instructions:**
    - Output a full HTML document with \`<html>\`, \`<head>\`, and \`<body>\`.
    - Use internal CSS (\`<style>\`).
    - **Print Optimization**: 
        - Include \`@page { size: A4; margin: 0; }\`
        - Include \`-webkit-print-color-adjust: exact; print-color-adjust: exact;\` to ensure backgrounds print.
        - Ensure text is black (#000) or very dark grey for legibility.
    - **Page Container**: The main wrapper div MUST have:
      - \`width: 210mm;\`
      - \`height: 296mm;\` (Just under 297mm to be safe)
      - \`padding: 12mm;\` (Maximized space)
      - \`margin: 0 auto;\`
      - \`box-sizing: border-box;\`
      - \`overflow: hidden;\` (Prevents visual spillover)
      - \`background: white;\`
    - **Typography**: 
      - Body text: 9pt to 10.5pt (Keep it small but readable).
      - Headings: 12pt to 16pt.
      - Line-height: 1.2 to 1.3 (Tight).
    - **Layout**: Use a 2-column layout (Sidebar approx 30%, Main 70%) to make efficient use of vertical space.
    - **NO MARKDOWN**: Do NOT use markdown syntax (like **bold** or *italics*) inside the HTML. Use valid HTML tags only (<strong>, <em>).
    
    ${options.coverLetter ? `### 2. The Cover Letter
    - **Tone**: Conversational, authentic, direct, and human. 
    - **AVOID AI CLICHÉS**: Do NOT use words like "thrilled," "delighted," "tapestry," "uniquely positioned," "seamless," "realm," or "beacon."
    - **Structure**: Hook, Middle (Wins vs Problems), Close.` : ''}
    
    ${options.strategy ? `### 3. The Strategy Story
    - A guide for the candidate on how to present themselves. 
    - Provide 3 key "Power Stories" to tell in the interview (STAR method).` : ''}

    ${options.interviewPrep ? `### 4. Interview Prep (5 Questions)
    - Generate 5 tough questions that this specific hiring manager might ask.
    - Include the "Why" and the "Suggested Answer".` : ''}

    ${options.outreach ? `### 5. Outreach Email Kit
    - LinkedIn Connection Note (<300 chars)
    - Follow-up Email` : ''}

    ---
    **Candidate Profile (Markdown):**
    ${profile.content}

    **Target Job Title:**
    ${job.title}

    **Target Job Description:**
    ${job.description}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: GENERATOR_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: dynamicSchema,
        systemInstruction: "You are a world-class career strategist. You prioritize concise, high-impact communication. You NEVER produce a resume longer than 1 page. You write cover letters that sound like real humans, not robots. You never use Markdown syntax in plain text fields. You never use Markdown syntax inside HTML code.",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    const parsed = JSON.parse(text) as GeneratedAssets;
    console.log("Gemini: Draft Complete");
    return parsed;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Generates a specific missing asset (e.g. Cover Letter) for an existing application.
 */
export const generateSingleAsset = async (
    assetType: 'coverLetter' | 'strategyStory' | 'interviewPrep' | 'emailKit',
    profile: UserProfile,
    job: JobDetails,
    apiKey: string
): Promise<any> => {
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    let schema: any;
    let instruction = "";

    switch(assetType) {
        case 'coverLetter':
            schema = coverLetterSchemaPart;
            instruction = "Write a professional, human-sounding cover letter. No AI cliches. Plain text. No Markdown.";
            break;
        case 'strategyStory':
            schema = strategySchemaPart;
            instruction = "Write a strategic narrative and 3 power stories (STAR method). Plain text. No Markdown.";
            break;
        case 'interviewPrep':
            schema = interviewSchemaPart;
            instruction = "Generate 5 tough interview questions with context and suggested answers.";
            break;
        case 'emailKit':
            schema = outreachSchemaPart;
            instruction = "Write a LinkedIn connection note (<300 chars) and a post-interview thank you email.";
            break;
    }

    const prompt = `
        Based on the profile and job description below, generate the requested asset: ${assetType}.
        
        **Profile:** ${profile.content}
        **Job:** ${job.title} at ${job.company}
        **Description:** ${job.description}
    `;

    try {
        const response = await ai.models.generateContent({
            model: GENERATOR_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: instruction
            }
        });
        
        // Safe JSON parsing with markdown cleanup
        let cleanedJson = response.text || "";
        cleanedJson = cleanedJson.replace(/^```json/, '').replace(/```$/, '').trim();
        
        return JSON.parse(cleanedJson);
    } catch (error) {
        console.error("Single Asset Generation Error:", error);
        throw error;
    }
}

/**
 * "LLM as a Judge" - Surgical Refinement Step
 */
export const refineResume = async (
    currentHtml: string,
    job: JobDetails,
    profile: UserProfile,
    apiKey: string
): Promise<string> => {
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    console.log(`Gemini: Starting Surgical Refinement using ${JUDGE_MODEL}...`);

    const prompt = `
        You are a Senior Technical Recruiter and Quality Assurance Specialist acting as a "Judge" for a resume application.
        
        Your Goal: Surgically repair and improve the provided Resume HTML.
        
        **INPUT DATA:**
        1. **The Candidate's Master Profile**: To verify facts.
        2. **The Target Job Description**: To ensure keyword alignment.
        3. **The DRAFT Resume HTML**: The document you must fix.

        **YOUR AUDIT CHECKLIST (Fix these issues immediately):**
        1. **Integrity Check**: Does the HTML end abruptly? If so, complete the sentence and close all tags (</body>, </html>) properly.
        2. **Keyword Injection**: The Draft might have missed specific hard skills mentioned in the JD. Surgically replace generic terms with specific keywords from the JD where truthful.
        3. **Formatting**: Ensure the layout is preserved. Ensure strict one-page fit (A4). 
        4. **Hallucination Check**: Ensure the Draft didn't invent experience not present in the Master Profile.
        5. **Markdown Scrubbing**: Scan for and REMOVE any markdown syntax like **bold** or *italics* or ### headers inside the HTML. Replace them with valid HTML tags (<strong>, <em>, <h3>) or remove them if they break the code.
        
        **OUTPUT:**
        Return ONLY the corrected, valid, full HTML string. Do not wrap it in markdown code blocks. Do not add explanations. Just the code.
        
        ---
        **Master Profile:**
        ${profile.content}
        
        **Job Description:**
        ${job.description}
        
        **DRAFT HTML TO FIX:**
        ${currentHtml}
        ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: JUDGE_MODEL, 
            contents: prompt,
            config: {
                responseMimeType: "text/plain", 
            }
        });

        let cleanedHtml = response.text || "";
        
        // STRICT CLEANUP: Extract only the HTML part if the model chatted
        const htmlMatch = cleanedHtml.match(/(?:<!DOCTYPE html>|<html)[\s\S]*<\/html>/i);
        
        if (htmlMatch) {
            console.log("Gemini: Extracted valid HTML from response.");
            cleanedHtml = htmlMatch[0];
        } else {
             // Fallback cleanup if regex fails but markdown blocks exist
             cleanedHtml = cleanedHtml.replace(/^```html/, '').replace(/```$/, '').trim();
        }

        console.log("Gemini: Refinement Complete");
        return cleanedHtml;

    } catch (error) {
        console.error("Refinement Error:", error);
        return currentHtml;
    }
};
