
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { UserProfile, JobDetails, GeneratedAssets, GenerationOptions } from "../types";
import { fileSystemService } from "./fileSystem";

// We use Gemini 2.5 Pro for both roles as requested, leveraging its high reasoning capabilities and Thinking Config.
const GENERATOR_MODEL = 'gemini-2.5-pro';
const JUDGE_MODEL = 'gemini-2.5-pro';
// Fast model for parsing and simple drafting
const FAST_MODEL = 'gemini-2.5-flash';

// Pricing Estimates (USD per 1M tokens) - based on 1.5 Pro/Flash standard pricing as proxy
// Pro: Input $3.50, Output $10.50
// Flash: Input $0.075, Output $0.30
const PRICING: Record<string, { input: number; output: number }> = {
    [FAST_MODEL]: { input: 0.075, output: 0.30 }
};

// Assign models separately to avoid duplicate key errors in object literal if models are identical
PRICING[GENERATOR_MODEL] = { input: 3.50, output: 10.50 };
// Only assign judge if it's different, otherwise it's already covered or overwritten safely above
if (JUDGE_MODEL !== GENERATOR_MODEL) {
    PRICING[JUDGE_MODEL] = { input: 3.50, output: 10.50 };
}

// Helper to calculate cost and log usage
const logUsage = (model: string, usage: any, taskType: string) => {
    if (!usage) return;
    
    const inputT = usage.promptTokenCount || 0;
    const outputT = usage.candidatesTokenCount || 0;
    const totalT = usage.totalTokenCount || (inputT + outputT);
    
    const rates = PRICING[model] || { input: 0, output: 0 };
    const cost = ((inputT / 1000000) * rates.input) + ((outputT / 1000000) * rates.output);

    fileSystemService.saveUsageLog({
        timestamp: new Date().toISOString(),
        model,
        inputTokens: inputT,
        outputTokens: outputT,
        totalTokens: totalT,
        cost,
        taskType
    });
};

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

  // Dynamically calculate Thinking Budget based on workload
  // Base cost for Resume (Layout + Content): 4096 tokens
  let thinkingBudget = 4096;
  
  // Add budget for additional complex tasks
  if (options.coverLetter) thinkingBudget += 1024; // Tone matching & narrative
  if (options.strategy) thinkingBudget += 1024; // Bridging logic
  if (options.interviewPrep) thinkingBudget += 1024; // Predictive reasoning
  if (options.outreach) thinkingBudget += 512; // Short form drafting

  console.log(`Gemini: Generating Draft using ${GENERATOR_MODEL} with Thinking Budget: ${thinkingBudget}...`);

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
        thinkingConfig: { thinkingBudget: thinkingBudget },
        systemInstruction: "You are a world-class career strategist. You prioritize concise, high-impact communication. You NEVER produce a resume longer than 1 page. You write cover letters that sound like real humans, not robots. You never use Markdown syntax in plain text fields. You never use Markdown syntax inside HTML code.",
      },
    });

    // Log Usage
    logUsage(GENERATOR_MODEL, response.usageMetadata, "Draft Generation");

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
    
    // Single task thinking budget
    const SINGLE_TASK_BUDGET = 2048;

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
                thinkingConfig: { thinkingBudget: SINGLE_TASK_BUDGET },
                systemInstruction: instruction
            }
        });
        
        logUsage(GENERATOR_MODEL, response.usageMetadata, `Single Asset: ${assetType}`);

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
    
    // High thinking budget for code auditing and repair
    const JUDGE_THINKING_BUDGET = 4096;

    console.log(`Gemini: Starting Surgical Refinement using ${JUDGE_MODEL} (Budget: ${JUDGE_THINKING_BUDGET})...`);

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
        3. **Fluff Elimination (CRITICAL)**: Scan for ambiguous fluff like "results-oriented," "hard worker," "responsible for," "proven track record," or "seasoned professional." DELETE these phrases or replace them with specific actions/results. If a sentence adds no concrete value, remove it entirely.
        4. **Formatting**: Ensure the layout is preserved. Ensure strict one-page fit (A4). 
        5. **Hallucination Check**: Ensure the Draft didn't invent experience not present in the Master Profile.
        6. **Markdown Scrubbing**: Scan for and REMOVE any markdown syntax like **bold** or *italics* or ### headers inside the HTML. Replace them with valid HTML tags (<strong>, <em>, <h3>) or remove them if they break the code.
        
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
                thinkingConfig: { thinkingBudget: JUDGE_THINKING_BUDGET },
            }
        });

        logUsage(JUDGE_MODEL, response.usageMetadata, "Surgical Refinement");

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

