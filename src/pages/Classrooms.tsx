import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Trash2, Edit, Save, X, LayoutGrid } from "lucide-react";

const API_URL = "http://localhost:5001/api";

interface Classroom {
  _id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  rows: number;
  columns: number;
  unavailableSeats: { row: number; column: number }[];
}

const Classrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newClassroom, setNewClassroom] = useState({
    name: "",
    building: "Main Building",
    floor: 1,
    capacity: 60,
    rows: 10,
    columns: 6,
    unavailableSeats: [],
  });

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/classrooms`);
      setClassrooms(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      toast.error("Failed to load classrooms");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newClassroom.name ||
      !newClassroom.building ||
      !newClassroom.rows ||
      !newClassroom.columns
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (isEditing && editingId) {
        await axios.patch(`${API_URL}/classrooms/${editingId}`, newClassroom);
        toast.success("Classroom updated successfully");
      } else {
        await axios.post(`${API_URL}/classrooms`, newClassroom);
        toast.success("Classroom created successfully");
      }

      setIsModalOpen(false);
      setIsEditing(false);
      setEditingId(null);
      setNewClassroom({
        name: "",
        building: "Main Building",
        floor: 1,
        capacity: 60,
        rows: 10,
        columns: 6,
        unavailableSeats: [],
      });
      fetchClassrooms();
    } catch (error) {
      console.error("Error saving classroom:", error);
      toast.error(
        isEditing ? "Failed to update classroom" : "Failed to create classroom"
      );
    }
  };

  const handleEdit = (classroom: Classroom) => {
    setIsEditing(true);
    setEditingId(classroom._id);
    setNewClassroom({
      name: classroom.name,
      building: classroom.building,
      floor: classroom.floor,
      capacity: classroom.capacity,
      rows: classroom.rows,
      columns: classroom.columns,
      unavailableSeats: classroom.unavailableSeats || [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this classroom?")) {
      try {
        await axios.delete(`${API_URL}/classrooms/${id}`);
        toast.success("Classroom deleted successfully");
        fetchClassrooms();
      } catch (error) {
        console.error("Error deleting classroom:", error);
        toast.error("Failed to delete classroom");
      }
    }
  };

  const handleCreateDefaultClassrooms = async () => {
    try {
      await axios.post(`${API_URL}/classrooms/bulk-create-default`);
      toast.success("Default classrooms created successfully");
      fetchClassrooms();
    } catch (error) {
      console.error("Error creating default classrooms:", error);
      toast.error("Failed to create default classrooms");
    }
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
        <h1 className="text-2xl font-bold text-gray-800">Classrooms</h1>
        <div className="flex space-x-2">
          {classrooms.length === 0 && (
            <button
              onClick={handleCreateDefaultClassrooms}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
            >
              <LayoutGrid size={18} className="mr-2" />
              Create Default Classrooms
            </button>
          )}
          <button
            onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              setNewClassroom({
                name: "",
                building: "Main Building",
                floor: 1,
                capacity: 60,
                rows: 10,
                columns: 6,
                unavailableSeats: [],
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
          >
            <Plus size={18} className="mr-2" />
            Add New Classroom
          </button>
        </div>
      </div>

      {/* Classrooms Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Building
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Floor
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Capacity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Dimensions
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
              {classrooms.length > 0 ? (
                classrooms.map((classroom) => (
                  <tr key={classroom._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {classroom.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {classroom.building}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {classroom.floor}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {classroom.capacity} seats
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {classroom.rows} rows × {classroom.columns} columns
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(classroom)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(classroom._id)}
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
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No classrooms found. Create your first classroom by clicking
                    the "Add New Classroom" button or use "Create Default
                    Classrooms" to generate a standard set.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Classroom Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? "Edit Classroom" : "Add New Classroom"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Classroom Name*
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. H1, 201, CRE"
                  value={newClassroom.name}
                  onChange={(e) =>
                    setNewClassroom({ ...newClassroom, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="building"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Building*
                </label>
                <input
                  type="text"
                  id="building"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Main Building"
                  value={newClassroom.building}
                  onChange={(e) =>
                    setNewClassroom({
                      ...newClassroom,
                      building: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="floor"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Floor*
                  </label>
                  <input
                    type="number"
                    id="floor"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={newClassroom.floor}
                    onChange={(e) =>
                      setNewClassroom({
                        ...newClassroom,
                        floor: parseInt(e.target.value),
                      })
                    }
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="capacity"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Capacity*
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={newClassroom.capacity}
                    onChange={(e) =>
                      setNewClassroom({
                        ...newClassroom,
                        capacity: parseInt(e.target.value),
                      })
                    }
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="rows"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Rows*
                  </label>
                  <input
                    type="number"
                    id="rows"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={newClassroom.rows}
                    onChange={(e) =>
                      setNewClassroom({
                        ...newClassroom,
                        rows: parseInt(e.target.value),
                      })
                    }
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="columns"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Columns*
                  </label>
                  <input
                    type="number"
                    id="columns"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={newClassroom.columns}
                    onChange={(e) =>
                      setNewClassroom({
                        ...newClassroom,
                        columns: parseInt(e.target.value),
                      })
                    }
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X size={18} className="mr-1" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <Save size={18} className="mr-1" />
                  {isEditing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classrooms;
