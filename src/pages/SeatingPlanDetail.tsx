import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Download,
  Printer,
  Book,
  Users,
  FileSpreadsheet,
  Building,
  CheckCircle,
  AlertCircle,
  Clock,
  Save,
  Search,
  ArrowUpDown,
} from "lucide-react";

const API_URL = "http://localhost:5001/api";

interface Student {
  rollNumber: string;
  name: string;
  courseCode: string;
}

interface Seat {
  isOccupied: boolean;
  student: Student | null;
}

interface ClassroomAllocation {
  classroom: {
    _id: string;
    name: string;
    building: string;
    floor: number;
    capacity: number;
    rows: number;
    columns: number;
  };
  seatMatrix: Seat[][];
}

interface Statistics {
  totalStudents: number;
  totalSeats: number;
  courseCounts: Record<string, number>;
  classroomUtilization: {
    classroom: string;
    utilization: number;
  }[];
}

interface SeatingPlan {
  _id: string;
  exam: {
    _id: string;
    name: string;
    date: string;
    courses: {
      courseCode: string;
      courseTitle: string;
    }[];
  };
  generatedDate: string;
  status: "draft" | "finalized" | "published";
  classroomAllocations: ClassroomAllocation[];
  statistics: Statistics;
}

interface EditingState {
  isEditing: boolean;
  selectedSeat: {
    rowIndex: number;
    colIndex: number;
    classroomId: string;
  } | null;
  hasUnsavedChanges: boolean;
}

const SeatingPlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [seatingPlan, setSeatingPlan] = useState<SeatingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState<string | null>(
    null
  );
  const [courseColorMap, setCourseColorMap] = useState<Record<string, string>>(
    {}
  );
  const [editingState, setEditingState] = useState<EditingState>({
    isEditing: false,
    selectedSeat: null,
    hasUnsavedChanges: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    student: Student;
    classroom: string;
    row: number;
    col: number;
  }[]>([]);
  const [swapMode, setSwapMode] = useState(false);
  const [firstSeatSelection, setFirstSeatSelection] = useState<{
    student: Student;
    classroom: string;
    row: number;
    col: number;
  } | null>(null);

  const colors = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-purple-100 text-purple-800",
    "bg-yellow-100 text-yellow-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
    "bg-red-100 text-red-800",
    "bg-orange-100 text-orange-800",
    "bg-teal-100 text-teal-800",
    "bg-cyan-100 text-cyan-800",
  ];

  useEffect(() => {
    fetchSeatingPlan();
  }, [id]);

  useEffect(() => {
    if (seatingPlan && seatingPlan.classroomAllocations.length > 0) {
      setSelectedClassroom(seatingPlan.classroomAllocations[0].classroom._id);

      // Create a color map for the courses
      const courseCodes = Object.keys(
        seatingPlan.statistics.courseCounts || {}
      );
      const newColorMap: Record<string, string> = {};

      courseCodes.forEach((courseCode, index) => {
        newColorMap[courseCode] = colors[index % colors.length];
      });

      setCourseColorMap(newColorMap);
    }
  }, [seatingPlan]);

  const fetchSeatingPlan = async () => {
    try {
      const response = await axios.get(`${API_URL}/seating-plans/${id}`);
      setSeatingPlan(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching seating plan:", error);
      toast.error("Failed to load seating plan details");
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Generate the export file
      await axios.get(`${API_URL}/seating-plans/${id}/export`);
      // Open the download link in a new tab
      window.open(`${API_URL}/seating-plans/${id}/download`, "_blank");
      toast.success("Seating plan exported successfully");
    } catch (error) {
      console.error("Error exporting seating plan:", error);
      toast.error("Failed to export seating plan");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = async (
    status: "draft" | "finalized" | "published"
  ) => {
    try {
      await axios.patch(`${API_URL}/seating-plans/${id}/status`, { status });
      toast.success(`Seating plan ${status} successfully`);
      fetchSeatingPlan();
    } catch (error) {
      console.error("Error updating seating plan status:", error);
      toast.error("Failed to update seating plan status");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusIcon = (status: string) => {
    if (status === "published") {
      return <CheckCircle size={16} className="text-green-500" />;
    } else if (status === "finalized") {
      return <AlertCircle size={16} className="text-blue-500" />;
    } else {
      return <Clock size={16} className="text-amber-500" />;
    }
  };

  const getSelectedClassroomAllocation = () => {
    if (!seatingPlan || !selectedClassroom) return null;
    return seatingPlan.classroomAllocations.find(
      (allocation) => allocation.classroom._id === selectedClassroom
    );
  };

  const getCourseTitle = (courseCode: string) => {
    if (!seatingPlan) return courseCode;
    const course = seatingPlan.exam.courses.find(
      (c) => c.courseCode === courseCode
    );
    return course ? `${courseCode} - ${course.courseTitle}` : courseCode;
  };

  const handleSeatClick = (
    classroom: string,
    rowIndex: number,
    colIndex: number,
    seat: Seat
  ) => {
    if (seatingPlan?.status === "published") {
      toast.warn("Cannot edit a published seating plan");
      return;
    }

    if (swapMode) {
      if (!firstSeatSelection) {
        if (!seat.student) {
          toast.error("Please select a seat with a student first");
          return;
        }
        setFirstSeatSelection({
          student: seat.student,
          classroom,
          row: rowIndex,
          col: colIndex,
        });
        toast.info("Now select the second seat to swap");
      } else {
        // Perform the swap
        const updatedSeatingPlan = { ...seatingPlan! };
        const firstClassroom = updatedSeatingPlan.classroomAllocations.find(
          (a) => a.classroom._id === firstSeatSelection.classroom
        );
        const secondClassroom = updatedSeatingPlan.classroomAllocations.find(
          (a) => a.classroom._id === classroom
        );

        if (firstClassroom && secondClassroom) {
          const temp =
            firstClassroom.seatMatrix[firstSeatSelection.row][
              firstSeatSelection.col
            ].student;
          firstClassroom.seatMatrix[firstSeatSelection.row][
            firstSeatSelection.col
          ].student =
            secondClassroom.seatMatrix[rowIndex][colIndex].student;
          secondClassroom.seatMatrix[rowIndex][colIndex].student = temp;

          setSeatingPlan(updatedSeatingPlan);
          setEditingState({ ...editingState, hasUnsavedChanges: true });
        }

        setFirstSeatSelection(null);
        setSwapMode(false);
        toast.success("Seats swapped successfully");
      }
      return;
    }

    if (!editingState.isEditing) {
      setEditingState({
        ...editingState,
        isEditing: true,
        selectedSeat: {
          classroomId: classroom,
          rowIndex,
          colIndex,
        },
      });
    }
  };

  const handleSeatUpdate = (
    classroomId: string,
    rowIndex: number,
    colIndex: number,
    newState: "empty" | "unavailable" | "student",
    studentData?: { rollNumber: string; name: string; courseCode: string }
  ) => {
    if (!seatingPlan) return;

    const updatedSeatingPlan = { ...seatingPlan };
    const classroomAllocation = updatedSeatingPlan.classroomAllocations.find(
      (a) => a.classroom._id === classroomId
    );

    if (classroomAllocation) {
      if (newState === "empty") {
        classroomAllocation.seatMatrix[rowIndex][colIndex] = {
          isOccupied: false,
          student: null,
        };
      } else if (newState === "unavailable") {
        classroomAllocation.seatMatrix[rowIndex][colIndex] = {
          isOccupied: true,
          student: null,
        };
      } else if (newState === "student" && studentData) {
        classroomAllocation.seatMatrix[rowIndex][colIndex] = {
          isOccupied: true,
          student: studentData,
        };
      }

      setSeatingPlan(updatedSeatingPlan);
      setEditingState({
        ...editingState,
        isEditing: false,
        selectedSeat: null,
        hasUnsavedChanges: true,
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!seatingPlan) return;

    try {
      const response = await axios.patch(
        `${API_URL}/seating-plans/${seatingPlan._id}`,
        {
          classroomAllocations: seatingPlan.classroomAllocations,
        }
      );

      setSeatingPlan(response.data);
      setEditingState({
        ...editingState,
        hasUnsavedChanges: false,
      });
      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    }
  };

  const handleSearch = () => {
    if (!seatingPlan || !searchQuery) return;

    const results: {
      student: Student;
      classroom: string;
      row: number;
      col: number;
    }[] = [];

    seatingPlan.classroomAllocations.forEach((allocation) => {
      allocation.seatMatrix.forEach((row, rowIndex) => {
        row.forEach((seat, colIndex) => {
          if (seat.student) {
            const matchesQuery =
              seat.student.rollNumber
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              seat.student.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

            if (matchesQuery) {
              results.push({
                student: seat.student,
                classroom: allocation.classroom.name,
                row: rowIndex,
                col: colIndex
              });
            }
          }
        });
      });
    });

    setSearchResults(results);
  };

  const renderEditingSeatModal = () => {
    if (!editingState.selectedSeat || !seatingPlan) return null;

    const { classroomId, rowIndex, colIndex } = editingState.selectedSeat;
    const classroom = seatingPlan.classroomAllocations.find(
      (a) => a.classroom._id === classroomId
    );
    if (!classroom) return null;

    const currentSeat = classroom.seatMatrix[rowIndex][colIndex];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium mb-4">Edit Seat</h3>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <button
                className="flex-1 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                onClick={() =>
                  handleSeatUpdate(classroomId, rowIndex, colIndex, "empty")
                }
              >
                Mark as Empty
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                onClick={() =>
                  handleSeatUpdate(
                    classroomId,
                    rowIndex,
                    colIndex,
                    "unavailable"
                  )
                }
              >
                Mark as Unavailable
              </button>
            </div>
            {currentSeat.student && (
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="font-medium">{currentSeat.student.rollNumber}</p>
                <p className="text-sm text-gray-600">
                  {currentSeat.student.name}
                </p>
                <p className="text-sm text-gray-500">
                  {currentSeat.student.courseCode}
                </p>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() =>
                  setEditingState({
                    ...editingState,
                    isEditing: false,
                    selectedSeat: null,
                  })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSeatMatrix = (allocation: ClassroomAllocation) => {
    return (
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Row / Col
                  </th>
                  {Array.from({ length: allocation.classroom.columns }).map((_, colIndex) => (
                    <th
                      key={`col-header-${colIndex}`}
                      className="px-3 py-2 text-center text-xs font-medium text-gray-500"
                    >
                      Col {colIndex + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allocation.seatMatrix.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                      Row {rowIndex + 1}
                    </td>
                    {row.map((seat, colIndex) => (
                      <td
                        key={`seat-${rowIndex}-${colIndex}`}
                        id={`seat-${rowIndex}-${colIndex}`}
                        className={`p-2 text-center ${
                          seatingPlan?.status !== "published"
                            ? "cursor-pointer hover:bg-gray-100"
                            : ""
                        }`}
                        onClick={() =>
                          handleSeatClick(
                            allocation.classroom._id,
                            rowIndex,
                            colIndex,
                            seat
                          )
                        }
                      >
                        {seat.isOccupied && !seat.student ? (
                          <div className="rounded-md px-2 py-1 text-xs bg-red-100 text-red-700">
                            Unavailable
                          </div>
                        ) : seat.student ? (
                          <div
                            className={`rounded-md px-2 py-1 text-xs ${
                              firstSeatSelection &&
                              firstSeatSelection.classroom === allocation.classroom._id &&
                              firstSeatSelection.row === rowIndex &&
                              firstSeatSelection.col === colIndex
                                ? "bg-yellow-100 text-yellow-800"
                                : courseColorMap[seat.student.courseCode] || "bg-gray-100"
                            }`}
                          >
                            <div className="font-medium">
                              {seat.student.rollNumber}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-md px-2 py-1 text-xs bg-gray-100 text-gray-400">
                            Empty
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!seatingPlan) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Seating Plan Not Found</h2>
        <p className="text-gray-600 mb-4">
          The seating plan you're looking for doesn't exist or has been removed.
        </p>
        <Link
          to="/seating-plans"
          className="text-indigo-600 hover:text-indigo-800"
        >
          Go back to Seating Plans
        </Link>
      </div>
    );
  }

  const selectedAllocation = getSelectedClassroomAllocation();

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
          Seating Plan Details
        </h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by roll number or name..."
                className="w-full pl-10 pr-4 py-2 border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Search
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                onClick={handleSearch}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full max-w-md mt-2 bg-white rounded-md shadow-lg">
                <div className="py-1">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        const classroom = seatingPlan?.classroomAllocations.find(
                          (a) => a.classroom.name === result.classroom
                        );
                        if (classroom) {
                          setSelectedClassroom(classroom.classroom._id);
                          setTimeout(() => {
                            const element = document.getElementById(
                              `seat-${result.row}-${result.col}`
                            );
                            element?.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        }
                        setSearchResults([]);
                      }}
                    >
                      <div className="font-medium">
                        {result.student.rollNumber}
                      </div>
                      <div className="text-sm text-gray-600">
                        {result.student.name} - Room {result.classroom}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {seatingPlan?.status !== "published" && (
              <>
                <button
                  onClick={() => setSwapMode(!swapMode)}
                  className={`px-4 py-2 rounded-md ${
                    swapMode
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-700"
                  } hover:bg-gray-200 flex items-center`}
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  {swapMode ? "Cancel Swap" : "Swap Seats"}
                </button>
                {editingState.hasUnsavedChanges && (
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {seatingPlan.exam.name}
              </h2>
              <p className="text-gray-600">
                {formatDate(seatingPlan.exam.date)}
              </p>
              <div className="flex items-center mt-1">
                <span className="text-sm text-gray-500 mr-2">Status:</span>
                <div className="flex items-center">
                  {getStatusIcon(seatingPlan.status)}
                  <span
                    className={`ml-1 text-sm ${
                      seatingPlan.status === "published"
                        ? "text-green-800"
                        : seatingPlan.status === "finalized"
                        ? "text-blue-800"
                        : "text-amber-800"
                    }`}
                  >
                    {seatingPlan.status.charAt(0).toUpperCase() +
                      seatingPlan.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex mt-4 md:mt-0">
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 mr-2"
              >
                <Download size={18} className="mr-2" />
                Export to Excel
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
              >
                <Printer size={18} className="mr-2" />
                Print View
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-lg p-4 flex items-center">
              <Book className="h-10 w-10 text-indigo-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-700">Courses</h3>
                <p className="text-xl font-semibold">
                  {seatingPlan.exam.courses.length}
                </p>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 flex items-center">
              <Users className="h-10 w-10 text-green-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-700">Students</h3>
                <p className="text-xl font-semibold">
                  {seatingPlan.statistics.totalStudents}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 flex items-center">
              <Building className="h-10 w-10 text-amber-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Classrooms
                </h3>
                <p className="text-xl font-semibold">
                  {seatingPlan.classroomAllocations.length}
                </p>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 flex items-center">
              <FileSpreadsheet className="h-10 w-10 text-purple-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Utilization
                </h3>
                <p className="text-xl font-semibold">
                  {Math.round(
                    (seatingPlan.statistics.totalStudents /
                      seatingPlan.statistics.totalSeats) *
                      100
                  )}
                  %
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Seating Plan Status
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => handleStatusChange("draft")}
                className={`px-3 py-1 rounded-md text-sm ${
                  seatingPlan.status === "draft"
                    ? "bg-amber-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => handleStatusChange("finalized")}
                className={`px-3 py-1 rounded-md text-sm ${
                  seatingPlan.status === "finalized"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Finalized
              </button>
              <button
                onClick={() => handleStatusChange("published")}
                className={`px-3 py-1 rounded-md text-sm ${
                  seatingPlan.status === "published"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Published
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Course Legend
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(seatingPlan.statistics.courseCounts || {}).map(
                ([courseCode, count]) => (
                  <div
                    key={courseCode}
                    className={`px-2 py-1 rounded-md text-xs ${courseColorMap[courseCode]}`}
                  >
                    {courseCode} ({count} students)
                  </div>
                )
              )}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Classroom Seating Plan
            </h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {seatingPlan.classroomAllocations.map((allocation) => (
                <button
                  key={allocation.classroom._id}
                  onClick={() => setSelectedClassroom(allocation.classroom._id)}
                  className={`px-3 py-1 border rounded-md text-sm ${
                    selectedClassroom === allocation.classroom._id
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {allocation.classroom.name}
                </button>
              ))}
            </div>

            {selectedAllocation && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="mb-4 flex flex-col sm:flex-row sm:justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800">
                      {selectedAllocation.classroom.name} (
                      {selectedAllocation.classroom.building})
                    </h4>
                    <p className="text-sm text-gray-600">
                      Floor: {selectedAllocation.classroom.floor} | Capacity:{" "}
                      {selectedAllocation.classroom.capacity} seats
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-sm text-gray-600">
                    Dimensions: {selectedAllocation.classroom.rows} rows ×{" "}
                    {selectedAllocation.classroom.columns} columns
                  </div>
                </div>

                {renderSeatMatrix(selectedAllocation)}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Statistics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">
                  Course Distribution
                </h4>
                <div className="space-y-2">
                  {Object.entries(
                    seatingPlan.statistics.courseCounts || {}
                  ).map(([courseCode, count]) => (
                    <div
                      key={courseCode}
                      className="flex items-center justify-between"
                    >
                      <div className="text-sm font-medium text-gray-700">
                        {getCourseTitle(courseCode)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {count} students
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">
                  Classroom Utilization
                </h4>
                <div className="space-y-3">
                  {seatingPlan.statistics.classroomUtilization.map((item) => (
                    <div key={item.classroom}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium text-gray-700">
                          {item.classroom}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.utilization}%
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${item.utilization}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingState.isEditing && renderEditingSeatModal()}
    </div>
  );
};

export default SeatingPlanDetail;
