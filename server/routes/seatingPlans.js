import express from 'express';
import Exam from '../models/Exam.js';
import Classroom from '../models/Classroom.js';
import SeatingPlan from '../models/SeatingPlan.js';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all seating plans
router.get('/', async (req, res) => {
  try {
    const seatingPlans = await SeatingPlan.find()
      .populate('exam', 'name date')
      .populate('classroomAllocations.classroom', 'name building')
      .sort({ generatedDate: -1 });
    
    res.status(200).json(seatingPlans);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Get a single seating plan
router.get('/:id', async (req, res) => {
  try {
    const seatingPlan = await SeatingPlan.findById(req.params.id)
      .populate('exam')
      .populate('classroomAllocations.classroom');
    
    if (!seatingPlan) {
      return res.status(404).json({ message: 'Seating plan not found' });
    }
    
    res.status(200).json(seatingPlan);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Generate a new seating plan
router.post('/generate', async (req, res) => {
  const { examId, classroomIds } = req.body;
  
  if (!examId || !classroomIds || !Array.isArray(classroomIds) || classroomIds.length === 0) {
    return res.status(400).json({ message: 'Exam ID and at least one classroom ID are required' });
  }
  
  try {
    // Get exam data
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Get classroom data
    const classrooms = await Classroom.find({ _id: { $in: classroomIds } });
    if (classrooms.length === 0) {
      return res.status(404).json({ message: 'No valid classrooms found' });
    }
    
    // Group students by course and sort by roll number
    const courseStudents = {};
    exam.courses.forEach(course => {
      courseStudents[course.courseCode] = [...course.students]
        .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
    });
    
    // Calculate total available seats
    const totalSeats = classrooms.reduce((sum, classroom) => sum + classroom.capacity, 0);
    const totalStudents = Object.values(courseStudents).reduce((sum, students) => sum + students.length, 0);
    
    // Check if we have enough seats
    if (totalStudents > totalSeats) {
      return res.status(400).json({
        message: `Not enough seats for all students. Need ${totalStudents} seats but only have ${totalSeats}.`
      });
    }
    
    // Initialize the seating plan
    const classroomAllocations = [];
    
    // Get course codes array and sort by student count to optimize distribution
    const courseCodes = Object.keys(courseStudents);
    
    // Sort courses by number of students (descending) to optimize distribution
    courseCodes.sort((a, b) => courseStudents[b].length - courseStudents[a].length);
    
    // Calculate optimal pairing of courses to minimize leftover students
    const optimizedPairs = optimizeCourseDistribution(courseCodes, courseStudents);
    
    let currentCourseIndex = 0;
    let nextCourseIndex = optimizedPairs[0] || 1;
    
    // Process each classroom
    for (const classroom of classrooms) {
      // Create empty seat matrix
      const seatMatrix = Array(classroom.rows).fill().map(() => 
        Array(classroom.columns).fill().map(() => ({
          isOccupied: false,
          student: null
        }))
      );
      
      // Mark unavailable seats
      classroom.unavailableSeats.forEach(seat => {
        if (seat.row < classroom.rows && seat.column < classroom.columns) {
          seatMatrix[seat.row][seat.column].isOccupied = true;
        }
      });
      
      // Fill seats column by column
      for (let col = 0; col < classroom.columns; col++) {
        // Determine which course to use for this column
        const courseCode = courseCodes[col % 2 === 0 ? currentCourseIndex : nextCourseIndex];
        if (!courseCode) continue; // Skip if no more courses available
        
        const students = courseStudents[courseCode];
        
        // Forward checking: Calculate how many seats are available in this column
        let availableSeatsInColumn = 0;
        for (let row = 0; row < classroom.rows; row++) {
          if (!seatMatrix[row][col].isOccupied) {
            availableSeatsInColumn++;
          }
        }
        
        // If we don't have enough students for this column, try to find a better course pairing
        if (students && students.length < availableSeatsInColumn && courseCodes.length > 2) {
          // Check for a course with a more suitable number of students
          const optimalCourseIdx = findOptimalCourse(courseStudents, courseCodes, 
                                                    availableSeatsInColumn, col % 2 === 0 ? currentCourseIndex : nextCourseIndex);
          
          // Update the course index if we found a better match
          if (optimalCourseIdx !== -1) {
            if (col % 2 === 0) {
              currentCourseIndex = optimalCourseIdx;
            } else {
              nextCourseIndex = optimalCourseIdx;
            }
          }
        }
        
        // Fill column from top to bottom
        for (let row = 0; row < classroom.rows; row++) {
          if (seatMatrix[row][col].isOccupied) continue;
          
          if (students && students.length > 0) {
            const student = students.shift();
            seatMatrix[row][col] = {
              isOccupied: true,
              student: {
                rollNumber: student.rollNumber,
                name: student.name,
                courseCode: courseCode
              }
            };
          } else {
            // If current course has no more students, move to next course
            if (col % 2 === 0) {
              currentCourseIndex = (currentCourseIndex + 1) % courseCodes.length;
            } else {
              nextCourseIndex = (nextCourseIndex + 1) % courseCodes.length;
              if (nextCourseIndex === currentCourseIndex) {
                nextCourseIndex = (nextCourseIndex + 1) % courseCodes.length;
              }
            }
            
            // Try to get students from the new course
            const newCourseCode = courseCodes[col % 2 === 0 ? currentCourseIndex : nextCourseIndex];
            const newStudents = courseStudents[newCourseCode];
            
            if (newStudents && newStudents.length > 0) {
              const student = newStudents.shift();
              seatMatrix[row][col] = {
                isOccupied: true,
                student: {
                  rollNumber: student.rollNumber,
                  name: student.name,
                  courseCode: newCourseCode
                }
              };
            }
          }
        }
      }
      
      // Add classroom allocation to the seating plan
      classroomAllocations.push({
        classroom: classroom._id,
        seatMatrix
      });
    }
    
    // Calculate statistics
    const courseCounts = {};
    exam.courses.forEach(course => {
      courseCounts[course.courseCode] = course.students.length;
    });
    
    const classroomUtilization = classroomAllocations.map(allocation => {
      const classroom = classrooms.find(c => c._id.toString() === allocation.classroom.toString());
      const occupiedSeats = allocation.seatMatrix.flat().filter(seat => seat.isOccupied && seat.student).length;
      return {
        classroom: classroom.name,
        utilization: Math.round((occupiedSeats / classroom.capacity) * 100)
      };
    });
    
    // Create the seating plan
    const newSeatingPlan = new SeatingPlan({
      exam: exam._id,
      classroomAllocations,
      status: 'draft',
      statistics: {
        totalStudents,
        totalSeats,
        courseCounts,
        classroomUtilization
      }
    });
    
    const savedSeatingPlan = await newSeatingPlan.save();
    res.status(201).json(savedSeatingPlan);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
});

// Export seating plan to Excel
router.get('/:id/export', async (req, res) => {
  try {
    const seatingPlan = await SeatingPlan.findById(req.params.id)
      .populate('exam')
      .populate('classroomAllocations.classroom');
    
    if (!seatingPlan) {
      return res.status(404).json({ message: 'Seating plan not found' });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create a new workbook
    const workbook = xlsx.utils.book_new();

    // Define common styles
    const titleStyle = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'medium' },
        right: { style: 'medium' }
      },
      fill: {
        fgColor: { rgb: 'F2F2F2' }
      }
    };

    const headerStyle = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      },
      fill: {
        fgColor: { rgb: 'E2E8F0' }
      }
    };

    const cellStyle = {
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const emptyStyle = {
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      },
      fill: {
        fgColor: { rgb: 'F8F9FA' }
      }
    };
    
    // Define distinct colors for different courses (light pastels for good legibility)
    const courseColors = [
      'C6E0FF', // Bright Blue
      'FFD6AD', // Bright Orange
      'C8F7C5', // Bright Green
      'FFECB3', // Bright Yellow
      'E1BEE7', // Bright Purple
      'FFCDD2', // Bright Red
      'B3E5FC', // Bright Cyan
      'D7CCC8', // Bright Brown
      'DCEDC8', // Lime Green
      'F8BBD0', // Pink
      'B2DFDB', // Teal
      'D1C4E9'  // Lavender
    ];

    // Function to apply styles to a specific range
    const applyRangeStyle = (ws, range, style) => {
      const [start, end] = range.split(':').map(xlsx.utils.decode_cell);
      for (let R = start.r; R <= end.r; ++R) {
        for (let C = start.c; C <= end.c; ++C) {
          const cellRef = xlsx.utils.encode_cell({r: R, c: C});
          if (!ws[cellRef]) {
            ws[cellRef] = { v: '', t: 's' };
          }
          ws[cellRef].s = style;
        }
      }
    };

    // Create master plan worksheet
    const masterData = [
      ['Indian Institute of Information Technology, Nagpur'],
      ['Department of Computer Science and Engineering'],
      [`${seatingPlan.exam.name}`],
      [`Date: ${new Date(seatingPlan.exam.date).toLocaleDateString()}`],
      ['Seating Plan Master Sheet'],
      [],
      ['S.No.', 'Room No.', 'Course', 'Roll Number Range', 'Semester', 'Branch', 'Total Students']
    ];
    
    let serialNumber = 1;
    
    // Add data for each classroom
    for (const allocation of seatingPlan.classroomAllocations) {
      const classroom = allocation.classroom;
      const students = allocation.seatMatrix.flat().filter(seat => seat.isOccupied && seat.student);
      
      // Group students by course code
      const courseGroups = {};
      students.forEach(seat => {
        if (seat.student) {
          const courseCode = seat.student.courseCode;
          if (!courseGroups[courseCode]) {
            courseGroups[courseCode] = [];
          }
          courseGroups[courseCode].push(seat.student);
        }
      });
      
      // Add each course's data
      for (const courseCode in courseGroups) {
        const course = seatingPlan.exam.courses.find(c => c.courseCode === courseCode);
        if (course) {
          // Sort students by roll number for the range
          const sortedStudents = courseGroups[courseCode].sort((a, b) => 
            a.rollNumber.localeCompare(b.rollNumber)
          );
          
          const rollNumberRange = sortedStudents.length > 0 ? 
            `${sortedStudents[0].rollNumber} - ${sortedStudents[sortedStudents.length - 1].rollNumber}` :
            'N/A';

          masterData.push([
            serialNumber++,
            classroom.name,
            `${courseCode} - ${course.courseTitle}`,
            rollNumberRange,
            course.semester,
            course.branch,
            courseGroups[courseCode].length
          ]);
        }
      }
    }
    
    const masterSheet = xlsx.utils.aoa_to_sheet(masterData);

    // Set column widths
    masterSheet['!cols'] = [
      { width: 8 },   // S.No.
      { width: 15 },  // Room No.
      { width: 40 },  // Course
      { width: 30 },  // Roll Number Range
      { width: 12 },  // Semester
      { width: 15 },  // Branch
      { width: 15 }   // Total Students
    ];

    // Set row heights
    masterSheet['!rows'] = [
      { hpt: 30 },  // Institute name
      { hpt: 25 },  // Department
      { hpt: 25 },  // Exam name
      { hpt: 25 },  // Date
      { hpt: 25 },  // Sheet title
      { hpt: 20 },  // Empty row
      { hpt: 25 },  // Headers
    ];

    // Apply styles to master sheet
    const lastCol = String.fromCharCode(65 + masterData[6].length - 1); // Calculate last column letter
    applyRangeStyle(masterSheet, `A1:${lastCol}1`, titleStyle);
    applyRangeStyle(masterSheet, `A2:${lastCol}2`, titleStyle);
    applyRangeStyle(masterSheet, `A3:${lastCol}3`, titleStyle);
    applyRangeStyle(masterSheet, `A4:${lastCol}4`, titleStyle);
    applyRangeStyle(masterSheet, `A5:${lastCol}5`, titleStyle);
    applyRangeStyle(masterSheet, `A7:${lastCol}7`, headerStyle);

    // Apply styles to data rows
    for (let i = 8; i < masterData.length; i++) {
      applyRangeStyle(masterSheet, `A${i}:${lastCol}${i}`, cellStyle);
    }

    // Add merged cells for titles
    masterSheet['!merges'] = [
      { s: {r: 0, c: 0}, e: {r: 0, c: masterData[6].length - 1} },
      { s: {r: 1, c: 0}, e: {r: 1, c: masterData[6].length - 1} },
      { s: {r: 2, c: 0}, e: {r: 2, c: masterData[6].length - 1} },
      { s: {r: 3, c: 0}, e: {r: 3, c: masterData[6].length - 1} },
      { s: {r: 4, c: 0}, e: {r: 4, c: masterData[6].length - 1} }
    ];

    xlsx.utils.book_append_sheet(workbook, masterSheet, 'Master Plan');

    // Create individual classroom sheets
    for (const allocation of seatingPlan.classroomAllocations) {
      const classroom = allocation.classroom;
      
      const sheetData = [
        ['Indian Institute of Information Technology, Nagpur'],
        ['Department of Computer Science and Engineering'],
        ['Seating Plan'],
        [`${seatingPlan.exam.name}`],
        [`${classroom.building} - Room ${classroom.name} (${classroom.floor}${getSuffix(classroom.floor)} Floor)`],
        [`Date: ${new Date(seatingPlan.exam.date).toLocaleDateString()}`],
        [],
        ['Row / Col', ...Array(classroom.columns).fill().map((_, i) => `Column ${i + 1}`)]
      ];
      
      // Add student data
      for (let row = 0; row < classroom.rows; row++) {
        const rowData = [`Row ${row + 1}`];
        for (let col = 0; col < classroom.columns; col++) {
          const seat = allocation.seatMatrix[row][col];
          rowData.push(seat.isOccupied && seat.student ? seat.student.rollNumber : '');
        }
        sheetData.push(rowData);
      }
      
      const classroomSheet = xlsx.utils.aoa_to_sheet(sheetData);
      
      // Set column widths for classroom sheet
      classroomSheet['!cols'] = [
        { width: 12 },  // Row/Col
        ...Array(classroom.columns).fill({ width: 15 })  // Student columns
      ];

      // Set row heights
      classroomSheet['!rows'] = [
        { hpt: 30 },  // Institute name
        { hpt: 25 },  // Department
        { hpt: 25 },  // Seating Plan
        { hpt: 25 },  // Exam name
        { hpt: 25 },  // Room info
        { hpt: 25 },  // Date
        { hpt: 20 },  // Empty row
        { hpt: 25 },  // Headers
      ];

      // Calculate last column letter for classroom sheet
      const lastClassCol = String.fromCharCode(65 + classroom.columns);

      // Apply styles to classroom sheet
      applyRangeStyle(classroomSheet, `A1:${lastClassCol}1`, titleStyle);
      applyRangeStyle(classroomSheet, `A2:${lastClassCol}2`, titleStyle);
      applyRangeStyle(classroomSheet, `A3:${lastClassCol}3`, titleStyle);
      applyRangeStyle(classroomSheet, `A4:${lastClassCol}4`, titleStyle);
      applyRangeStyle(classroomSheet, `A5:${lastClassCol}5`, titleStyle);
      applyRangeStyle(classroomSheet, `A6:${lastClassCol}6`, titleStyle);
      applyRangeStyle(classroomSheet, `A8:${lastClassCol}8`, headerStyle);

      // Apply styles to seating data
      for (let i = 9; i < sheetData.length; i++) {
        for (let j = 0; j <= classroom.columns; j++) {
          const cellRef = xlsx.utils.encode_cell({r: i, c: j});
          const isEmpty = !classroomSheet[cellRef]?.v;
          
          if (isEmpty) {
            classroomSheet[cellRef].s = emptyStyle;
          } else if (j > 0) { // Cell contains a student
            const row = i - 9;
            const col = j - 1;
            const seat = allocation.seatMatrix[row][col];
            
            if (seat && seat.student) {
              // Create a map of course codes to color indices
              const courseColorMap = {};
              let colorIndex = 0;
              
              // Find all unique course codes in this classroom
              allocation.seatMatrix.flat().forEach(s => {
                if (s.student && s.student.courseCode && !courseColorMap[s.student.courseCode]) {
                  courseColorMap[s.student.courseCode] = colorIndex % courseColors.length;
                  colorIndex++;
                }
              });
              
              // Apply the course-specific color
              const courseColorIdx = courseColorMap[seat.student.courseCode];
              const coloredCellStyle = {
                ...cellStyle,
                fill: {
                  fgColor: { rgb: courseColors[courseColorIdx] }
                }
              };
              
              classroomSheet[cellRef].s = coloredCellStyle;
            } else {
              classroomSheet[cellRef].s = cellStyle;
            }
          } else {
            classroomSheet[cellRef].s = cellStyle;
          }
        }
      }

      // Add merged cells for titles
      classroomSheet['!merges'] = [
        { s: {r: 0, c: 0}, e: {r: 0, c: classroom.columns} },
        { s: {r: 1, c: 0}, e: {r: 1, c: classroom.columns} },
        { s: {r: 2, c: 0}, e: {r: 2, c: classroom.columns} },
        { s: {r: 3, c: 0}, e: {r: 3, c: classroom.columns} },
        { s: {r: 4, c: 0}, e: {r: 4, c: classroom.columns} },
        { s: {r: 5, c: 0}, e: {r: 5, c: classroom.columns} }
      ];
      
      xlsx.utils.book_append_sheet(workbook, classroomSheet, classroom.name);
    }
    
    // Save workbook to file
    const fileName = `seating_plan_${seatingPlan._id}.xlsx`;
    const filePath = path.join(__dirname, '..', 'uploads', fileName);
    
    xlsx.writeFile(workbook, filePath);
    
    // Return file download link
    const fileUrl = `/api/seating-plans/${seatingPlan._id}/download`;
    res.status(200).json({ fileUrl, fileName });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper function to get ordinal suffix
function getSuffix(i) {
  const j = i % 10;
  const k = i % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

// Helper function to find a course with the most suitable number of students for a column
function findOptimalCourse(courseStudents, courseCodes, availableSeats, currentIdx) {
  let bestDifference = Number.MAX_SAFE_INTEGER;
  let bestCourseIdx = -1;
  
  // Find the course with student count closest to the available seats
  for (let i = 0; i < courseCodes.length; i++) {
    if (i === currentIdx) continue; // Skip current course
    
    const studentCount = courseStudents[courseCodes[i]].length;
    if (studentCount === 0) continue; // Skip courses with no students
    
    // Calculate how well this course fits the available seats
    const difference = Math.abs(studentCount - availableSeats);
    
    // Prefer courses that are close to filling the column exactly
    if (difference < bestDifference) {
      bestDifference = difference;
      bestCourseIdx = i;
    }
    
    // If we found a perfect match, use it immediately
    if (difference === 0) break;
  }
  
  return bestCourseIdx;
}

// Helper function to optimize course distribution to minimize leftover students
function optimizeCourseDistribution(courseCodes, courseStudents) {
  // Skip optimization if we have less than 2 courses
  if (courseCodes.length < 2) {
    return [0];
  }
  
  // Find the best pair for each course to minimize leftover students
  const pairs = [];
  
  // For each course, find the best pairing that minimizes leftover students
  for (let i = 0; i < courseCodes.length; i++) {
    let minLeftover = Number.MAX_SAFE_INTEGER;
    let bestPair = 1; // Default to the second course
    let bestBalance = Number.MAX_SAFE_INTEGER; // Track balance between courses
    
    for (let j = 0; j < courseCodes.length; j++) {
      if (i === j) continue; // Skip the same course
      
      const course1Students = courseStudents[courseCodes[i]].length;
      const course2Students = courseStudents[courseCodes[j]].length;
      
      // Calculate available seats in columns (assuming equal distribution)
      const totalStudents = course1Students + course2Students;
      const availableSeatsPerColumn = Math.ceil(totalStudents / 2);
      
      // Calculate how many students would be left after filling columns evenly
      const leftoverCol1 = Math.max(0, course1Students - availableSeatsPerColumn);
      const leftoverCol2 = Math.max(0, course2Students - availableSeatsPerColumn); 
      const totalLeftover = leftoverCol1 + leftoverCol2;
      
      // Calculate balance metric (how evenly distributed students are)
      const balance = Math.abs(course1Students - course2Students);
      
      // Prioritize minimizing leftover students, then consider balance
      if (totalLeftover < minLeftover || 
          (totalLeftover === minLeftover && balance < bestBalance)) {
        minLeftover = totalLeftover;
        bestBalance = balance;
        bestPair = j;
      }
    }
    
    pairs[i] = bestPair;
  }
  
  return pairs;
}

// Download the exported Excel file
router.get('/:id/download', async (req, res) => {
  try {
    const seatingPlan = await SeatingPlan.findById(req.params.id);
    if (!seatingPlan) {
      return res.status(404).json({ message: 'Seating plan not found' });
    }
    
    const fileName = `seating_plan_${seatingPlan._id}.xlsx`;
    const filePath = path.join(__dirname, '..', 'uploads', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found. Generate the export first.' });
    }
    
    res.download(filePath, fileName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a seating plan status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  
  if (!status || !['draft', 'finalized', 'published'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }
  
  try {
    const updatedSeatingPlan = await SeatingPlan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!updatedSeatingPlan) {
      return res.status(404).json({ message: 'Seating plan not found' });
    }
    
    res.status(200).json(updatedSeatingPlan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update seating plan allocations
router.patch('/:id', async (req, res) => {
  const { classroomAllocations } = req.body;
  
  if (!classroomAllocations) {
    return res.status(400).json({ message: 'Classroom allocations are required' });
  }
  
  try {
    const seatingPlan = await SeatingPlan.findById(req.params.id);
    if (!seatingPlan) {
      return res.status(404).json({ message: 'Seating plan not found' });
    }
    
    if (seatingPlan.status === 'published') {
      return res.status(400).json({ message: 'Cannot modify a published seating plan' });
    }
    
    seatingPlan.classroomAllocations = classroomAllocations;
    
    // Recalculate statistics
    const courseCounts = {};
    let totalStudents = 0;
    
    classroomAllocations.forEach(allocation => {
      const occupiedSeats = allocation.seatMatrix.flat().filter(seat => seat.isOccupied && seat.student).length;
      totalStudents += occupiedSeats;
      
      allocation.seatMatrix.flat().forEach(seat => {
        if (seat.student) {
          courseCounts[seat.student.courseCode] = (courseCounts[seat.student.courseCode] || 0) + 1;
        }
      });
    });
    
    const classroomUtilization = classroomAllocations.map(allocation => {
      const occupiedSeats = allocation.seatMatrix.flat().filter(seat => seat.isOccupied && seat.student).length;
      return {
        classroom: allocation.classroom.name,
        utilization: Math.round((occupiedSeats / allocation.classroom.capacity) * 100)
      };
    });
    
    seatingPlan.statistics = {
      ...seatingPlan.statistics,
      totalStudents,
      courseCounts,
      classroomUtilization
    };
    
    const updatedSeatingPlan = await seatingPlan.save();
    res.status(200).json(updatedSeatingPlan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a seating plan
router.delete('/:id', async (req, res) => {
  try {
    const deletedSeatingPlan = await SeatingPlan.findByIdAndDelete(req.params.id);
    if (!deletedSeatingPlan) {
      return res.status(404).json({ message: 'Seating plan not found' });
    }
    
    // Delete associated Excel file if it exists
    const fileName = `seating_plan_${req.params.id}.xlsx`;
    const filePath = path.join(__dirname, '..', 'uploads', fileName);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(200).json({ message: 'Seating plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;