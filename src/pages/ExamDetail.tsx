import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  AlertCircle,
  BookOpen,
  Users,
  FileSpreadsheet,
  ArrowLeft,
  Trash2,
} from "lucide-react";

const API_URL = "http://localhost:5001/api";

interface Student {
  rollNumber: string;
  name: string;
}

interface Course {
  courseCode: string;
  courseTitle: string;
  semester: number;
  branch: string;
  students: Student[];
}

interface Exam {
  _id: string;
  name: string;
  date: string;
  courses: Course[];
  createdAt: string;
}

const ExamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState({
    courseCode: "",
    courseTitle: "",
    semester: 1,
    branch: "CSE",
  });
  const [fileUploaded, setFileUploaded] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [importingData, setImportingData] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [id]);

  const fetchExam = async () => {
    try {
      const response = await axios.get(`${API_URL}/exams/${id}`);
      setExam(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching exam:", error);
      toast.error("Failed to load exam details");
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFileUploaded(acceptedFiles[0]);
      }
    },
  });

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fileUploaded) {
      toast.error("Please upload an Excel file");
      return;
    }

    if (
      !importData.courseCode ||
      !importData.courseTitle ||
      !importData.semester
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploadingFile(true);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append("file", fileUploaded);

      // Upload file
      const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadingFile(false);
      setImportingData(true);

      // Import data from uploaded file
      const importResponse = await axios.post(`${API_URL}/exams/${id}/import`, {
        filePath: uploadResponse.data.filename,
        courseCode: importData.courseCode,
        courseTitle: importData.courseTitle,
        semester: importData.semester,
        branch: importData.branch,
      });

      toast.success("Course data imported successfully");
      setExam(importResponse.data);
      setIsImportModalOpen(false);
      setFileUploaded(null);
      setImportData({
        courseCode: "",
        courseTitle: "",
        semester: 1,
        branch: "CSE",
      });
    } catch (error) {
      console.error("Error importing course data:", error);
      toast.error("Failed to import course data");
    } finally {
      setUploadingFile(false);
      setImportingData(false);
    }
  };

  const handleDeleteCourse = async (courseCode: string) => {
    if (!exam) return;

    if (
      window.confirm(
        `Are you sure you want to delete the ${courseCode} course and all its students?`
      )
    ) {
      try {
        // Filter out the course to be deleted
        const updatedCourses = exam.courses.filter(
          (course) => course.courseCode !== courseCode
        );

        // Update the exam with the filtered courses
        const response = await axios.patch(`${API_URL}/exams/${id}`, {
          courses: updatedCourses,
        });

        setExam(response.data);
        toast.success(`Course ${courseCode} deleted successfully`);
      } catch (error) {
        console.error("Error deleting course:", error);
        toast.error("Failed to delete course");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Exam Not Found</h2>
        <p className="text-gray-600 mb-4">
          The exam you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/exams" className="text-indigo-600 hover:text-indigo-800">
          Go back to Exams
        </Link>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTotalStudents = () => {
    return exam.courses.reduce(
      (total, course) => total + course.students.length,
      0
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link
          to="/exams"
          className="text-indigo-600 hover:text-indigo-800 mr-4"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{exam.name}</h1>
      </div>

      {/* Exam Details Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {exam.name}
              </h2>
              <p className="text-gray-600">{formatDate(exam.date)}</p>
            </div>
            <div className="flex mt-4 md:mt-0">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200 mr-2"
              >
                <Upload size={18} className="mr-2" />
                Import Course Data
              </button>
              {exam.courses.length > 0 && (
                <Link
                  to="/seating-plans/generate"
                  state={{ examId: exam._id }}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
                >
                  <FileSpreadsheet size={18} className="mr-2" />
                  Generate Seating Plan
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center">
                <BookOpen className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-700">Courses</h3>
              </div>
              <p className="text-2xl font-semibold mt-2">
                {exam.courses.length}
              </p>
            </div>

            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-emerald-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-700">
                  Total Students
                </h3>
              </div>
              <p className="text-2xl font-semibold mt-2">
                {getTotalStudents()}
              </p>
            </div>

            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center">
                <FileSpreadsheet className="h-5 w-5 text-amber-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-700">
                  Seating Plans
                </h3>
              </div>
              <p className="text-2xl font-semibold mt-2">0</p>
            </div>
          </div>

          {/* Course List */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Courses</h3>

            {exam.courses.length > 0 ? (
              <div className="space-y-4">
                {exam.courses.map((course) => (
                  <div
                    key={course.courseCode}
                    className="bg-gray-50 p-4 rounded-lg"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800">
                          {course.courseCode} - {course.courseTitle}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Semester: {course.semester} | Branch: {course.branch}{" "}
                          | Students: {course.students.length}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteCourse(course.courseCode)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Course"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Student List */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th
                              scope="col"
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Roll Number
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Name
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {course.students.slice(0, 5).map((student, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {student.rollNumber}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {student.name}
                              </td>
                            </tr>
                          ))}
                          {course.students.length > 5 && (
                            <tr>
                              <td
                                colSpan={2}
                                className="px-4 py-2 text-center text-sm text-gray-500"
                              >
                                +{course.students.length - 5} more students
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-700">
                  No courses have been added yet. Click "Import Course Data" to
                  add courses and students.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Import Course Data</h2>
            <form onSubmit={handleImportSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="courseCode"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Course Code*
                </label>
                <input
                  type="text"
                  id="courseCode"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="CSL301"
                  value={importData.courseCode}
                  onChange={(e) =>
                    setImportData({ ...importData, courseCode: e.target.value })
                  }
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="courseTitle"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Course Title*
                </label>
                <input
                  type="text"
                  id="courseTitle"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Database Management Systems"
                  value={importData.courseTitle}
                  onChange={(e) =>
                    setImportData({
                      ...importData,
                      courseTitle: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="semester"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Semester*
                  </label>
                  <select
                    id="semester"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={importData.semester}
                    onChange={(e) =>
                      setImportData({
                        ...importData,
                        semester: parseInt(e.target.value),
                      })
                    }
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="branch"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Branch*
                  </label>
                  <select
                    id="branch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={importData.branch}
                    onChange={(e) =>
                      setImportData({ ...importData, branch: e.target.value })
                    }
                    required
                  >
                    <option value="CSE">CSE</option>
                    <option value="CSD">CSD (Data Science)</option>
                    <option value="CSH">CSH (HCI & Gaming)</option>
                    <option value="CSA">CSA (AI & ML)</option>
                    <option value="ECE">ECE</option>
                    <option value="ECI">ECI (IoT)</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excel File*
                </label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer ${
                    fileUploaded
                      ? "border-green-300 bg-green-50"
                      : "border-gray-300 hover:border-indigo-300"
                  }`}
                >
                  <input {...getInputProps()} />
                  {fileUploaded ? (
                    <div>
                      <p className="text-green-600 font-medium">
                        {fileUploaded.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Click or drag to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">
                        Click or drag and drop an Excel file here
                      </p>
                      <p className="text-xs text-gray-400">
                        The file should have columns for Roll Number and Name
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={uploadingFile || importingData}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                  disabled={uploadingFile || importingData || !fileUploaded}
                >
                  {(uploadingFile || importingData) && (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  )}
                  {uploadingFile
                    ? "Uploading..."
                    : importingData
                    ? "Importing..."
                    : "Import Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamDetail;
