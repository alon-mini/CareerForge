# CareerForge - Desktop AI Job Search Assistant

CareerForge is a powerful, desktop-based tool designed to supercharge your job search. Powered by Google's `gemini-3-pro-preview` model, it takes your professional "Source of Truth" (a markdown profile) and a target Job Description to instantly generate a perfectly tailored application kit and helps you track it from start to finish.

![CareerForge](logoc.png)

## 🚀 Features

*   **Tailored Resumes**: Generates a one-page, A4-formatted HTML resume optimized for the specific role.
*   **Resume Skins**: Instantly transform the look of your resume with multiple professional themes (Modern Blue, Executive Serif, Tech Minimalist) without regenerating content.
*   **Surgical AI Refinement**: Uses a dual-stage AI process. First, a "Writer" agent drafts the content. Then, a "Judge" agent reviews the HTML to fix formatting errors, ensure strict one-page fit, and verify facts.
*   **Visual In-App Editing (WYSIWYG)**: Don't like a phrase? Toggle "Edit Mode" and simply click and type directly onto the resume preview to make changes. No coding required.
*   **Human-Centric Cover Letters**: Writes authentic, non-robotic cover letters that connect your past wins to future challenges.
*   **Strategy & Interview Prep**: Provides a narrative strategy ("The Story") and generates 5 tough, role-specific interview questions with answer guides.
*   **Interactive Application Tracker**: Manage your pipeline from "Applied" to "Offer". Track stages, add custom steps (e.g., "Home Assignment"), and visualize your progress.
*   **Persistent & Safe Data**: Your profile, API key, and application history are stored securely in your operating system's standard application data folder (`%APPDATA%`).
*   **PDF Generation**: Native PDF export for Resumes and Cover Letters.
*   **Developer Mode**: Press `F12` at any time to open the debug console and view internal logs and AI progress.

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
    This will build the React app and then start the Electron process.

4.  **Package for Distribution**
    To create a distributable `.exe` for Windows, run:
    ```bash
    npm run dist
    ```
    The installer will be located in the `release/` folder.

## 📖 Usage Guide

### 1. Authentication
Upon first launch, you will be asked for your **Gemini API Key**.
*   Check "Remember Key" to save it locally. You won't need to enter it again unless you log out.

### 2. Setting Your Source of Truth
Your "Source of Truth" is a `.md` (Markdown) or `.txt` file containing your entire professional history.
*   **Upload**: Drag and drop your file into the upload zone.
*   **Persist**: Check the box **"Remember this profile for future sessions"**.
    *   This saves your file to the application's secure data directory.
    *   On next boot, the app will automatically load this profile.

### 3. Forging an Application
1.  **Target Role**: Enter the Job Title (e.g., "Senior Frontend Engineer").
2.  **Company**: Enter the Company Name (e.g., "TechCorp").
3.  **Job Description**: Paste the full text of the job posting.
4.  **Generate**: Click "Generate Assets". The app will use a progress bar to show the status of the Analysis -> Drafting -> Refinement pipeline.

### 4. Review, Edit & Export
Once generation is complete:
*   **Resume Skins**: In the Resume tab, use the "Skin" dropdown to choose a style that fits the company culture.
*   **Edit Mode**: Toggle "Edit Mode" in the top right corner. The resume preview becomes interactive—click anywhere to type fixes. Toggle it off to save your changes.
*   **Export**: Click **"Download PDF"** to save your documents.

### 5. Tracking Your Application
1.  **Save the Kit**: Click **"Application Sent"** to save the entire kit to your local history.
2.  **Manage Your Pipeline**: Navigate to the **"Applications"** tab to see your visual timeline.
3.  **Track Progress**: Click stages to mark them as current, add custom stages, or update the overall status (Active, Rejected, Hired).

## 📂 Data Structure

The app stores all your data in your system's standard user data directory to ensure it persists between application updates.

You can find it here:
*   **Windows**: `C:\Users\<YourName>\AppData\Roaming\CareerForge`

Inside that folder, you will find:
*   `user_data/profile.md`: Your saved "Source of Truth" profile.
*   `user_data/config.json`: Your securely stored API key.
*   `user_data/Kits/applications.json`: A structured JSON file containing your entire application history.

## 🎨 Customization

The app uses **Tailwind CSS**. You can customize the color themes in `index.html` under the `tailwind.config` script object.

---

*Built with React, Electron, TailwindCSS, and Google Gemini.*