/**
 * Parses raw text from a job posting using Regex to extract structured details.
 * Supports LinkedIn style postings in English and Hebrew.
 */
export const parseJobPosting = async (text: string, apiKey: string): Promise<JobDetails> => {
    // Note: apiKey is kept in signature for compatibility but currently unused for Regex
    
    // Regex logic to capture LinkedIn structure
    // Captures: 1. Company, 2. Title, 3. Description
    const linkedinRegex = /(?:[^\r\n]*logo[^\r\n]*|הלוגו\sשל\s[^\r\n]*)[\r\n]+(?<company>[^\r\n]+)[\r\n]+(?:Share|שיתוף)[^\r\n]*[\r\n]+(?:Show\smore\soptions|הצגת\sאפשרויות\sנוספות)[^\r\n]*[\r\n]+(?<title>[^\r\n]+)[\s\S]*?(?:About\sthe\sjob|אודות\sהמשרה)\s*(?<description>[\s\S]*?)(?=Job\ssearch\sfaster\swith\sPremium|About\sthe\scompany|השיגו\sאת\sהיעדים\sשלכם\sמהר\sיותר\sעם\sPremium|על\sאודות\sהחברה)/i;

    const match = text.match(linkedinRegex);

    if (match && match.groups) {
        console.log("Smart Paste: Regex Match Successful");
        return {
            company: match.groups.company?.trim() || "",
            title: match.groups.title?.trim() || "",
            description: match.groups.description?.trim() || ""
        };
    }

    console.log("Smart Paste: Regex failed, falling back to full text description.");
    // Fallback: If structure doesn't match, at least preserve the text in description so user isn't blank
    return {
        company: "",
        title: "",
        description: text
    };
}

/**
 * Generates a structured Master Profile based on user wizard answers.
 */
export const generateMasterProfile = async (answers: Record<string, string>, apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        You are a professional resume writer. 
        Take the user's raw answers from a questionnaire and compile them into a strictly structured "Master Resume" Markdown document.

        **User Answers:**
        ${JSON.stringify(answers, null, 2)}

        **REQUIRED OUTPUT FORMAT (Markdown):**
        
        # [User Name]

        ## 1. Core Identity & Value Proposition
        * **Primary Profile:** [Job Title] & [Secondary Skillset] with a background in [Background].
        * **Key Differentiator:** [Adjective] profile combining [Skill A] with [Skill B].
        * **Focus:** Leveraging [Methodology] to build [Solutions], analyze [Data], and automate [Workflows].

        ---

        ## 2. Technical Skills Inventory

        ### [Skill Category 1]
        * **Core Methodology:** [Method Name]—[Explanation].
        * **[Skill/Process Name]:** [Description].
        * **[Tool/Implementation]:** [Tools used].
        * **Models/Tech Used:** [List].

        ### [Skill Category 2]
        * **Languages:** [List].
        * **[Specialized Skill]:** [Description].

        ### [Skill Category 3]
        * **Architecture:** [Details].
        * **Tools:** [List].

        ---

        ## 3. Professional Experience

        (Repeat for each role mentioned)
        ### **[Company Name]** | *[Job Title]*
        *[Start Date] – [End Date]*
        *[One-sentence summary of role]*

        * **[Key Responsibility]:** Action verb + result.
        * **[Technical Implementation]:** 
            * Designed [Protocol].
            * Implemented [Workflow].
        * **[Leadership/Metric]:** Achieved [Metric].

        ---

        ## 4. Academic Research & Education

        ### **[Degree Name]**
        *Focus: [Field]*
        *[Year]*

        ---

        ## 5. Languages
        * **[Language]:** [Level].

        ## 6. Information
        * **Linkedin:** [URL]
        * **Mobile:** [Phone]
        * **Email:** [Email]
        * **Portfolio:** [URL]
    `;

    try {
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "text/plain",
            }
        });
        
        logUsage(FAST_MODEL, response.usageMetadata, "Master Profile Generation");

        return response.text || "";
    } catch (error) {
        console.error("Master Profile Generation Error", error);
        throw new Error("Failed to generate master profile.");
    }
}
