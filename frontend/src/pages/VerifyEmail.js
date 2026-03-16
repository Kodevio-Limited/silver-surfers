import React, { useEffect, useState } from 'react';
import { verifyEmail, resendVerification } from '../api';
import { useNavigate, useSearchParams } from 'react-router-dom';

const VerifyEmail = () => {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect') || '/';

  const handleVerify = async (e, overrideToken) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    const useToken = (overrideToken ?? token)?.trim();
    if (!useToken) {
      setLoading(false);
      setError('Token required');
      return;
    }
    const res = await verifyEmail(useToken);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    navigate(redirect, { replace: true });
  };

  // Auto-submit if token present in query string
  useEffect(() => {
    const qsToken = searchParams.get('token');
    if (qsToken) {
      setToken(qsToken);
      // Call verify directly with the query token to avoid state timing issues
      handleVerify(undefined, qsToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    if (!email) { setError('Enter your email first'); return; }
    setError('');
    setInfo('');
    setResendLoading(true);
    const res = await resendVerification(email.trim());
    setResendLoading(false);
    if (res?.error) setError(res.error); else setInfo('Verification email resent.');
  };

  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10 px-4">
      <form onSubmit={handleVerify} className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <h2 className="heading-page font-bold text-gray-900 mb-6 text-center">Verify Email</h2>
        {searchParams.get('token') && loading && (
          <div className="mb-4 text-sm text-gray-700 text-center">Verifying your link...</div>
        )}
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-2">Verification Token</label>
          <input type="text" required value={token} onChange={e => setToken(e.target.value)} placeholder="Paste token" className="w-full px-4 py-3 rounded-xl border border-gray-400 focus:ring-2 focus:ring-blue-600 text-gray-900 bg-gray-50" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-2">Email (for resend)</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="w-full px-4 py-3 rounded-xl border border-gray-400 focus:ring-2 focus:ring-green-600 text-gray-900 bg-gray-50" />
        </div>
        {error && <div className="mb-4 text-red-700 text-sm text-center">{error}</div>}
        {info && <div className="mb-4 text-green-700 text-sm text-center">{info}</div>}
        <button type="submit" disabled={loading} className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 via-green-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
          {loading ? 'Verifying...' : 'Verify'}
        </button>
        <button type="button" disabled={resendLoading} onClick={handleResend} className="w-full mt-3 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-xl transition">
          {resendLoading ? 'Resending...' : 'Resend Email'}
        </button>
      </form>
    </div>
  );
};

export default VerifyEmail;
