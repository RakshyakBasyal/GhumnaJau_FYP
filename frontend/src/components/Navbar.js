// ;// src/components/Navbar.jsx
// import { useState, useEffect } from "react";
// import { Link, useLocation, useNavigate } from "react-router-dom";
// import { Plane, LogOut, Menu, X, User } from "lucide-react";

// const Navbar = () => {
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [userName, setUserName] = useState("");
//   const [userRole, setUserRole] = useState("");
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
//   const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
//   const [signInDropdownOpen, setSignInDropdownOpen] = useState(false);

//   const location = useLocation();
//   const navigate = useNavigate();

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     const storedUsername = localStorage.getItem("username") || "";
//     const storedRole = localStorage.getItem("userRole") || "";

//     if (token) {
//       setIsLoggedIn(true);
//       setUserName(storedUsername);
//       setUserRole(storedRole);
//     } else {
//       setIsLoggedIn(false);
//       setUserName("");
//       setUserRole("");
//     }

//     // close dropdowns on route change
//     setProfileDropdownOpen(false);
//     setSignInDropdownOpen(false);
//     setMobileMenuOpen(false);
//   }, [location.pathname]);

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("userRole");
//     localStorage.removeItem("username");
//     localStorage.removeItem("userEmail");
//     localStorage.removeItem("userPhone");

//     setIsLoggedIn(false);
//     setProfileDropdownOpen(false);
//     setMobileMenuOpen(false);

//     navigate("/");
//   };

//   const navLinks = [
//     { to: "/destinations", label: "Destinations" },
//     { to: "/hotels", label: "Hotels" },
//     { to: "/flights", label: "Flights" },
//     { to: "/restaurants", label: "Restaurants" },
//     { to: "/activities", label: "Activities" },
//     { to: "/social-feed", label: "Social Feed" },
//     { to: "/travel-logs", label: "Travel Logs" },
//     { to: "/buddy-matching", label: "Find Buddies" },
//   ];

//   // ✅ keep your old logic: admin label vs normal username
//   const displayName = userRole === "ADMIN" ? "Admin" : (userName || "User");

//   return (
//     <nav className="bg-white shadow-md sticky top-0 z-50">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between items-center h-16">
//           <Link to="/" className="flex items-center space-x-2">
//             <Plane className="h-8 w-8 text-blue-600" />
//             <span className="text-2xl font-bold text-gray-800">Ghumna Jau</span>
//           </Link>

//           {/* Desktop */}
//           <div className="hidden md:flex items-center space-x-8">
//             {navLinks.map((link) => (
//               <Link
//                 key={link.to}
//                 to={link.to}
//                 className="text-gray-600 hover:text-blue-600 font-medium transition"
//               >
//                 {link.label}
//               </Link>
//             ))}

//             {isLoggedIn ? (
//               <div className="relative">
//                 {/* ✅ ONLY UI changed here: icon + username button */}
//                 <button
//                   onClick={() => setProfileDropdownOpen((p) => !p)}
//                   className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
//                 >
//                   <User className="w-4 h-4" />
//                   <span className="max-w-[140px] truncate">{displayName}</span>
//                 </button>

//                 {/* Dropdown - same logic */}
//                 {profileDropdownOpen && (
//                   <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
//                     {/* Normal User: Profile + Logout */}
//                     {userRole !== "ADMIN" && (
//                       <>
//                         <Link
//                           to="/profile"
//                           className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
//                           onClick={() => setProfileDropdownOpen(false)}
//                         >
//                           Profile
//                         </Link>
//                         <button
//                           onClick={handleLogout}
//                           className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 flex items-center space-x-2"
//                         >
//                           <LogOut className="h-4 w-4" />
//                           <span>Logout</span>
//                         </button>
//                       </>
//                     )}

//                     {/* Admin: Admin Dashboard + Logout */}
//                     {userRole === "ADMIN" && (
//                       <>
//                         <Link
//                           to="/admin"
//                           className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
//                           onClick={() => setProfileDropdownOpen(false)}
//                         >
//                           Admin Dashboard
//                         </Link>
//                         <button
//                           onClick={handleLogout}
//                           className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 flex items-center space-x-2"
//                         >
//                           <LogOut className="h-4 w-4" />
//                           <span>Logout</span>
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 )}
//               </div>
//             ) : (
//               <div className="relative">
//                 <button
//                   onClick={() => setSignInDropdownOpen((p) => !p)}
//                   className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition"
//                 >
//                   Sign In
//                 </button>

//                 {signInDropdownOpen && (
//                   <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
//                     <Link
//                       to="/login"
//                       className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
//                       onClick={() => setSignInDropdownOpen(false)}
//                     >
//                       Login
//                     </Link>
//                     <Link
//                       to="/register"
//                       className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
//                       onClick={() => setSignInDropdownOpen(false)}
//                     >
//                       Register
//                     </Link>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* Mobile toggle */}
//           <button
//             className="md:hidden"
//             onClick={() => setMobileMenuOpen((p) => !p)}
//           >
//             {mobileMenuOpen ? (
//               <X className="h-6 w-6" />
//             ) : (
//               <Menu className="h-6 w-6" />
//             )}
//           </button>
//         </div>
//       </div>

