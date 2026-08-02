# MockInterviewHub (AI-Powered Career Preparation Platform)

MockInterviewHub is a comprehensive full-stack AI-powered career preparation platform designed to help candidates prepare for their dream jobs. By leveraging the power of Generative AI, the platform provides personalized resume analysis, dynamic mock interviews, real-time proctoring, and skill-gap detection.

## 🚀 Features

- **AI Resume Assistant:** Upload your resume (PDF) to instantly receive a detailed analysis, skill-gap detection, ATS scoring, and actionable feedback.
- **Dynamic Mock Interviews:** Take technical, behavioral, or resume-based mock interviews generated on the fly by AI.
- **Voice-Based Interviews:** Support for speech-to-text (STT) and text-to-speech (TTS) allowing users to practice verbal communication in a real interview setting.
- **Real-Time Proctoring:** A robust proctoring system that monitors tab switches, fullscreen enforcement, and camera/mic usage to simulate strict real-world testing environments.
- **MCQ Quizzes & Playground:** A gamified playground for taking Multiple Choice Question quizzes across various tech domains.
- **Leaderboard & Progression:** Earn coins, level up, and compete on the global leaderboard.
- **Instant AI Feedback:** Receive highly detailed feedback with strengths, areas for improvement, and ideal answers after every session.

## ⚙️ How It Works (Architecture Diagram)

```mermaid
graph TD
    User([User]) -->|Interacts with| Frontend[React.js Frontend]
    Frontend -->|REST API Calls| Backend[Node.js / Express Backend]
    
    subgraph Backend Services
        Backend -->|Extracts Text| PDFParser[Resume Parsing (pdf-parse)]
        Backend -->|Stores Data| DB[(MongoDB Database)]
        Backend -->|Generates Questions & Feedback| LLM[Google Gemini AI]
    end
    
    Frontend -->|Voice Input| STT[Web Speech API]
    Frontend -->|Voice Output| TTS[Web Speech API]
    Frontend -->|Proctoring Checks| Navigator[Browser APIs Camera/Mic/Tabs]
```

## 📂 File & Folder Structure

```text
MockInterviewHub/
├── backend/
│   ├── .env                 # Environment variables (API keys, DB URIs)
│   ├── server.js            # Main Express application & API routing
│   ├── package.json         # Backend dependencies
│   ├── utils/               # Helper utilities (resumeParser, RAG engine, etc.)
│   └── tests/               # Backend tests
├── frontend/
│   ├── package.json         # Frontend dependencies
│   ├── public/              # Static assets
│   └── src/
│       ├── App.js           # Main React App component
│       ├── index.css        # Global CSS and themes
│       ├── components/      # React components (MockInterview, ResumeAI, Playground, MiniProctoring, etc.)
│       ├── context/         # React Context (AuthContext, UserProgressContext)
│       └── services/        # API service layer (Axios)
└── README.md                # Project documentation
```

## 🛠️ Tech Stack

- **Frontend:** React.js, React Router, CSS3 (Custom Design System), Web Speech API.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB.
- **AI/LLM:** Google Gemini API (for RAG, Question Generation, and Evaluation).
- **Other Tools:** `pdf-parse` for resume processing.

## 🚀 Future Improvements

- **Video Analysis:** Implement AI analysis of facial expressions and body language during the mock interview.
- **Multi-Agent Interviewers:** Simulate panel interviews with different AI personas (e.g., technical interviewer + HR manager).
- **Code Editor Integration:** Add a live coding environment with syntax highlighting for technical coding interviews.
- **OAuth Integration:** Add Google/LinkedIn social login for a seamless onboarding experience.
- **Mobile Application:** Build a React Native app to allow users to practice interviews on the go.

## 👨‍💻 About the Developers

Built with passion by **Rahul Mahaseth** (with assistance from Antigravity AI). We aim to democratize access to high-quality career preparation tools for developers and job seekers worldwide. Feel free to contribute, open issues, or fork this repository!
