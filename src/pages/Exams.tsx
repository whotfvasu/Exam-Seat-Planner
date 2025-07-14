import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Trash2, Edit, FileText, Calendar } from "lucide-react";

const API_URL = "http://localhost:5001/api";

interface Exam {
  _id: string;
  name: string;
  date: string;
  courses: {
    courseCode: string;
    courseTitle: string;
    students: any[];
  }[];
  createdAt: string;
}

const Exams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExam, setNewExam] = useState({
    name: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await axios.get(`${API_URL}/exams`);
      setExams(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast.error("Failed to load exams");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newExam.name || !newExam.date) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await axios.post(`${API_URL}/exams`, newExam);
      toast.success("Exam created successfully");
      setIsModalOpen(false);
      setNewExam({
        name: "",
        date: new Date().toISOString().split("T")[0],
      });
      fetchExams();
    } catch (error) {
      console.error("Error creating exam:", error);
      toast.error("Failed to create exam");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this exam?")) {
      try {
        await axios.delete(`${API_URL}/exams/${id}`);
        toast.success("Exam deleted successfully");
        fetchExams();
      } catch (error) {
        console.error("Error deleting exam:", error);
        toast.error("Failed to delete exam");
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
        <h1 className="text-2xl font-bold text-gray-800">Exams</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
        >
          <Plus size={20} className="mr-2" />
          Add New Exam
        </button>
      </div>

      {/* Exams Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Exam Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Courses
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Students
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exams.length > 0 ? (
                exams.map((exam) => (
                  <tr key={exam._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {exam.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={16} className="mr-1 text-gray-400" />
                        {formatDate(exam.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {exam.courses.length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {exam.courses.reduce(
                          (total, course) => total + course.students.length,
                          0
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/exams/${exam._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Details"
                        >
                          <FileText size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(exam._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No exams found. Create your first exam by clicking the "Add
                    New Exam" button.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Exam</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Exam Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Midterm Examination 2025"
                  value={newExam.name}
                  onChange={(e) =>
                    setNewExam({ ...newExam, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Exam Date
                </label>
                <input
                  type="date"
                  id="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={newExam.date}
                  onChange={(e) =>
                    setNewExam({ ...newExam, date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
