import React, { useState, useEffect } from 'react';
import { adminListAnalysis } from '../../api';

const AdminAnalysis = () => {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalysis();
  }, [statusFilter]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = { limit: 200 };
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const result = await adminListAnalysis(params);
      if (result.error) {
        setError(result.error);
        setAnalysis([]);
      } else {
        let items = Array.isArray(result.items) ? result.items : [];
        
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          items = items.filter(record => 
            (record.url || '').toLowerCase().includes(query) ||
            (record.email || '').toLowerCase().includes(query) ||
            (record.taskId || '').toLowerCase().includes(query)
          );
        }
        
        setAnalysis(items);
      }
    } catch (err) {
      setError('Failed to load analysis data');
      setAnalysis([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalysis();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmailStatusColor = (emailStatus) => {
    switch (emailStatus) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'sending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  // Group analysis by status for better organization
  const groupedAnalysis = analysis.reduce((groups, record) => {
    const status = record.status || 'unknown';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(record);
    return groups;
  }, {});

  const statusOrder = ['queued', 'processing', 'completed', 'failed'];
  const sortedGroups = statusOrder.filter(status => groupedAnalysis[status]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 shadow rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analysis Queue</h1>
          <p className="mt-2 text-gray-600">Monitor and manage website analysis requests</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          {refreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by URL, email, or task ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
          >
            <option value="all" className="text-gray-900 bg-white">All Status</option>
            <option value="queued" className="text-gray-900 bg-white">Queued</option>
            <option value="processing" className="text-gray-900 bg-white">Processing</option>
            <option value="completed" className="text-gray-900 bg-white">Completed</option>
            <option value="failed" className="text-gray-900 bg-white">Failed</option>
          </select>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Records */}
      <div className="space-y-6">
        {sortedGroups.length > 0 ? (
          sortedGroups.map(status => (
            <div key={status} className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 capitalize flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    status === 'completed' ? 'bg-green-400' :
                    status === 'failed' ? 'bg-red-400' :
                    status === 'processing' ? 'bg-blue-400 animate-pulse' :
                    'bg-yellow-400'
                  }`}></div>
                  {status} ({groupedAnalysis[status].length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {groupedAnalysis[status].map((record) => (
                  <div key={record._id || record.taskId} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {record.url}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status || 'unknown'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEmailStatusColor(record.emailStatus)}`}>
                            Email: {record.emailStatus || 'unknown'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">Email:</span> {record.email}</p>
                          <p><span className="font-medium">Task ID:</span> {record.taskId}</p>
                          <p><span className="font-medium">Created:</span> {formatDate(record.createdAt)}</p>
                          {record.updatedAt && (
                            <p><span className="font-medium">Updated:</span> {formatDate(record.updatedAt)}</p>
                          )}
                          {typeof record.attachmentCount === 'number' && (
                            <p><span className="font-medium">PDFs:</span> {record.attachmentCount}</p>
                          )}
                        </div>
                        
                        {record.failureReason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800">
                              <span className="font-medium">Failure Reason:</span> {record.failureReason}
                            </p>
                          </div>
                        )}
                        
                        {record.emailError && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800">
                              <span className="font-medium">Email Error:</span> {record.emailError}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis records</h3>
            <p className="mt-1 text-sm text-gray-500">No analysis requests found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalysis;
