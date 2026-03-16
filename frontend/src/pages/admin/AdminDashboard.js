import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  adminListBlog, 
  adminListFaqs, 
  adminListAnalysis, 
  adminListContact,
  getSubscription 
} from '../../api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBlogs: 0,
    totalFaqs: 0,
    pendingAnalysis: 0,
    completedAnalysis: 0,
    newContacts: 0,
    activeSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [
        blogsResult,
        faqsResult,
        analysisResult,
        contactsResult
      ] = await Promise.allSettled([
        adminListBlog(),
        adminListFaqs(),
        adminListAnalysis({ limit: 100 }),
        adminListContact()
      ]);

      // Process blog stats
      const blogs = blogsResult.status === 'fulfilled' ? blogsResult.value.items || [] : [];
      const publishedBlogs = blogs.filter(b => b.published);

      // Process FAQ stats
      const faqs = faqsResult.status === 'fulfilled' ? faqsResult.value.items || [] : [];
      const publishedFaqs = faqs.filter(f => f.published);

      // Process analysis stats
      const analysis = analysisResult.status === 'fulfilled' ? analysisResult.value.items || [] : [];
      const pendingAnalysis = analysis.filter(a => a.status === 'queued' || a.status === 'processing');
      const completedAnalysis = analysis.filter(a => a.status === 'completed');

      // Process contact stats
      const contacts = contactsResult.status === 'fulfilled' ? contactsResult.value.items || [] : [];
      const newContacts = contacts.filter(c => c.status === 'new');

      // Get recent activity (last 10 items)
      const recent = [
        ...blogs.slice(0, 3).map(b => ({
          type: 'blog',
          title: b.title,
          date: b.createdAt,
          status: b.published ? 'published' : 'draft'
        })),
        ...analysis.slice(0, 5).map(a => ({
          type: 'analysis',
          title: a.url,
          date: a.createdAt,
          status: a.status
        })),
        ...contacts.slice(0, 2).map(c => ({
          type: 'contact',
          title: c.subject || 'Contact Message',
          date: c.createdAt,
          status: c.status
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

      setStats({
        totalBlogs: blogs.length,
        publishedBlogs: publishedBlogs.length,
        totalFaqs: faqs.length,
        publishedFaqs: publishedFaqs.length,
        pendingAnalysis: pendingAnalysis.length,
        completedAnalysis: completedAnalysis.length,
        newContacts: newContacts.length,
        totalContacts: contacts.length
      });

      setRecentActivity(recent);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'blue', trend = null }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      yellow: 'from-yellow-500 to-yellow-600',
      red: 'from-red-500 to-red-600',
      purple: 'from-purple-500 to-purple-600',
      indigo: 'from-indigo-500 to-indigo-600'
    };

    return (
      <div className="bg-white overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-shadow duration-300">
        <div className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center shadow-md`}>
                <span className="text-white text-xl">{icon}</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-600 truncate">{title}</dt>
                <dd className="flex items-baseline mt-1">
                  <div className="text-3xl font-bold text-gray-900">{value}</div>
                  {subtitle && (
                    <div className="ml-2 text-sm font-medium text-gray-500">{subtitle}</div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ActivityItem = ({ item }) => {
    const getTypeIcon = (type) => {
      switch (type) {
        case 'blog': return '📝';
        case 'analysis': return '🔍';
        case 'contact': return '📧';
        default: return '📄';
      }
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'published':
        case 'completed':
          return 'text-green-600 bg-green-100';
        case 'draft':
        case 'queued':
        case 'processing':
          return 'text-yellow-600 bg-yellow-100';
        case 'failed':
        case 'new':
          return 'text-red-600 bg-red-100';
        default:
          return 'text-gray-600 bg-gray-100';
      }
    };

    return (
      <div className="flex items-center space-x-3 py-2">
        <div className="flex-shrink-0">
          <span className="text-lg">{getTypeIcon(item.type)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">{item.title}</p>
          <p className="text-xs text-gray-500">
            {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
            {item.status}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-5 shadow rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-indigo-100">Welcome back! Here's your SilverSurfers administration overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Blog Posts"
          value={stats.totalBlogs}
          subtitle={`${stats.publishedBlogs} published`}
          icon="📝"
          color="indigo"
        />
        <StatCard
          title="Total FAQs"
          value={stats.totalFaqs}
          subtitle={`${stats.publishedFaqs} published`}
          icon="❓"
          color="green"
        />
        <StatCard
          title="Pending Analysis"
          value={stats.pendingAnalysis}
          subtitle={`${stats.completedAnalysis} completed`}
          icon="🔍"
          color="purple"
        />
        <StatCard
          title="New Contacts"
          value={stats.newContacts}
          subtitle={`${stats.totalContacts} total`}
          icon="📧"
          color="blue"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-md rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button 
            onClick={() => navigate('/admin/blog')}
            className="flex flex-col items-center p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 group"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📝</span>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600">New Blog Post</span>
          </button>
          <button 
            onClick={() => navigate('/admin/faqs')}
            className="flex flex-col items-center p-5 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">❓</span>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-green-600">Add FAQ</span>
          </button>
          <button 
            onClick={() => navigate('/admin/users')}
            className="flex flex-col items-center p-5 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 group"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">👥</span>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-purple-600">Manage Users</span>
          </button>
          <button 
            onClick={() => navigate('/admin/legal')}
            className="flex flex-col items-center p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</span>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600">Legal Docs</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
        </div>
        <div className="px-6 py-4">
          {recentActivity.length > 0 ? (
            <div className="space-y-1">
              {recentActivity.map((item, index) => (
                <ActivityItem key={index} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white shadow-md rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">System Status</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-semibold text-gray-900">API Status</p>
              <p className="text-xs text-green-600 font-medium">Operational</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-semibold text-gray-900">Database</p>
              <p className="text-xs text-green-600 font-medium">Connected</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-semibold text-gray-900">Email Service</p>
              <p className="text-xs text-green-600 font-medium">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
