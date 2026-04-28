// //frontend/src/components/AdminNavbar.js
// import { Link, useNavigate } from 'react-router-dom';
// import { Plane, LogOut, LayoutDashboard, Users, MapPin, Hotel, PlaneTakeoff } from 'lucide-react';

// const AdminNavbar = () => {
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     localStorage.clear(); // Clear all auth data
//     navigate('/admin-login');
//   };

//   return (
//     <nav className="bg-gray-900 text-white shadow-lg">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between items-center h-16">
//           {/* Logo */}
//           <Link to="/admin" className="flex items-center space-x-3">
//             <Plane className="h-10 w-10 text-blue-400" />
//             <span className="text-2xl font-bold">Ghumna Jau Admin</span>
//           </Link>

//           {/* Navigation Links */}
//           <div className="hidden md:flex items-center space-x-8">
//             <Link
//               to="/admin"
//               className="flex items-center space-x-2 hover:text-blue-400 transition"
//             >
//               <LayoutDashboard className="h-5 w-5" />
//               <span>Dashboard</span>
//             </Link>
//             <Link
//               to="/admin/users"
//               className="flex items-center space-x-2 hover:text-blue-400 transition"
//             >
//               <Users className="h-5 w-5" />
//               <span>Users</span>
//             </Link>
//             <Link
//               to="/admin/destinations"
//               className="flex items-center space-x-2 hover:text-blue-400 transition"
//             >
//               <MapPin className="h-5 w-5" />
//               <span>Destinations</span>
//             </Link>
//             <Link
//               to="/admin/hotels"
//               className="flex items-center space-x-2 hover:text-blue-400 transition"
//             >
//               <Hotel className="h-5 w-5" />
//               <span>Hotels</span>
//             </Link>
            
//             <Link
//               to="/admin/flights"
//               className="flex items-center space-x-2 hover:text-blue-400 transition"
//             >
//               <PlaneTakeoff className="h-5 w-5" />
//               <span>Flights</span>
//             </Link>

//             {/* Logout */}
//             <button
//               onClick={handleLogout}
//               className="flex items-center space-x-2 hover:text-red-400 transition"
//             >
//               <LogOut className="h-5 w-5" />
//               <span>Logout</span>
//             </button>
//           </div>

//           {/* Mobile Menu Button (optional - can add mobile toggle later) */}
//           <div className="md:hidden">
//             <button className="text-white hover:text-blue-400">
//               <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
//               </svg>
//             </button>
//           </div>
//         </div>
//       </div>
//     </nav>
//   );
// };

// export default AdminNavbar;

// frontend/src/components/AdminNavbar.js
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane, LogOut, LayoutDashboard, Users, MapPin,
  Hotel, PlaneTakeoff, Utensils, Zap, Menu, X,
} from 'lucide-react';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { localStorage.clear(); navigate('/admin-login'); };

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
            <button onClick={handleLogout}
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
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm hover:text-red-400 hover:bg-white/5 transition border-t border-gray-700 mt-2 pt-3">
            <LogOut className="h-4 w-4" /><span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar;