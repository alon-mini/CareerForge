# CareerForge - Desktop AI Job Search Assistant

CareerForge is a powerful, desktop-based tool designed to supercharge your job search. Powered by Google's Gemini 2.5 Pro, it takes your professional "Source of Truth" (a markdown profile) and a target Job Description to instantly generate a perfectly tailored application kit.

![CareerForge](logoc.png)

## 🚀 Features

*   **Tailored Resumes**: Generates a one-page, A4-formatted HTML resume optimized for the specific role.
*   **Human-Centric Cover Letters**: Writes authentic, non-robotic cover letters that connect your past wins to future challenges.
*   **Strategy & Interview Prep**: Provides a narrative strategy ("The Story") and generates 5 tough, role-specific interview questions with answer guides.
*   **Outreach Kit**: Pre-written LinkedIn connection notes and post-interview thank you emails.
*   **Local Data Persistence**: 
    *   Save your "Source of Truth" profile to disk so you never have to re-upload it.
    *   Securely stores your API Key locally.
*   **Application History**: Tracks every application you send. View past resumes and cover letters in a dedicated "Applications" tab.
*   **Dark Mode**: A sleek, high-contrast UI designed for focused work.
*   **PDF Generation**: Native PDF export for Resumes and Cover Letters.

## 🛠 Prerequisites

*   **Node.js**: (Version 16 or higher recommended)
*   **Google Gemini API Key**: You can get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/careerforge.git
    cd careerforge
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Build & Run (Development)**
    Since this is an Electron app wrapping a React frontend, you typically need to build the React app and then start Electron.
    
    ```bash
    # If using a standard script setup:
    npm run electron:dev
    ```
    
    *Note: Ensure your `package.json` is configured to point "main" to `main.js`.*

## 📖 Usage Guide

### 1. Authentication
Upon first launch, you will be asked for your **Gemini API Key**.
*   Check "Remember Key" to save it locally. You won't need to enter it again unless you log out.

### 2. Setting Your Source of Truth
Your "Source of Truth" is a `.md` (Markdown) or `.txt` file containing your entire professional history.
*   **Upload**: Drag and drop your file into the upload zone.
*   **Persist**: Check the box **"Remember this profile for future sessions"**.
    *   This saves your file to a `user_data/` folder in the app's root directory.
    *   On next boot, the app will automatically load this profile.

### 3. Forging an Application
1.  **Target Role**: Enter the Job Title (e.g., "Senior Frontend Engineer").
2.  **Company**: Enter the Company Name (e.g., "TechCorp").
3.  **Job Description**: Paste the full text of the job posting.
4.  **Generate**: Click "Generate Assets".

### 4. Review & Export
Once generation is complete (usually 10-20 seconds), explore the tabs:
*   **Resume**: View the generated HTML resume. Click **"Download PDF"** to save it.
*   **Cover Letter**: Review the text. Click **"Download PDF"** for a print-ready version or copy the text.
*   **Strategy**: Read your narrative arc and talking points.
*   **Interview Prep**: Study the 5 generated questions and answer strategies.
*   **Outreach**: Copy the LinkedIn note or Thank You email templates.

### 5. Tracking History
*   If you decide to apply, click the **"Application Sent"** button in the top right corner of the results view.
*   This saves the entire kit to a local `.csv` file.
*   Navigate to the **"Applications"** tab in the top menu to view your history. Click on any row to expand and see the full kit generated for that specific application.

## 📂 Data Structure

The app creates a `user_data` folder in the root directory to store your local data:

*   `user_data/profile.md`: Your saved source of truth.
*   `user_data/applications.csv`: A database of your past applications (content is Base64 encoded for safety).

## 🎨 Customization

The app uses **Tailwind CSS**. You can customize the color themes in `index.html` under the `tailwind.config` script object.

---

*Built with React, Electron, TailwindCSS, and Google Gemini.*
