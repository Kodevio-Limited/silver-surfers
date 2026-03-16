import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setToken(params.get('token') || ''); }, [params]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    const res = await resetPassword(token, password);
    setLoading(false);
    if (res.error) setError(res.error); else { setMsg('Password reset successful. Redirecting…'); setTimeout(()=>navigate('/'), 1200); }
  };

  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10 px-4">
      <form onSubmit={onSubmit} className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <h1 className="heading-page font-bold text-gray-900 mb-6 text-center">Reset Password</h1>
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-2">New password</label>
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-400 focus:ring-2 focus:ring-blue-600 text-gray-900 bg-gray-50"
            placeholder="••••••••"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-2">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={e=>setConfirm(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-400 focus:ring-2 focus:ring-green-600 text-gray-900 bg-gray-50"
            placeholder="••••••••"
            required
          />
        </div>
        {error && <p className="mb-2 text-red-700 text-sm text-center">{error}</p>}
        {msg && <p className="mb-2 text-green-700 text-sm text-center">{msg}</p>}
        <button
          type="submit"
          disabled={loading || !token}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-700 via-green-700 to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>
        <p className="text-caption text-gray-700 mt-4 text-center">
          <a href="/login" className="text-blue-700 underline">Back to login</a>
        </p>
      </form>
    </div>
  );
};

export default ResetPassword;
