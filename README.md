# CareerForge - Desktop AI Job Search Assistant

CareerForge is a powerful, desktop-based tool designed to supercharge your job search. Powered by Google's `gemini-3-pro-preview` model, it takes your professional "Source of Truth" (a markdown profile) and a target Job Description to instantly generate a perfectly tailored application kit and helps you track it from start to finish.

![CareerForge](logoc.png)

## 🚀 Features

*   **Tailored Resumes**: Generates a one-page, A4-formatted HTML resume optimized for the specific role.
*   **Human-Centric Cover Letters**: Writes authentic, non-robotic cover letters that connect your past wins to future challenges.
*   **Strategy & Interview Prep**: Provides a narrative strategy ("The Story") and generates 5 tough, role-specific interview questions with answer guides.
*   **Outreach Kit**: Pre-written LinkedIn connection notes and post-interview thank you emails.
*   **Interactive Application Tracker**: Don't just save your applications—manage them. Track each opportunity through a customizable, visual timeline from "Applied" to "Offer". Add custom stages, mark progress, and see your entire pipeline at a glance.
*   **Persistent & Safe Data**: Your profile, API key, and application history are stored securely in your operating system's standard application data folder. This means your data is safe and persists even when you update the application.
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
4.  **Generate**: Click "Generate Assets".

### 4. Review & Export
Once generation is complete (usually 10-20 seconds), explore the tabs:
*   **Resume**: View the generated HTML resume. Click **"Download PDF"** to save it.
*   **Cover Letter**: Review the text. Click **"Download PDF"** for a print-ready version or copy the text.
*   **Strategy**: Read your narrative arc and talking points.
*   **Interview Prep**: Study the 5 generated questions and answer strategies.
*   **Outreach**: Copy the LinkedIn note or Thank You email templates.

### 5. Tracking Your Application
1.  **Save the Kit**: After generating assets for a role you've applied to, click the **"Application Sent"** button. This saves the entire kit to your local history.
2.  **Manage Your Pipeline**: Navigate to the **"Applications"** tab. Here you'll find all your saved applications.
3.  **Track Progress**: Click on an application to expand its details. You'll see a visual timeline of your recruitment process. Click on a stage (e.g., "Phone Screen") to mark it as your current step.
4.  **Customize Stages**: Use the "Add custom stage" button to add unique steps to your process, like "Home Assignment" or "Team Fit Interview".
5.  **Update Status**: Quickly update the overall status of an application to "Terminated", "Offer/Hired", or "Ghosted" using the status controls.

## 📂 Data Structure

The app stores all your data in your system's standard user data directory to ensure it persists between application updates.

You can find it here:
*   **Windows**: `C:\Users\<YourName>\AppData\Roaming\CareerForge`

Inside that folder, you will find:
*   `user_data/profile.md`: Your saved "Source of Truth" profile.
*   `user_data/config.json`: Your securely stored API key (if you chose "Remember Key").
*   `user_data/Kits/applications.json`: A structured JSON file containing your entire application history, including all generated assets and tracker statuses.

## 🎨 Customization

The app uses **Tailwind CSS**. You can customize the color themes in `index.html` under the `tailwind.config` script object.

---

*Built with React, Electron, TailwindCSS, and Google Gemini.*