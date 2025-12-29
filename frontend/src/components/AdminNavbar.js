// src/components/AdminNavbar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { Plane, LogOut, LayoutDashboard, Users, MapPin, Hotel, PlaneTakeoff } from 'lucide-react';

const AdminNavbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear(); // Clear all auth data
    navigate('/admin-login');
  };

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/admin" className="flex items-center space-x-3">
            <Plane className="h-10 w-10 text-blue-400" />
            <span className="text-2xl font-bold">Ghumna Jau Admin</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/admin"
              className="flex items-center space-x-2 hover:text-blue-400 transition"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center space-x-2 hover:text-blue-400 transition"
            >
              <Users className="h-5 w-5" />
              <span>Users</span>
            </Link>
            <Link
              to="/admin/destinations"
              className="flex items-center space-x-2 hover:text-blue-400 transition"
            >
              <MapPin className="h-5 w-5" />
              <span>Destinations</span>
            </Link>
            <Link
              to="/admin/hotels"
              className="flex items-center space-x-2 hover:text-blue-400 transition"
            >
              <Hotel className="h-5 w-5" />
              <span>Hotels</span>
            </Link>
            <Link
              to="/admin/flights"
              className="flex items-center space-x-2 hover:text-blue-400 transition"
            >
              <PlaneTakeoff className="h-5 w-5" />
              <span>Flights</span>
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 hover:text-red-400 transition"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button (optional - can add mobile toggle later) */}
          <div className="md:hidden">
            <button className="text-white hover:text-blue-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;