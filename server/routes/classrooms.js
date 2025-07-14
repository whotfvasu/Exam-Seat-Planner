import express from 'express';
import Classroom from '../models/Classroom.js';

const router = express.Router();

// Get all classrooms
router.get('/', async (req, res) => {
  try {
    const classrooms = await Classroom.find().sort({ building: 1, name: 1 });
    res.status(200).json(classrooms);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Get a single classroom
router.get('/:id', async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }
    res.status(200).json(classroom);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Create a new classroom
router.post('/', async (req, res) => {
  const { name, building, floor, capacity, rows, columns, unavailableSeats } = req.body;
  
  try {
    const newClassroom = new Classroom({
      name,
      building,
      floor,
      capacity,
      rows,
      columns,
      unavailableSeats: unavailableSeats || []
    });
    
    const savedClassroom = await newClassroom.save();
    res.status(201).json(savedClassroom);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
});

// Update a classroom
router.patch('/:id', async (req, res) => {
  try {
    const updatedClassroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!updatedClassroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }
    
    res.status(200).json(updatedClassroom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a classroom
router.delete('/:id', async (req, res) => {
  try {
    const deletedClassroom = await Classroom.findByIdAndDelete(req.params.id);
    if (!deletedClassroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }
    res.status(200).json({ message: 'Classroom deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk create default classrooms
router.post('/bulk-create-default', async (req, res) => {
  try {
    // Default classrooms based on the template shown in the images
    const defaultClassrooms = [
      { name: 'SH', building: 'Main Building', floor: 1, rows: 10, columns: 6, capacity: 60 },
      { name: 'H1', building: 'Main Building', floor: 1, rows: 16, columns: 6, capacity: 96 },
      { name: 'H2', building: 'Main Building', floor: 1, rows: 16, columns: 6, capacity: 96 },
      { name: '201', building: 'Main Building', floor: 2, rows: 12, columns: 6, capacity: 72 },
      { name: '202', building: 'Main Building', floor: 2, rows: 12, columns: 6, capacity: 72 },
      { name: '203', building: 'Main Building', floor: 2, rows: 12, columns: 6, capacity: 72 },
      { name: '204', building: 'Main Building', floor: 2, rows: 12, columns: 6, capacity: 72 },
      { name: '001', building: 'Main Building', floor: 0, rows: 10, columns: 6, capacity: 60 },
      { name: '002', building: 'Main Building', floor: 0, rows: 10, columns: 6, capacity: 60 },
      { name: '101', building: 'Main Building', floor: 1, rows: 10, columns: 5, capacity: 50 },
      { name: '102', building: 'Main Building', floor: 1, rows: 10, columns: 5, capacity: 50 },
      { name: 'CRE', building: 'Main Building', floor: 1, rows: 8, columns: 4, capacity: 32 },
      { name: 'LAB-1', building: 'Lab Complex', floor: 1, rows: 8, columns: 8, capacity: 64 },
      { name: 'LAB-2', building: 'Lab Complex', floor: 1, rows: 8, columns: 8, capacity: 64 },
      { name: 'LAB-3', building: 'Lab Complex', floor: 1, rows: 8, columns: 8, capacity: 64 },
      { name: 'LAB-4', building: 'Lab Complex', floor: 1, rows: 8, columns: 8, capacity: 64 },
      { name: 'LAB-5', building: 'Lab Complex', floor: 1, rows: 8, columns: 8, capacity: 64 }
    ];

    // Check if classrooms already exist and don't duplicate
    for (const classroom of defaultClassrooms) {
      const exists = await Classroom.findOne({ name: classroom.name });
      if (!exists) {
        await Classroom.create(classroom);
      }
    }

    res.status(201).json({ message: 'Default classrooms created successfully' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
});

export default router;