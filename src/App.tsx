import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import AppLayout from './layouts/AppLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Exams from './pages/Exams';
import ExamDetail from './pages/ExamDetail';
import Classrooms from './pages/Classrooms';
import SeatingPlans from './pages/SeatingPlans';
import SeatingPlanDetail from './pages/SeatingPlanDetail';
import GenerateSeatingPlan from './pages/GenerateSeatingPlan';

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="exams" element={<Exams />} />
          <Route path="exams/:id" element={<ExamDetail />} />
          <Route path="classrooms" element={<Classrooms />} />
          <Route path="seating-plans" element={<SeatingPlans />} />
          <Route path="seating-plans/:id" element={<SeatingPlanDetail />} />
          <Route path="seating-plans/generate" element={<GenerateSeatingPlan />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;