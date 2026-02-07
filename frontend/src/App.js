// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Destinations from './pages/Destinations';
import DestinationDetail from './pages/DestinationDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ManageUsers from './pages/ManageUsers';
import ManageDestinations from './pages/ManageDestinations';
import ManageHotels from './pages/ManageHotels';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile';
import Hotels from './pages/Hotels';
import HotelDetail from './pages/HotelDetail';

function App() {
  return (
    <Router>
      <Routes>
        {/* Full-screen pages (no Navbar/Footer) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Admin Section - Protected & No Layout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/destinations"
          element={
            <ProtectedRoute adminOnly>
              <ManageDestinations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/hotels"
          element={
            <ProtectedRoute adminOnly>
              <ManageHotels />
            </ProtectedRoute>
          }
        />

        {/* ALL User Pages - With Layout (Navbar + Footer) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:id" element={<DestinationDetail />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/hotels/:id" element={<HotelDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;