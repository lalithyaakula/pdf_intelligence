# 📄 PDF Intelligence Platform

A full-stack, AI-powered document workspace and intelligence platform. Upload PDF documents, stream them directly in-browser, generate structured multi-point executive summaries via Google Gemini, perform grounded AI Q&A, and collaborate with real-time notes.


## ✨ Features

 **⚡ Direct PDF Binary Streaming**: Upload documents securely and stream PDF pages directly from PostgreSQL without relying on ephemeral server disk storage.
 **🤖 Grounded AI Q&A (Google Gemini)**: Ask technical or contextual questions about any uploaded document with responses strictly grounded to the PDF's content.
- **📑 Automatic Executive Summaries**: Automatically generates concise, structured executive summaries upon upload and displays them on both the dashboard card and the workspace.
- **📝 Real-time Notes & Collaboration**: Add notes, comments, and team feedback synced directly with Supabase PostgreSQL.
- **🔗 One-Click Document Sharing**: Share workspaces instantly via dedicated document links.
- **🔐 Secure Authentication**: Integrated session handling via NextAuth.js with support for guest exploration.


## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Database & ORM**: Supabase (PostgreSQL) with Prisma ORM
- **AI & LLM**: Google Gemini API (`gemini-2.5-flash` / `gemini-1.5-flash`)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS, Lucide React
- **Deployment**: Render





<img width="938" height="491" alt="Screenshot 2026-08-19 172827" src="https://github.com/user-attachments/assets/1214a2a5-2745-47c4-8bd0-b9bf5863bae0" />
Upload & Stream Securely

1.Drag and drop your PDF. Files are parsed instantly and streamed directly in-browser with zero local storage footprint.

2.Instant 4-Line Executive Summary

3.Google Gemini automatically analyzes key concepts, architectural models, and core takeaways the moment your document lands.

4.Ask Anything (Grounded AI Q&A)
Query complex formulas, definitions, or deep technical points with an AI assistant strictly grounded in your document's text.




<img width="939" height="491" alt="Screenshot 2026-08-19 173324" src="https://github.com/user-attachments/assets/0464c5db-e771-4454-8e26-d87f9e71cef7" />
1. Automatic Executive Summary Prompting
When a user uploads a PDF, the backend automatically builds a multimodal prompt combining the file's raw binary data with strict system instructions



<img width="936" height="490" alt="Screenshot 2026-08-19 173249" src="https://github.com/user-attachments/assets/4d0f4ffe-e19f-4aa1-9e61-f7cb83ab1f27" />
1.Direct Shareable Links: Clicking Share Document or Link copies a public workspace URL (/documents/[id]) that anyone with the link can open immediately in their browser.




## 📂 Project Structure
```text
pdf-intelligence/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts         # NextAuth authentication endpoints
│   │   └── documents/
│   │       ├── route.ts             # Document listing & upload with Gemini summary
│   │       └── [id]/
│   │           ├── route.ts         # Document metadata retrieval and deletion
│   │           ├── file/
│   │           │   └── route.ts     # In-browser binary PDF stream endpoint
│   │           ├── chat/
│   │           │   └── route.ts     # Grounded Gemini chat route
│   │           ├── comments/
│   │           │   └── route.ts     # Real-time team notes and comments API
│   │           └── summary/
│   │               └── route.ts     # On-demand summary generation endpoint
│   ├── dashboard/
│   │   └── page.tsx                 # Document library and upload dashboard
│   ├── documents/
│   │   └── [id]/
│   │       └── page.tsx             # Main workspace (PDF viewer, Gemini Q&A, Notes)
│   ├── layout.tsx                   # Root layout and session wrapper
│   └── page.tsx                     # Landing page
├── lib/
│   ├── auth.ts                      # NextAuth configuration and credentials logic
│   └── prisma.ts                    # Global Prisma client singleton
├── prisma/
│   └── schema.prisma                # Supabase PostgreSQL database schema
├── public/                          # Static assets and icons
├── .env.example                     # Environment variables template
├── package.json                     # Project dependencies and scripts
├── tailwind.config.ts               # Tailwind CSS configuration
└── tsconfig.json                    # TypeScript compiler options

⚙️ Prerequisites
Node.js: v18.18.0 or higher

npm or yarn / pnpm

Supabase Account: A PostgreSQL database instance

Google AI Studio Key: API Key with Gemini API access

🚀 How to Run Locally
1. Clone the Repository
Bash
git clone [https://github.com/lalithyaakula/pdf_intelligence.git](https://github.com/lalithyaakula/pdf_intelligence.git)
cd pdf_intelligence
2. Install Dependencies
Bash
npm install
3. Set Up Environment Variables
Create a .env file in the root directory:
Code snippet

4. Push Database Schema
Generate the Prisma client and push the schema to Supabase:

Bash
npx prisma generate
npx prisma db push
5. Start the Development Server
Bash
npm run dev
Open http://localhost:3000 in your browser.

🌐 Production Deployment (Render)
Create a new Web Service on Render and connect your GitHub repository.
Configure the deployment settings:
Environment: Node
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Add the environment variables (DATABASE_URL, DIRECT_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, GEMINI_API_KEY) in the Render Dashboard under Environment.


