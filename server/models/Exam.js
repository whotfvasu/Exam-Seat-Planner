import mongoose from 'mongoose';

const ExamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  courses: [{
    courseCode: {
      type: String,
      required: true,
      trim: true
    },
    courseTitle: {
      type: String,
      required: true,
      trim: true
    },
    semester: {
      type: Number,
      required: true
    },
    branch: {
      type: String,
      required: true,
      trim: true
    },
    students: [{
      rollNumber: {
        type: String,
        required: true,
        trim: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      }
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Exam = mongoose.model('Exam', ExamSchema);
export default Exam;