# StudyBuddy AI – Notes to Quiz Generator

An AI-powered study assistant that transforms study notes and PDF documents into useful revision materials using Google Gemini AI.

## About the Project

StudyBuddy AI helps students revise faster and understand difficult topics more easily. Students can paste their study notes or upload a PDF and use AI-powered tools to generate summaries, quizzes, flashcards, structured notes, and simple explanations.

The application is designed to make learning more interactive, organized, and efficient.

## Features

- **AI Quiz Maker:** Generate multiple-choice questions from study notes.
- **Quick Revision:** Create concise revision points, important facts, and key terms.
- **Flashcards Maker:** Generate interactive flashcards for active recall.
- **Notes Maker:** Organize study material into structured notes.
- **Notes Explainer:** Explain difficult concepts in simple language.
- **PDF Upload:** Extract text from PDF study materials.
- **Quiz Scoring:** Answer questions and track quiz performance.
- **Download Revision Materials:** Export generated revision content as text.

## Technologies Used

- React
- TypeScript
- Node.js
- Express.js
- Google Gemini API
- PDF.js
- Vite
- Tailwind CSS

## Getting Started

### Prerequisites

Install Node.js on your computer.

Download it from: https://nodejs.org/

### Installation

1. Download or extract the project ZIP.
2. Open the project folder in VS Code.
3. Open the terminal in the project directory.
4. Install the dependencies:

```bash
npm install
```

### Configure Gemini API

Create a file named `.env.local` in the project root directory.

Add the following:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Replace `your_gemini_api_key_here` with your Gemini API key.

Never share your API key or upload it to GitHub.

### Run the Application

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal to use StudyBuddy AI.

## How to Use

1. Open StudyBuddy AI.
2. Paste your study notes or upload a PDF.
3. Select the AI study tool you want to use.
4. Generate your revision materials.
5. Review the summary, quiz, flashcards, or explanations.
6. Practice and improve your understanding.

## Project Objective

The objective of StudyBuddy AI is to demonstrate how generative AI can support education by converting lengthy study materials into simple, interactive, and personalized revision resources.

## Future Enhancements

- Voice-based study assistant
- Personalized learning recommendations
- Progress tracking dashboard
- More quiz formats
- Multilingual study support

## Author

Developed as an individual college project for the AI Prototype or Model Creation assignment.

**Project Name:** StudyBuddy AI  
**Problem Statement:** AI Study Buddy – Notes to Quiz
