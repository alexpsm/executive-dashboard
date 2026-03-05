Hi Antigravity! I need help setting up this Executive Dashboard project.

Please perform the following steps to get me up and running:

1.  **Environment Check**:
    - Check if `.env.local` exists.
    - If NOT, check for `.env.example`.
    - Read `.env.example` to understand which keys are needed.

2.  **Interactive Configuration**:
    - Ask me for the following keys ONE BY ONE (don't ask for all at once).
    - **IMPORTANT**: If I don't know where to get a key, please **explain step-by-step how to find it**.
        1.  **Supabase URL and Anon Key** (Project Settings -> API)
        2.  **ClickUp API Token** (Settings -> Apps)
        3.  **Google OAuth Client ID & Secret** (Google Cloud Console -> Credentials).
            - *Critical*: Remind me to add `http://localhost:3000/api/auth/google/callback` to the **Authorized redirect URIs**.
        4.  **OpenAI API Key** (Optional)
    - After I provide each key, save it to a new `.env.local` file (or update the existing one).

3.  **Installation**:
    - Run `npm install` to ensure all packages are ready.

4.  **Launch**:
    - Once configured, run `npm run build` followed by `npm start`.
    - Let me know when the dashboard is ready at http://localhost:3000.

Please start by checking my environment files!
