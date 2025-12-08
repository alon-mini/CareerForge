
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, JobDetails, GeneratedAssets } from "../types";

// We use gemini-3-pro-preview for complex reasoning and content generation tasks
const MODEL_NAME = 'gemini-3-pro-preview';

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    resumeHtml: {
      type: Type.STRING,
      description: "A complete, stand-alone HTML document string for the tailored resume. It MUST be designed to fit exactly on one A4 page. It must include internal CSS for professional styling, layout (columns/grids), and print optimization."
    },
    coverLetter: {
      type: Type.STRING,
      description: "The text content of a professional cover letter tailored to the job. Plain text only, no markdown."
    },
    strategyStory: {
      type: Type.STRING,
      description: "A strategic narrative for the candidate. Plain text only, no markdown."
    },
    interviewPrep: {
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
    },
    emailKit: {
      type: Type.OBJECT,
      description: "Templates for communication.",
      properties: {
        linkedInConnection: { type: Type.STRING, description: "A short (<300 chars) connection note to a hiring manager." },
        followUpEmail: { type: Type.STRING, description: "A professional post-interview thank you email." }
      },
      required: ["linkedInConnection", "followUpEmail"]
    }
  },
  required: ["resumeHtml", "coverLetter", "strategyStory", "interviewPrep", "emailKit"]
};

export const generateApplicationAssets = async (
  profile: UserProfile,
  job: JobDetails,
  apiKey: string
): Promise<GeneratedAssets> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please log in again.");
  }

  const ai = new GoogleGenAI({ apiKey });

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
    
    ### 2. The Cover Letter
    - **Tone**: Conversational, authentic, direct, and human. 
    - **AVOID AI CLICHÉS**: Do NOT use words like "thrilled," "delighted," "tapestry," "uniquely positioned," "seamless," "realm," or "beacon."
    - **Style**: Write as if a senior professional is emailing a peer. Be confident but grounded.
    - **FORMATTING STRICTLY PLAIN TEXT**: 
        - Do NOT use Markdown formatting (NO bold \`**text**\`, NO italics \`_text_\`).
        - Do NOT use em-dashes (—). Use a simple hyphen (-) or a comma instead.
    - **Structure**:
      - Hook: Don't start with "I am writing to apply." Start with a strong statement about the field or the company's recent work.
      - Middle: Connect specific past wins (using numbers) to the future problems this role needs to solve.
      - Close: Short and actionable.
    
    ### 3. The Strategy Story
    - A guide for the candidate on how to present themselves. 
    - Explain the "bridge" between their past and this new role. 
    - Provide 3 key "Power Stories" to tell in the interview (STAR method).
    - **FORMATTING STRICTLY PLAIN TEXT**: 
        - Do NOT use Markdown formatting (NO bold \`**\`, NO headers \`#\`).
        - Do NOT use em-dashes (—). Use standard punctuation.
        - Use simple line breaks for paragraphs.

    ### 4. Interview Prep (5 Questions)
    - Generate 5 tough questions that this specific hiring manager might ask this specific candidate.
    - Mix of Behavioral ("Tell me about a time...") and Technical/Strategic.
    - Include the "Why": Why are they asking this?
    - Include the "Answer": Bullet points on what specific experience the candidate should cite.

    ### 5. Outreach Email Kit
    - **LinkedIn Note**: A short, non-spammy connection request (<300 characters).
    - **Follow-up Email**: A classy "Thank You" email to send 24 hours after the interview.

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
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a world-class career strategist. You prioritize concise, high-impact communication. You NEVER produce a resume longer than 1 page. You write cover letters that sound like real humans, not robots. You never use Markdown syntax in plain text fields.",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    const parsed = JSON.parse(text) as GeneratedAssets;
    return parsed;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * "LLM as a Judge" - Surgical Refinement Step
 * This function takes the already generated resume HTML and runs it through a second pass
 * to fix specific errors, cut-offs, or alignment issues.
 */
export const refineResume = async (
    currentHtml: string,
    job: JobDetails,
    profile: UserProfile,
    apiKey: string
): Promise<string> => {
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });

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
            model: MODEL_NAME, // Using the smartest model for the "Judge" role
            contents: prompt,
            config: {
                responseMimeType: "text/plain", // We just want raw HTML back
            }
        });

        let cleanedHtml = response.text || "";
        
        // Cleanup if the model wraps it in markdown despite instructions
        cleanedHtml = cleanedHtml.replace(/^```html/, '').replace(/```$/, '').trim();
        
        return cleanedHtml;

    } catch (error) {
        console.error("Refinement Error:", error);
        // Fallback: If refinement fails, return original to avoid crashing the flow
        return currentHtml;
    }
};
