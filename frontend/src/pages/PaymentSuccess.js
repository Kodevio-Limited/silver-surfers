import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPayment } from '../api';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchaseDetails, setPurchaseDetails] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('No payment session found.');
      setLoading(false);
      return;
    }

    confirmOneTimePayment(sessionId);
  }, [searchParams]);

  const confirmOneTimePayment = async (sessionId) => {
    try {
      setLoading(true);
      
      // Call the backend to confirm payment and grant credit
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}/payment-success?session_id=${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setPurchaseDetails({
          oneTimeScans: data.oneTimeScans,
          planId: data.purchaseDetails?.planId,
          amount: data.purchaseDetails?.amount,
          date: data.purchaseDetails?.date
        });
        
        console.log('✅ Payment confirmed, credits granted:', data.oneTimeScans);
      }
    } catch (err) {
      console.error('Payment confirmation error:', err);
      setError('Failed to confirm payment. Please contact support if your credit was not added.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirming Payment...</h2>
          <p className="text-gray-600">Please wait while we process your purchase.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/services')}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              View Plans
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-2xl w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-xl text-gray-600">Thank you for your purchase</p>
        </div>

        {/* Purchase Details */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 mb-6 border border-orange-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            Your One-Time Scan Credit
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Available Scans</div>
              <div className="text-3xl font-bold text-orange-600">{purchaseDetails?.oneTimeScans || 0}</div>
            </div>
            
            {purchaseDetails?.amount && (
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Amount Paid</div>
                <div className="text-3xl font-bold text-gray-900">${(purchaseDetails.amount / 100).toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-blue-50 rounded-2xl p-6 mb-6 border border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">What's Next?</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Your one-time scan credit has been added to your account</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Click the button below to start your accessibility audit</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>You'll receive a comprehensive PDF report via email</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/checkout')}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Start Your Audit Now
          </button>
          <button
            onClick={() => navigate('/account')}
            className="flex-1 px-8 py-4 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-300"
          >
            View Account
          </button>
        </div>

        {/* Email Confirmation Note */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>A confirmation email has been sent to your registered email address.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
