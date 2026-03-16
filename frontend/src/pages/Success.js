import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPayment } from '../api';

const Success = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState('Confirming your payment…');
  const navigate = useNavigate();
  const ranRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (ranRef.current) return; // prevent duplicate calls in StrictMode or refresh loops
      ranRef.current = true;
      if (!sessionId) {
        setStatus('Missing session id.');
        return;
      }
      const res = await confirmPayment(sessionId);
      if (res.error) {
        setStatus(`Error: ${res.error}`);
      } else {
        setStatus('Payment confirmed. Your audit is queued! Redirecting…');
        setTimeout(() => navigate('/'), 2500);
      }
    };
    run();
  }, [sessionId, navigate]);

  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md text-center">
        <h2 className="heading-page font-bold text-gray-900 mb-2">Checkout Success</h2>
        <p className="text-gray-700">{status}</p>
      </div>
    </div>
  );
};

export default Success;
