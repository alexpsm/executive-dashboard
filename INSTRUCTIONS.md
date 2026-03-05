# Executive Dashboard - Setup Instructions

Welcome! This package contains the Executive Dashboard source code.

## 1. Prerequisites
- **Node.js**: Install from [nodejs.org](https://nodejs.org/) (Version 18+ recommended).
- **Antigravity (Optional)**: If you are using the Antigravity AI agent, it can automate the entire setup for you.

## 2. Quick Setup with Antigravity
If you are using Antigravity, simply:
1.  Open the project folder in VS Code.
2.  Open the `SETUP_PROMPT.md` file.
3.  Copy the entire text from that file.
4.  Paste it into the Antigravity chat.
5.  Follow the AI's instructions to enter your API keys.

## 3. Manual Setup
If you prefer to set it up yourself:

1.  **Install Dependencies**:
    Open a terminal in this folder and run:
    ```bash
    npm install
    ```

2.  **Configure API Keys**:
    - Rename `.env.example` to `.env.local`.
    - Open `.env.local` and fill in your keys:
        - **Supabase**: URL and Keys from your Supabase project.
        - **ClickUp**: API Token from ClickUp settings.
        - **Google**:
            - Go to [Google Cloud Console](https://console.cloud.google.com).
            - **OAuth**: Create "OAuth Client ID" (Web Application).
                - **Redirect URI**: `http://localhost:3000/api/auth/google/callback`
            - **Service Account**: Create for Calendar/Gmail tasks.
        - **OpenAI**: API Key from OpenAI (if using cloud AI).

3.  **Run the App**:
    Double-click **`start-production.bat`** to build and start the application.
    OR run manually:
    ```bash
    npm run build
    npm start
    ```

4.  **Access**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Need Help?
Refer to `STARTUP-GUIDE.md` for more detailed information about the architecture and features.
