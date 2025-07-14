# Exam Seat Planner

A comprehensive MERN stack application for managing exam seating arrangements in educational institutions.

## Features

- **Exam Management**: Create and manage exams with multiple courses
- **Course Data Import**: Import student data from Excel files with roll number validation
- **Classroom Management**: Configure classrooms with custom layouts and capacities
- **Seating Plan Generation**: Automatically generate optimized seating arrangements
- **Export Functionality**: Export seating plans to Excel with detailed layouts
- **Real-time Updates**: Dynamic updates with toast notifications

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **File Handling**: Multer for uploads, XLSX for Excel processing
- **UI Components**: Lucide React icons, React Dropzone
- **Notifications**: React Toastify

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/seat-planner.git
cd seat-planner
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```
MONGODB_URI=mongodb://localhost:27017/seat-planner
PORT=5001
```

5. Start the development servers:
```bash
npm run dev:full
```

This will start both the React frontend (port 5173) and Express backend (port 5001).

## Usage

### Creating an Exam
1. Navigate to the Exams page
2. Click "Create New Exam"
3. Enter exam name and date

### Importing Course Data
1. Open an exam detail page
2. Click "Import Course Data"
3. Upload an Excel file with "Roll No." and "Name" columns
4. Fill in course details (code, title, semester, branch)

### Generating Seating Plans
1. Go to Seating Plans page
2. Select an exam and classrooms
3. Click "Generate Seating Plan"
4. Review and export the plan

### Excel File Format
Student data Excel files should have the following columns:
- `Roll No.`: Student roll numbers (format: BT{YY}{BRANCH}{XXX})
- `Name`: Student names

## API Endpoints

### Exams
- `GET /api/exams` - Get all exams
- `POST /api/exams` - Create new exam
- `POST /api/exams/:id/import` - Import course data

### Classrooms
- `GET /api/classrooms` - Get all classrooms
- `POST /api/classrooms` - Create new classroom
- `POST /api/classrooms/bulk-create-default` - Create default classrooms

### Seating Plans
- `GET /api/seating-plans` - Get all seating plans
- `POST /api/seating-plans/generate` - Generate new seating plan
- `GET /api/seating-plans/:id/export` - Export seating plan to Excel

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.