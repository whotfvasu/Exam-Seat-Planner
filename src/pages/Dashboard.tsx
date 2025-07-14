import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FilePlus,
  MapPin,
  BookOpen,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";

const API_URL = "http://localhost:5001/api";

interface DashboardStats {
  exams: number;
  classrooms: number;
  seatingPlans: number;
  upcomingExams: {
    _id: string;
    name: string;
    date: string;
  }[];
  recentPlans: {
    _id: string;
    exam: {
      _id: string;
      name: string;
      date: string;
    };
    generatedDate: string;
    status: string;
  }[];
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [examsRes, classroomsRes, seatingPlansRes] = await Promise.all([
          axios.get(`${API_URL}/exams`),
          axios.get(`${API_URL}/classrooms`),
          axios.get(`${API_URL}/seating-plans`),
        ]);

        // Sort exams by date (upcoming first)
        const upcomingExams = examsRes.data
          .filter((exam: any) => new Date(exam.date) >= new Date())
          .sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .slice(0, 5);

        // Get recent seating plans
        const recentPlans = seatingPlansRes.data
          .sort(
            (a: any, b: any) =>
              new Date(b.generatedDate).getTime() -
              new Date(a.generatedDate).getTime()
          )
          .slice(0, 5);

        setStats({
          exams: examsRes.data.length,
          classrooms: classroomsRes.data.length,
          seatingPlans: seatingPlansRes.data.length,
          upcomingExams,
          recentPlans,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <Link
          to="/seating-plans/generate"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
        >
          <FilePlus size={20} className="mr-2" />
          Generate New Seating Plan
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center transition-transform duration-300 hover:scale-105 border-l-4 border-indigo-500">
          <div className="bg-indigo-100 p-3 rounded-full">
            <BookOpen className="h-8 w-8 text-indigo-600" />
          </div>
          <div className="ml-4">
            <h2 className="text-gray-500 text-sm font-medium">Total Exams</h2>
            <p className="text-2xl font-semibold text-gray-700">
              {stats?.exams || 0}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 flex items-center transition-transform duration-300 hover:scale-105 border-l-4 border-emerald-500">
          <div className="bg-emerald-100 p-3 rounded-full">
            <MapPin className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="ml-4">
            <h2 className="text-gray-500 text-sm font-medium">Classrooms</h2>
            <p className="text-2xl font-semibold text-gray-700">
              {stats?.classrooms || 0}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 flex items-center transition-transform duration-300 hover:scale-105 border-l-4 border-amber-500">
          <div className="bg-amber-100 p-3 rounded-full">
            <FileSpreadsheet className="h-8 w-8 text-amber-600" />
          </div>
          <div className="ml-4">
            <h2 className="text-gray-500 text-sm font-medium">Seating Plans</h2>
            <p className="text-2xl font-semibold text-gray-700">
              {stats?.seatingPlans || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Upcoming Exams
            </h2>
          </div>
          <div className="divide-y">
            {stats?.upcomingExams && stats.upcomingExams.length > 0 ? (
              stats.upcomingExams.map((exam) => (
                <div key={exam._id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {exam.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(exam.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <Link
                      to={`/exams/${exam._id}`}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center"
                    >
                      <span className="text-sm">View Details</span>
                      <ArrowRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-4 text-center text-gray-500">
                No upcoming exams scheduled
              </div>
            )}
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link
              to="/exams"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              View all exams
            </Link>
          </div>
        </div>

        {/* Recent Seating Plans */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Seating Plans
            </h2>
          </div>
          <div className="divide-y">
            {stats?.recentPlans && stats.recentPlans.length > 0 ? (
              stats.recentPlans.map((plan) => (
                <div key={plan._id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {plan.exam?.name || "Unnamed Exam"}
                      </h3>
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {new Date(plan.generatedDate).toLocaleDateString()}
                        </span>
                        <span
                          className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            plan.status === "published"
                              ? "bg-green-100 text-green-800"
                              : plan.status === "finalized"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {plan.status.charAt(0).toUpperCase() +
                            plan.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/seating-plans/${plan._id}`}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center"
                    >
                      <span className="text-sm">View Plan</span>
                      <ArrowRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-4 text-center text-gray-500">
                No seating plans created yet
              </div>
            )}
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link
              to="/seating-plans"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              View all seating plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
