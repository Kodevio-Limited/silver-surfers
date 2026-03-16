import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getMe } from '../api';

const ProtectedRoute = ({ role = null, children }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await getMe();
      if (!mounted) return;
      const user = res?.user;
      // If no role is specified, allow any authenticated user
      // If a role is specified, check if user has that role
      if (user && (!role || user.role === role)) setAllowed(true);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header Skeleton */}
          <div className="text-center mb-12">
            <div className="h-10 bg-white/10 rounded-lg w-96 mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 bg-white/10 rounded-lg w-64 mx-auto animate-pulse"></div>
          </div>

          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card 1 Skeleton */}
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 shadow-xl animate-pulse">
              <div className="h-8 bg-white/10 rounded w-48 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-white/10 rounded w-full"></div>
                <div className="h-4 bg-white/10 rounded w-5/6"></div>
                <div className="h-4 bg-white/10 rounded w-4/6"></div>
              </div>
              <div className="mt-6 h-10 bg-white/10 rounded-lg w-32"></div>
            </div>

            {/* Card 2 Skeleton */}
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 shadow-xl animate-pulse">
              <div className="h-8 bg-white/10 rounded w-48 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-white/10 rounded w-full"></div>
                <div className="h-4 bg-white/10 rounded w-5/6"></div>
                <div className="h-4 bg-white/10 rounded w-4/6"></div>
              </div>
              <div className="mt-6 h-10 bg-white/10 rounded-lg w-32"></div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-3 text-white/80">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span className="text-lg">Verifying authentication...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!allowed) {
    // Save the current path so user can be redirected back after login
    const from = location.pathname + location.search + location.hash;
    // Store in localStorage as backup
    if (from && from !== '/login' && from !== '/signup' && !from.includes('/api')) {
      localStorage.setItem('lastRoute', from);
    }
    return <Navigate to="/login" state={{ from }} replace />;
  }
  return children;
};

export default ProtectedRoute;
