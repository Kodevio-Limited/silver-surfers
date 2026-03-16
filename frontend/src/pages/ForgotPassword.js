import React, { useState } from 'react';
import { forgotPassword } from '../api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setError(''); setLoading(true);
    const res = await forgotPassword(email);
    setLoading(false);
    if (res.error) setError(res.error); else setMsg(res.message || 'Password reset email sent (if account exists).');
  };

  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10 px-4">
      <form onSubmit={onSubmit} className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <h2 className="heading-page font-bold text-gray-900 mb-6 text-center">Forgot Password</h2>
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-400 focus:ring-2 focus:ring-blue-600 text-gray-900 bg-gray-50"
            required
          />
        </div>
        {error && <div className="mb-2 text-red-700 text-sm text-center">{error}</div>}
        {msg && <div className="mb-2 text-green-700 text-sm text-center">{msg}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-700 via-green-700 to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          {loading? 'Sending...' : 'Send Reset Email'}
        </button>
        <p className="text-caption text-gray-700 mt-4 text-center">
          <a href="/login" className="text-blue-700 underline">Back to login</a>
        </p>
      </form>
    </div>
  );
};

export default ForgotPassword;
