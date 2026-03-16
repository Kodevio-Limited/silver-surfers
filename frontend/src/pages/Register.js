import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchJSON } from '../config/apiBase';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for invite parameters
  const urlParams = new URLSearchParams(location.search);
  const inviteToken = urlParams.get('invite') || localStorage.getItem('pendingInviteToken');
  const inviteEmail = urlParams.get('email') || localStorage.getItem('pendingInviteEmail');
  
  const [form, setForm] = useState({ email: inviteEmail || '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setMessage(null);
    if (!form.email || !form.password) { setError('Email and password required'); return; }
    
    // If there's an invite email requirement, validate email match
    if (inviteEmail && form.email.toLowerCase() !== inviteEmail.toLowerCase()) {
      setError(`This invitation is for ${inviteEmail}. Please use that email address to create your account.`);
      return;
    }
    
    setLoading(true);
    try {
  const { ok, data, status } = await fetchJSON('/auth/register', { method: 'POST', body: JSON.stringify(form) });
  if (!ok) throw new Error(data?.error || `Registration failed (status ${status})`);
      
      if (inviteToken) {
        setMessage('Registration successful. Check your email to verify your account, then you will be redirected to accept your team invitation.');
      } else {
        setMessage('Registration successful. Check your email to verify your account.');
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  
  const handleGoToLogin = () => {
    if (inviteToken) {
      navigate(`/login?invite=${inviteToken}&email=${encodeURIComponent(inviteEmail || '')}`);
    } else {
      navigate('/login');
    }
  };

  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <h2 className="heading-page font-bold text-gray-900 mb-6 text-center">Create your account</h2>
        
        {inviteEmail && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-900">Team Invitation</p>
                <p className="text-sm text-blue-800 mt-1">
                  Create an account with <strong>{inviteEmail}</strong> to accept your team invitation.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@email.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-400 focus:ring-2 focus:ring-blue-600 text-gray-900 bg-gray-50"
            autoComplete="email"
            required
            readOnly={!!inviteEmail}
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-800 font-semibold mb-2">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-gray-400 focus:ring-2 focus:ring-blue-600 text-gray-900 bg-gray-50"
            autoComplete="new-password"
            required
          />
        </div>
        {error && <div className="mb-4 text-red-700 text-small text-center">{error}</div>}
        {message && (
          <div className="mb-4 text-green-700 text-small text-center">
            {message}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 via-green-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          {loading ? 'Creating...' : 'Create Account'}
        </button>
        {message && (
          <button
            type="button"
            onClick={handleGoToLogin}
            className="w-full mt-3 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-xl transition"
          >
            Go to Login
          </button>
        )}
        <p className="text-caption text-gray-700 mt-4 text-center">
          Already have an account? <a href={inviteToken ? `/login?invite=${inviteToken}&email=${encodeURIComponent(inviteEmail || '')}` : '/login'} className="text-blue-700 underline">Sign in</a>
        </p>
      </form>
    </div>
  );
}
