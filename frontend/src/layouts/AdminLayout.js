import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getMe } from '../api';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await getMe();
        if (result.user && result.user.role === 'admin') {
          setUser(result.user);
        } else {
          // Redirect to admin login if not admin
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊', current: location.pathname === '/admin/dashboard' || location.pathname === '/admin' },
    { name: 'User Management', href: '/admin/users', icon: '👥', current: location.pathname === '/admin/users' },
    { name: 'Blog Management', href: '/admin/blog', icon: '📝', current: location.pathname === '/admin/blog' },
    { name: 'FAQ Management', href: '/admin/faqs', icon: '❓', current: location.pathname === '/admin/faqs' },
    { name: 'Analysis Queue', href: '/admin/analysis', icon: '🔍', current: location.pathname === '/admin/analysis' },
    { name: 'Bulk Quick Scans', href: '/admin/bulk-quick-scans', icon: '📦', current: location.pathname === '/admin/bulk-quick-scans' },
    { name: 'Quick Scans', href: '/admin/quick-scans', icon: '⚡', current: location.pathname === '/admin/quick-scans' },
    { name: 'Starter Scans', href: '/admin/starter-scans', icon: '🌟', current: location.pathname === '/admin/starter-scans' },
    { name: 'Pro Scans', href: '/admin/pro-scans', icon: '💎', current: location.pathname === '/admin/pro-scans' },
    { name: 'One-Time Scans', href: '/admin/onetime-scans', icon: '📦', current: location.pathname === '/admin/onetime-scans' },
    { name: 'Contact Messages', href: '/admin/contact', icon: '📧', current: location.pathname === '/admin/contact' },
    { name: 'Legal Documents', href: '/admin/legal', icon: '📋', current: location.pathname === '/admin/legal' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <SidebarContent navigation={navigation} />
            </div>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <SidebarContent navigation={navigation} />
          </div>
          <UserMenu user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-100">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Sidebar Content Component
const SidebarContent = ({ navigation }) => {
  const navigate = useNavigate();

  return (
    <>
      <div className="flex items-center flex-shrink-0 px-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
            <p className="text-xs text-gray-300">SilverSurfers</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-8 flex-1 px-2 space-y-1">
        {navigation.map((item) => (
          <button
            key={item.name}
            onClick={() => navigate(item.href)}
            className={`${
              item.current
                ? 'bg-gray-900 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-colors`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>
    </>
  );
};

// User Menu Component
const UserMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSwitchToWebsite = () => {
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setIsMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('.user-menu-container')) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div className="flex-shrink-0 flex border-t border-gray-700 p-4 user-menu-container">
      <div className="flex items-center w-full">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-white truncate">{user?.email || 'Admin'}</p>
          <p className="text-xs text-gray-300">Administrator</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
            title="Admin Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {isMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="py-2">
                <button
                  onClick={handleSwitchToWebsite}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150"
                >
                  <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Switch to Website
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all duration-150"
                >
                  <svg className="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
