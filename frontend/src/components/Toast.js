// frontend/src/components/Toast.jsx
import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto-hide after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : type === 'info' ? 'bg-blue-600' : 'bg-red-600';
  const Icon = type === 'success' ? CheckCircle : type === 'info' ? CheckCircle : AlertCircle;

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white ${bgColor} animate-slide-in`}>
      <Icon className="h-6 w-6" />
      <p className="font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto hover:opacity-80">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Toast;