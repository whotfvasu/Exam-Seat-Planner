import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

const API_URL = "http://localhost:5001/api";

interface Exam {
  _id: string;
  name: string;
  date: string;
  courses: {
    courseCode: string;
    courseTitle: string;
    students: {
      rollNumber: string;
      name: string;
    }[];
  }[];
}

interface Classroom {
  _id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  rows: number;
  columns: number;
}

const GenerateSeatingPlan: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    examId: location.state?.examId || "",
    classroomIds: [] as string[],
  });
  const [selectedClassrooms, setSelectedClassrooms] = useState<Classroom[]>([]);
  const [requiredSeats, setRequiredSeats] = useState(0);
  const [availableSeats, setAvailableSeats] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.examId) {
      calculateRequiredSeats();
    }
  }, [formData.examId, exams]);

  useEffect(() => {
    calculateAvailableSeats();
  }, [formData.classroomIds, classrooms]);

  const fetchData = async () => {
    try {
      const [examsRes, classroomsRes] = await Promise.all([
        axios.get(`${API_URL}/exams`),
        axios.get(`${API_URL}/classrooms`),
      ]);

      setExams(examsRes.data);
      setClassrooms(classroomsRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load required data");
      setLoading(false);
    }
  };

  const calculateRequiredSeats = () => {
    const exam = exams.find((e) => e._id === formData.examId);
    if (!exam) {
      setRequiredSeats(0);
      return;
    }

    const totalStudents = exam.courses.reduce((total, course) => {
      return total + course.students.length;
    }, 0);

    setRequiredSeats(totalStudents);
  };

  const calculateAvailableSeats = () => {
    const selected = classrooms.filter((classroom) =>
      formData.classroomIds.includes(classroom._id)
    );
    setSelectedClassrooms(selected);

    const totalSeats = selected.reduce((total, classroom) => {
      return total + classroom.capacity;
    }, 0);

    setAvailableSeats(totalSeats);
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      examId: e.target.value,
    });
  };

  const handleClassroomToggle = (classroomId: string) => {
    const newClassroomIds = formData.classroomIds.includes(classroomId)
      ? formData.classroomIds.filter((id) => id !== classroomId)
      : [...formData.classroomIds, classroomId];

    setFormData({
      ...formData,
      classroomIds: newClassroomIds,
    });
  };

  const handleSelectAllClassrooms = () => {
    setFormData({
      ...formData,
      classroomIds: classrooms.map((c) => c._id),
    });
  };

  const handleDeselectAllClassrooms = () => {
    setFormData({
      ...formData,
      classroomIds: [],
    });
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !formData.examId) {
      toast.error("Please select an exam");
      return;
    }

    if (currentStep === 2 && formData.classroomIds.length === 0) {
      toast.error("Please select at least one classroom");
      return;
    }

    if (currentStep === 2 && availableSeats < requiredSeats) {
      toast.error("Not enough seats! Please select more classrooms.");
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!formData.examId || formData.classroomIds.length === 0) {
      toast.error("Please complete all required fields");
      return;
    }

    setGenerating(true);

    try {
      const response = await axios.post(
        `${API_URL}/seating-plans/generate`,
        formData
      );
      toast.success("Seating plan generated successfully!");
      navigate(`/seating-plans/${response.data._id}`);
    } catch (error) {
      console.error("Error generating seating plan:", error);
      toast.error("Failed to generate seating plan");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const selectedExam = exams.find((exam) => exam._id === formData.examId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link
          to="/seating-plans"
          className="text-indigo-600 hover:text-indigo-800 mr-4"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">
          Generate Seating Plan
        </h1>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col items-center">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  currentStep >= 1
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {currentStep > 1 ? <CheckCircle size={20} /> : 1}
              </div>
              <span className="mt-2 text-sm font-medium text-gray-700">
                Select Exam
              </span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div
                className={`h-full ${
                  currentStep >= 2 ? "bg-indigo-600" : "bg-gray-200"
                }`}
              ></div>
            </div>
            <div className="flex flex-col items-center">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  currentStep >= 2
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {currentStep > 2 ? <CheckCircle size={20} /> : 2}
              </div>
              <span className="mt-2 text-sm font-medium text-gray-700">
                Select Classrooms
              </span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div
                className={`h-full ${
                  currentStep >= 3 ? "bg-indigo-600" : "bg-gray-200"
                }`}
              ></div>
            </div>
            <div className="flex flex-col items-center">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  currentStep >= 3
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                3
              </div>
              <span className="mt-2 text-sm font-medium text-gray-700">
                Confirm & Generate
              </span>
            </div>
          </div>

          {/* Step 1: Select Exam */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="examId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Exam*
                </label>
                <select
                  id="examId"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.examId}
                  onChange={handleExamChange}
                  required
                >
                  <option value="">-- Select an Exam --</option>
                  {exams.map((exam) => (
                    <option key={exam._id} value={exam._id}>
                      {exam.name} - {formatDate(exam.date)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedExam && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    {selectedExam.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {formatDate(selectedExam.date)}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Courses
                      </h4>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {selectedExam.courses.map((course) => (
                          <li key={course.courseCode}>
                            {course.courseCode} - {course.courseTitle}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Students
                      </h4>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {selectedExam.courses.map((course) => (
                          <li key={course.courseCode}>
                            {course.courseCode}: {course.students.length}{" "}
                            students
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        Total Students: {requiredSeats}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Classrooms */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">
                  Select Classrooms*
                </h3>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAllClassrooms}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllClassrooms}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Required Seats:{" "}
                    <span className="font-medium">{requiredSeats}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Available Seats:{" "}
                    <span
                      className={`font-medium ${
                        availableSeats < requiredSeats
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {availableSeats}
                    </span>
                  </p>
                </div>

                {availableSeats < requiredSeats ? (
                  <div className="bg-red-50 text-red-800 px-3 py-1 rounded-md text-sm">
                    Not enough seats! Select more classrooms.
                  </div>
                ) : (
                  <div className="bg-green-50 text-green-800 px-3 py-1 rounded-md text-sm">
                    Sufficient seats available!
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classrooms.map((classroom) => (
                  <div
                    key={classroom._id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.classroomIds.includes(classroom._id)
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                    onClick={() => handleClassroomToggle(classroom._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-md font-medium text-gray-800">
                          {classroom.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {classroom.building}, Floor {classroom.floor}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.classroomIds.includes(classroom._id)}
                        onChange={() => {}} // Handled by the div onClick
                        className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        Capacity:{" "}
                        <span className="font-medium">
                          {classroom.capacity} seats
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Layout:{" "}
                        <span className="font-medium">
                          {classroom.rows} rows × {classroom.columns} columns
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Confirm & Generate */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-800">
                Confirm Seating Plan Details
              </h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Exam</h4>
                  <p className="text-sm text-gray-900">{selectedExam?.name}</p>
                  <p className="text-sm text-gray-600">
                    {selectedExam ? formatDate(selectedExam.date) : ""}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Total Students
                  </h4>
                  <p className="text-sm text-gray-900">
                    {requiredSeats} students
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Selected Classrooms ({selectedClassrooms.length})
                  </h4>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedClassrooms.map((classroom) => (
                      <div
                        key={classroom._id}
                        className="bg-white rounded p-2 text-sm"
                      >
                        <p className="font-medium">{classroom.name}</p>
                        <p className="text-xs text-gray-600">
                          {classroom.capacity} seats ({classroom.rows}×
                          {classroom.columns})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">
                    Seating Capacity
                  </h4>
                  <p className="text-sm text-gray-900">
                    {availableSeats} available seats (
                    {Math.round((requiredSeats / availableSeats) * 100)}%
                    utilization)
                  </p>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-yellow-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        This will generate a seating plan that arranges students
                        column-wise, ensuring no students from the same course
                        sit adjacent to each other.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={handlePrevStep}
              className={`px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 ${
                currentStep === 1 ? "invisible" : ""
              }`}
            >
              <ArrowLeft size={16} className="inline mr-1" />
              Previous
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Next
                <ArrowRight size={16} className="inline ml-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                disabled={generating}
              >
                {generating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                )}
                {generating ? "Generating..." : "Generate Seating Plan"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateSeatingPlan;
