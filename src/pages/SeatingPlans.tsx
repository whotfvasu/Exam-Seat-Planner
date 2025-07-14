import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Download, Eye, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import api from '../services/api';

interface SeatingPlan {
  _id: string;
  exam: {
    _id: string;
    name: string;
    date: string;
  };
  generatedDate: string;
  status: 'draft' | 'finalized' | 'published';
  statistics: {
    totalStudents: number;
    totalSeats: number;
    courseCounts: Record<string, number>;
    classroomUtilization: {
      classroom: string;
      utilization: number;
    }[];
  };
  classroomAllocations: {
    classroom: {
      _id: string;
      name: string;
    };
  }[];
}

const SeatingPlans: React.FC = () => {
  const [seatingPlans, setSeatingPlans] = useState<SeatingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeatingPlans();
  }, []);

  const fetchSeatingPlans = async () => {
    try {
      const response = await api.get('/seating-plans');
      setSeatingPlans(response.data);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching seating plans:', error);
      toast.error(error.message || 'Failed to load seating plans');
      setLoading(false);
    }
  };

  const handleExport = async (id: string) => {
    try {
      await api.get(`/seating-plans/${id}/export`);
      // Open the download link in a new tab
      window.open(`${api.defaults.baseURL}/seating-plans/${id}/download`, '_blank');
      toast.success('Seating plan exported successfully');
    } catch (error: any) {
      console.error('Error exporting seating plan:', error);
      toast.error(error.message || 'Failed to export seating plan');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this seating plan?')) {
      try {
        await api.delete(`/seating-plans/${id}`);
        toast.success('Seating plan deleted successfully');
        fetchSeatingPlans();
      } catch (error: any) {
        console.error('Error deleting seating plan:', error);
        toast.error(error.message || 'Failed to delete seating plan');
      }
    }
  };

  const handleStatusChange = async (id: string, status: 'draft' | 'finalized' | 'published') => {
    try {
      await api.patch(`/seating-plans/${id}/status`, { status });
      toast.success(`Seating plan ${status} successfully`);
      fetchSeatingPlans();
    } catch (error: any) {
      console.error('Error updating seating plan status:', error);
      toast.error(error.message || 'Failed to update seating plan status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    if (status === 'published') {
      return <CheckCircle size={16} className="text-green-500" />;
    } else if (status === 'finalized') {
      return <AlertCircle size={16} className="text-blue-500" />;
    } else {
      return <Clock size={16} className="text-amber-500" />;
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
        <h1 className="text-2xl font-bold text-gray-800">Seating Plans</h1>
        <Link
          to="/seating-plans/generate"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
        >
          <Plus size={20} className="mr-2" />
          Generate New Seating Plan
        </Link>
      </div>

      {/* Seating Plans */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exam
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated On
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classrooms
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {seatingPlans.length > 0 ? (
                seatingPlans.map((plan) => (
                  <tr key={plan._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{plan.exam.name}</div>
                      <div className="text-sm text-gray-500">{formatDate(plan.exam.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(plan.generatedDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(plan.status)}
                        <span className={`ml-1.5 text-sm ${
                          plan.status === 'published' 
                            ? 'text-green-800' 
                            : plan.status === 'finalized' 
                            ? 'text-blue-800' 
                            : 'text-amber-800'
                        }`}>
                          {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{plan.classroomAllocations.length}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{plan.statistics?.totalStudents || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/seating-plans/${plan._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </Link>
                        <button
                          onClick={() => handleExport(plan._id)}
                          className="text-emerald-600 hover:text-emerald-900"
                          title="Export to Excel"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(plan._id)}
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
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No seating plans found. Create your first seating plan by clicking the "Generate New Seating Plan" button.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SeatingPlans;