import mongoose from 'mongoose';

const ClassroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  building: {
    type: String,
    required: true,
    trim: true,
    default: 'Main Building'
  },
  floor: {
    type: Number,
    required: true,
    default: 1
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  rows: {
    type: Number,
    required: true,
    min: 1
  },
  columns: {
    type: Number,
    required: true,
    min: 1
  },
  // Array of seat positions that are not available (e.g., broken chairs)
  unavailableSeats: [{
    row: { type: Number, required: true },
    column: { type: Number, required: true }
  }]
});

// Virtual for calculating available seats
ClassroomSchema.virtual('availableSeats').get(function() {
  return this.capacity - this.unavailableSeats.length;
});

const Classroom = mongoose.model('Classroom', ClassroomSchema);
export default Classroom;