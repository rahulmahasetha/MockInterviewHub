import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './components/Home';
import Playground from './components/Playground';
import ScoreSummary from './components/ScoreSummary';
import Leaderboard from './components/Leaderboard';
import MockInterview from './components/MockInterview';
import ResumeAI from './components/ResumeAI';
import AdminPanel from './components/AdminPanel';
import ResumeBuilder from './components/ResumeBuilder';
import { UserProgressProvider } from './context/UserProgressContext';

export default function App() {
  return (
    <UserProgressProvider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/playground/:category" element={<Playground />} />
        <Route path="/summary" element={<ScoreSummary />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/interview" element={<MockInterview />} />
        <Route path="/resume-interview" element={<ResumeAI />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/resume-builder" element={<ResumeBuilder />} />
      </Routes>
    </UserProgressProvider>
  );
}