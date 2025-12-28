📄 Legal Document Analyzer & Summarizer

Legal Document Analyzer
<table> <tr> <td> A full-stack AI-powered web application that analyzes legal contracts (PDF/DOCX), extracts clauses, identifies risks, generates executive summaries, and exports professional PDF reports. It helps users quickly understand complex legal documents and make informed decisions. </td> </tr> </table>
🚀 Demo

🔗 GitHub Repository:
https://github.com/thanujaa9/Legal-Document-Analyzer

(Live deployment optional – demo shown via local setup & screenshots)

🖥️ Site Preview
🔐 Login & Signup

Secure authentication using JWT.

📤 Upload Legal Documents

Supports PDF & DOCX files (up to 50MB).

⏳ Analysis in Progress

Real-time progress tracking during AI analysis.

✅ Ready to Analyze

Uploaded document waiting for AI processing.

📊 Analysis Overview

Executive summary, risk score, and key findings.

📑 Clause Analysis

Extracted clauses with risk levels and notes.

⚠️ Risk Assessment

Categorized risks with recommendations.

📚 Document Library

Search, filter, re-analyze, export PDF, download & delete documents.

📱 Responsive Design

The application works smoothly across:

💻 Desktop

📱 Mobile

📟 Tablet

UI is optimized for readability and usability.

🎯 Key Features

📄 Upload legal documents (PDF / DOCX)

🤖 AI-powered legal analysis using OpenAI

📝 Clause extraction & categorization

⚠️ Risk identification with severity levels

📌 Add notes to individual clauses

📊 Overall document risk score

⏳ Real-time analysis progress bar

🔄 Re-analyze with Force Refresh

⚡ Redis caching for fast results

🧵 Bull Queue for background processing

📥 Export professional PDF reports

🔐 Secure authentication (JWT)

🛠️ Built With
Frontend

React.js

React Router

CSS3

JavaScript (ES6)

Backend

Node.js

Express.js

MongoDB + GridFS

Redis (Caching)

Bull Queue (Background jobs)

AI & Processing

OpenAI GPT-4o-mini

PDFKit

pdf-parse

mammoth (DOCX)

🧩 System Architecture
React Frontend
      ↓
Express REST API
      ↓
MongoDB + GridFS
      ↓
Redis Cache
      ↓
Bull Queue
      ↓
OpenAI API

⚡ Performance Optimization

Redis Cache

Cached analysis served in <100ms

Bull Queue

Prevents OpenAI rate-limit crashes

Handles re-analysis safely

Force Refresh

Allows re-analysis while bypassing cache

🧪 OpenAI Rate Limit Handling

To avoid API rate-limit errors:

Requests are queued using Bull

Re-analysis is processed sequentially

Cached results are reused when possible

This ensures:

Stable performance

No API crashes

Smooth user experience

🏗️ Project Structure
legal-document-analyzer/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── services/
│   ├── workers/
│   ├── config/
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── pages/
│   ├── services/
│   └── App.jsx
│
└── legal doc ss/
    └── screenshots

▶️ Usage
Development Setup
git clone https://github.com/thanujaa9/Legal-Document-Analyzer.git
cd Legal-Document-Analyzer

Backend
cd backend
npm install
npm start

Frontend
cd frontend
npm install
npm start

🧠 What This Project Demonstrates

Full-stack MERN development

AI integration with OpenAI

Secure authentication

File handling with GridFS

Redis caching strategies

Background job processing

Clean UI/UX design

Production-ready architecture

👩‍💻 Developer

Thanuja Sekuri

GitHub: https://github.com/thanujaa9

Role: Full Stack Developer (MERN)
