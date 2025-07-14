import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <footer className="bg-gray-800 text-white text-center py-4 text-sm">
        © {new Date().getFullYear()} IIIT Nagpur Exam Seat Planner. All rights reserved.
      </footer>
    </div>
  );
};

export default AppLayout;