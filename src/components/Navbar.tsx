import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { School, BookOpen, Home, MapPin, FileSpreadsheet, Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { path: '/exams', icon: <BookOpen size={20} />, label: 'Exams' },
    { path: '/classrooms', icon: <MapPin size={20} />, label: 'Classrooms' },
    { path: '/seating-plans', icon: <FileSpreadsheet size={20} />, label: 'Seating Plans' },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-gradient-to-r from-indigo-800 to-indigo-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <School className="h-8 w-8 mr-2" />
              <span className="text-xl font-bold">ExamSeatPlanner</span>
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === item.path
                      ? 'bg-indigo-700 text-white'
                      : 'text-indigo-100 hover:bg-indigo-600 transition-colors duration-200'
                  }`}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-indigo-100 hover:text-white hover:bg-indigo-700 focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === item.path
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-100 hover:bg-indigo-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;