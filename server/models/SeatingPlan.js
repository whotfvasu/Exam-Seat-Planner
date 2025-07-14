import mongoose from 'mongoose';

const SeatingPlanSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  generatedDate: {
    type: Date,
    default: Date.now
  },
  classroomAllocations: [{
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true
    },
    seatMatrix: [[{
      isOccupied: {
        type: Boolean,
        default: false
      },
      student: {
        rollNumber: String,
        name: String,
        courseCode: String
      }
    }]]
  }],
  status: {
    type: String,
    enum: ['draft', 'finalized', 'published'],
    default: 'draft'
  },
  statistics: {
    totalStudents: Number,
    totalSeats: Number,
    courseCounts: Map,
    classroomUtilization: [{
      classroom: String,
      utilization: Number // percentage
    }]
  }
});

const SeatingPlan = mongoose.model('SeatingPlan', SeatingPlanSchema);
export default SeatingPlan;