//       {/* Mobile Menu */}
//       {mobileMenuOpen && (
//         <div className="md:hidden bg-white border-t">
//           <div className="px-4 py-4 space-y-3">
//             {navLinks.map((link) => (
//               <Link
//                 key={link.to}
//                 to={link.to}
//                 className="block py-2 text-gray-600 hover:text-blue-600"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 {link.label}
//               </Link>
//             ))}

//             {isLoggedIn ? (
//               <>
//                 {userRole !== "ADMIN" && (
//                   <Link
//                     to="/profile"
//                     className="block py-2 text-gray-600 hover:text-blue-600"
//                     onClick={() => setMobileMenuOpen(false)}
//                   >
//                     Profile
//                   </Link>
//                 )}
//                 {userRole === "ADMIN" && (
//                   <Link
//                     to="/admin"
//                     className="block py-2 text-gray-600 hover:text-blue-600"
//                     onClick={() => setMobileMenuOpen(false)}
//                   >
//                     Admin Dashboard
//                   </Link>
//                 )}
//                 <button
//                   onClick={handleLogout}
//                   className="block w-full text-left py-2 text-red-600"
//                 >
//                   Logout
//                 </button>
//               </>
//             ) : (
//               <>
//                 <Link
//                   to="/login"
//                   className="block py-2 text-gray-600 hover:text-blue-600"
//                   onClick={() => setMobileMenuOpen(false)}
//                 >
//                   Login
//                 </Link>
//                 <Link
//                   to="/register"
//                   className="block py-2 text-gray-600 hover:text-blue-600"
//                   onClick={() => setMobileMenuOpen(false)}
//                 >
//                   Register
//                 </Link>
//               </>
//             )}
//           </div>
//         </div>
//       )}
//     </nav>
//   );
// };

// export default Navbar;


// src/components/Navbar.jsx
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plane, LogOut, Menu, X, User } from "lucide-react";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [signInDropdownOpen, setSignInDropdownOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username") || "";
    const storedRole = localStorage.getItem("userRole") || "";

    if (token) {
      setIsLoggedIn(true);
      setUserName(storedUsername);
      setUserRole(storedRole);
    } else {
      setIsLoggedIn(false);
      setUserName("");
      setUserRole("");
    }

    // close dropdowns on route change
    setProfileDropdownOpen(false);
    setSignInDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPhone");

    setIsLoggedIn(false);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);

    navigate("/");
  };

  const navLinks = [
    { to: "/destinations", label: "Destinations" },
    { to: "/hotels", label: "Hotels" },
    { to: "/flights", label: "Flights" },
    { to: "/restaurants", label: "Restaurants" },
    { to: "/activities", label: "Activities" },
    { to: "/social-feed", label: "Social Feed" },
    { to: "/travel-logs", label: "Travel Logs" },
    { to: "/buddy-matching", label: "Find Buddies" },
  ];

  // ✅ ONLY FIRST NAME for normal users, still "Admin" for admin
  const firstName = (userName || "User").trim().split(/\s+/)[0] || "User";
  const displayName = userRole === "ADMIN" ? "Admin" : firstName;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Plane className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-800">Ghumna Jau</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-gray-600 hover:text-blue-600 font-medium transition"
              >
                {link.label}
              </Link>
            ))}

            {isLoggedIn ? (
              <div className="relative">
                {/* ✅ boxy profile button stays same */}
                <button
                  onClick={() => setProfileDropdownOpen((p) => !p)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                >
                  <User className="w-4 h-4" />
                  <span className="max-w-[140px] truncate">{displayName}</span>
                </button>

                {/* Dropdown - same logic */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    {/* Normal User: Profile + Logout */}
                    {userRole !== "ADMIN" && (
                      <>
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </button>
                      </>
                    )}

                    {/* Admin: Admin Dashboard + Logout */}
                    {userRole === "ADMIN" && (
                      <>
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setSignInDropdownOpen((p) => !p)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition"
                >
                  Sign In
                </button>

                {signInDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <Link
                      to="/login"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setSignInDropdownOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setSignInDropdownOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen((p) => !p)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block py-2 text-gray-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {isLoggedIn ? (
              <>
                {userRole !== "ADMIN" && (
                  <Link
                    to="/profile"
                    className="block py-2 text-gray-600 hover:text-blue-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                )}
                {userRole === "ADMIN" && (
                  <Link
                    to="/admin"
                    className="block py-2 text-gray-600 hover:text-blue-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left py-2 text-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 text-gray-600 hover:text-blue-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block py-2 text-gray-600 hover:text-blue-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

