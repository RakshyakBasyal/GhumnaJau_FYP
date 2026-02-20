// frontend/src/pages/PaymentResult.jsx
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertOctagon, ArrowRight, RotateCcw } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const status = searchParams.get('status');
  const bookingId = searchParams.get('bookingId');

  const isSuccess = status === 'success';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className={`w-full max-w-lg p-10 rounded-2xl shadow-2xl text-center border ${
        isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        {isSuccess ? (
          <>
            <CheckCircle className="h-24 w-24 text-green-600 mx-auto mb-6 animate-bounce" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
            <p className="text-lg text-gray-700 mb-6">
              Your booking has been confirmed.
            </p>
            {bookingId && (
              <p className="text-sm text-gray-500 mb-8">
                Booking ID: <span className="font-mono">{bookingId}</span>
              </p>
            )}
            <button
              onClick={() => navigate('/my-bookings')}
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 mx-auto"
            >
              View My Bookings <ArrowRight className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <AlertOctagon className="h-24 w-24 text-red-600 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Failed</h1>
            <p className="text-lg text-gray-700 mb-6">
              Payment could not be completed. Please try again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate(-1)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-5 w-5" /> Try Again
              </button>
              <button
                onClick={() => navigate('/hotels')}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold transition"
              >
                Back to Hotels
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;