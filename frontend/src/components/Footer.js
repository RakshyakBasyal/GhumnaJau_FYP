import { Link } from 'react-router-dom';
import { Plane, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & Description */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Plane className="h-7 w-7 text-blue-400" />
              <span className="text-xl font-bold">Ghumna Jau</span>
            </div>
            <p className="text-sm text-gray-400">
              Your trusted travel companion for unforgettable journeys across Nepal.
            </p>
          </div>

          {/* Company Links */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Company</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white transition">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Contact Us</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2 text-gray-400">
                <Mail className="h-4 w-4" />
                <span>info@ghumnajau.com</span>
              </li>
              <li className="flex items-center space-x-2 text-gray-400">
                <Phone className="h-4 w-4" />
                <span>+977 1-1234567</span>
              </li>
              <li className="flex items-center space-x-2 text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>Kathmandu, Nepal</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-6 pt-4 text-center text-xs text-gray-400">
          <p>&copy; 2025 Ghumna Jau. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;