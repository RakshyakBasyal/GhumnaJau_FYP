// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext'; 
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
import MyBookings from './pages/MyBookings';
import AdminBookings from './pages/AdminBookings';
import Flights from './pages/Flights';
import ManageFlights from './pages/ManageFlights';
import AuthGoogleSuccess from './pages/AuthGoogleSuccess';
import PaymentResult from './pages/PaymentResult';
import Itinerary from './pages/Itinerary';
import ItineraryDetail from './pages/ItineraryDetail';


   

function App() {
  return (
    <ToastProvider>
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
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route
            path="/admin/flights"
            element={
              <ProtectedRoute adminOnly>
                <ManageFlights />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/manage-flights" element={<ManageFlights />} />

          {/* ALL User Pages - With Layout (Navbar + Footer) */}
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/destinations/:id" element={<DestinationDetail />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotels/:id" element={<HotelDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/payment/result" element={<PaymentResult />} />
            <Route path="/auth/google/success" element={<AuthGoogleSuccess />} />
            <Route path="/itinerary" element={<Itinerary />} />
            <Route path="/itinerary/:id" element={<ItineraryDetail />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;