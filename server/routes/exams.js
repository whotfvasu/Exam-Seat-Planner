import express from 'express';
import Exam from '../models/Exam.js';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all exams
router.get('/', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ date: -1 });
    res.status(200).json(exams);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Get a single exam
router.get('/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.status(200).json(exam);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Create a new exam
router.post('/', async (req, res) => {
  const { name, date } = req.body;
  
  try {
    const newExam = new Exam({
      name,
      date: new Date(date),
      courses: []
    });
    
    const savedExam = await newExam.save();
    res.status(201).json(savedExam);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
});

// Import course data from Excel
router.post('/:id/import', async (req, res) => {
  const { id } = req.params;
  const { filePath, courseCode, courseTitle, semester, branch } = req.body;
  
  if (!filePath || !courseCode || !courseTitle || !semester || !branch) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  try {
    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const absolutePath = path.join(__dirname, '..', 'uploads', path.basename(filePath));
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Read the Excel file
    const workbook = xlsx.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet);
    
    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or invalid' });
    }

    // Validate the Excel structure
    const firstRow = rawData[0];
    if (!firstRow['Roll No.'] || !firstRow['Name']) {
      return res.status(400).json({ 
        message: 'Invalid Excel format: Must have "Roll No." and "Name" columns' 
      });
    }

    // Process student data
    const students = rawData
      .filter(row => row['Roll No.'] && row['Name']) // Filter out empty rows
      .map(row => ({
        rollNumber: String(row['Roll No.']).trim(),
        name: String(row['Name']).trim()
      }))
      .filter(student => {
        // Validate roll number format based on branch
        const rollPattern = new RegExp(`^BT\\d{2}${branch}\\d{3}$`);
        return rollPattern.test(student.rollNumber);
      });

    if (students.length === 0) {
      return res.status(400).json({ 
        message: 'No valid student data found or invalid roll number format' 
      });
    }

    // Sort students by roll number
    students.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
    
    // Check if course already exists
    const courseIndex = exam.courses.findIndex(c => c.courseCode === courseCode);
    
    if (courseIndex !== -1) {
      // Update existing course
      exam.courses[courseIndex].students = students;
    } else {
      // Add new course
      exam.courses.push({
        courseCode,
        courseTitle,
        semester,
        branch,
        students
      });
    }
    
    // Clean up the uploaded file
    fs.unlink(absolutePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
    
    const updatedExam = await exam.save();
    res.status(200).json(updatedExam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an exam
router.delete('/:id', async (req, res) => {
  try {
    const deletedExam = await Exam.findByIdAndDelete(req.params.id);
    if (!deletedExam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.status(200).json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;