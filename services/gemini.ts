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
      description: "The text content of a professional cover letter tailored to the job."
    },
    strategyStory: {
      type: Type.STRING,
      description: "A strategic narrative for the candidate. This should explain how to frame their past experience to fit this new role, key talking points for interviews, and a 'hero's journey' pitch."
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
    - **Structure**:
      - Hook: Don't start with "I am writing to apply." Start with a strong statement about the field or the company's recent work.
      - Middle: Connect specific past wins (using numbers) to the future problems this role needs to solve.
      - Close: Short and actionable.
    
    ### 3. The Strategy Story
    - A guide for the candidate on how to present themselves. 
    - Explain the "bridge" between their past and this new role. 
    - Provide 3 key "Power Stories" to tell in the interview (STAR method).

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
        systemInstruction: "You are a world-class career strategist. You prioritize concise, high-impact communication. You NEVER produce a resume longer than 1 page. You write cover letters that sound like real humans, not robots.",
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