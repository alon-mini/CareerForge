# CareerForge - Desktop AI Job Search Assistant

CareerForge is a powerful, desktop-based command center designed to supercharge your job search. It transforms your professional "Source of Truth" (a markdown profile) and a target Job Description into a perfectly tailored application kit.

**Current Version:** 1.0.10

![CareerForge](logoc.png)

## 🚀 Key Features

### 🧠 Dual-Engine AI Architecture
*   **The Writer (`gemini-3-pro-preview`)**: Handles creative tasks like strategy narratives, cover letters, and resume drafting with high reasoning capabilities.
*   **The Judge (`gemini-2.5-flash`)**: A specialized "Surgical Refinement" agent that audits the generated resume HTML to fix formatting, ensure strict one-page fit, and scrub artifacts before you ever see it.

### 🎨 Visual & Functional Power
*   **Modular Generation**: You choose what to forge. Only need a CV? Uncheck the rest. Want the full kit? Select Cover Letter, Strategy, Interview Prep, and Outreach.
*   **Resume Skins**: Instantly transform the look of your resume with professional themes (Modern Blue, Executive Serif, Tech Minimalist) without regenerating content.
*   **WYSIWYG "Direct Edit"**: Don't like a phrase? Toggle "Edit Mode" and click directly on the resume preview to type changes. No code required.
*   **Native PDF Export**: Generate clean, print-ready PDFs for your Resume and Cover Letter.

### 🗂️ Application Tracker & History
*   **Interactive Pipeline**: Manage your applications from "Applied" to "Offer". Visual timeline allows you to mark stages as current or add custom steps (e.g., "Home Assignment").
*   **After-the-Fact Generation**: Did you only generate a Resume initially? Go to your History, open the application, and click "Generate Cover Letter" to create missing assets using the original context.
*   **Persistent Data**: Your profile, API key, and application history are stored securely in your operating system's standard application data folder (`%APPDATA%`), ensuring they survive updates.

---

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

3.  **Run in Development**
    ```bash
    npm run app
    ```

4.  **Package for Distribution (Windows)**
    To create a distributable `.exe` installer:
    ```bash
    npm run dist
    ```
    The installer will be located in the `release/` folder.

---

## 📖 User Guide

### 1. Authentication
Upon first launch, enter your **Gemini API Key**.
*   Check "Remember Key" to save it locally.

### 2. Setting Your Source of Truth
Your "Source of Truth" is a `.md` or `.txt` file containing your entire professional history.
*   **Upload**: Drag and drop your file.
*   **Persist**: Check **"Remember this profile"** to save it to disk so it auto-loads next time.

### 3. Forging an Application
1.  **Inputs**: Enter the Job Title, Company, and paste the Job Description.
2.  **Modular Options**: Check the boxes for the assets you want (Resume is mandatory; Cover Letter, Strategy, etc., are optional).
3.  **Generate**: Click "Generate Assets". The cinematic progress bar will track the drafting and refinement phases.

### 4. Review & Edit
*   **Skins**: Use the dropdown in the Resume tab to change the visual style.
*   **Edit Mode**: Toggle this to fix typos or rephrase content directly on the page.
*   **Download**: Export your documents to PDF.

### 5. Tracking & History
1.  **Save**: Click **"Application Sent"** to save the kit to the `Applications` tab.
2.  **History**: Navigate to the **"Applications"** tab to view your timeline.
3.  **Generate Missing**: If you skipped the Cover Letter earlier, you can click the "Generate Cover Letter" button inside the history card to create it now.

---

## 📂 Data Structure

The app stores all user data in `%APPDATA%\CareerForge` (Windows) to ensure persistence across updates.

*   `user_data/profile.md`: Your master profile.
*   `user_data/config.json`: Encrypted-like storage for API key.
*   `user_data/Kits/applications.json`: The database of all your applications and their current status.

## 🐛 Debugging

*   **Developer Tools**: Press `F12` at any time to open the console and view internal logs, API request status, and state changes.

---

*Built with React, Electron, TailwindCSS, and Google Gemini.*