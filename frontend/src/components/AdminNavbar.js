// frontend/src/components/AdminNavbar.js
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane, LogOut, LayoutDashboard, Users, MapPin,
  Hotel, PlaneTakeoff, Utensils, Zap, Menu, X,
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => { 
    localStorage.clear(); 
    setShowLogoutConfirm(false);
    navigate('/admin-login'); 
  };

  const links = [
    { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard'    },
    { to: '/admin/users',        icon: Users,           label: 'Users'        },
    { to: '/admin/destinations', icon: MapPin,          label: 'Destinations' },
    { to: '/admin/hotels',       icon: Hotel,           label: 'Hotels'       },
    { to: '/admin/flights',      icon: PlaneTakeoff,    label: 'Flights'      },
    { to: '/admin/restaurants',  icon: Utensils,        label: 'Restaurants'  },
    { to: '/admin/activities',   icon: Zap,             label: 'Activities'   },
  ];

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/admin" className="flex items-center space-x-2 flex-shrink-0">
            <Plane className="h-8 w-8 text-blue-400" />
            <span className="text-lg font-bold hidden sm:block">Ghumna Jau Admin</span>
          </Link>

          {/* Desktop */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:text-blue-400 hover:bg-white/5 transition">
                <Icon className="h-4 w-4" /><span>{label}</span>
              </Link>
            ))}
            <button onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:text-red-400 hover:bg-white/5 transition ml-2">
              <LogOut className="h-4 w-4" /><span>Logout</span>
            </button>
          </div>

          {/* Mobile toggle */}
          <button className="lg:hidden p-2" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-700 bg-gray-900 px-4 py-3 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm hover:text-blue-400 hover:bg-white/5 transition">
              <Icon className="h-4 w-4" /><span>{label}</span>
            </Link>
          ))}
          <button onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm hover:text-red-400 hover:bg-white/5 transition border-t border-gray-700 mt-2 pt-3">
            <LogOut className="h-4 w-4" /><span>Logout</span>
          </button>
        </div>
      )}
      {/* Logout Confirmation */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Admin Logout"
        message="Are you sure you want to log out from the admin dashboard?"
        confirmText="Logout"
        confirmColor="bg-red-600 hover:bg-red-700"
      />
    </nav>
  );
};

export default AdminNavbar;