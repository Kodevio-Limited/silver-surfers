import React, { useState, useEffect } from 'react';
import { adminListContact, adminUpdateContact, adminDeleteContact } from '../../api';

const AdminContact = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadContacts();
  }, [statusFilter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const result = await adminListContact(params);
      let items = result.items || [];
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        items = items.filter(contact => 
          (contact.name || '').toLowerCase().includes(query) ||
          (contact.email || '').toLowerCase().includes(query) ||
          (contact.subject || '').toLowerCase().includes(query) ||
          (contact.message || '').toLowerCase().includes(query)
        );
      }
      
      setContacts(items);
    } catch (err) {
      setError('Failed to load contact messages');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const result = await adminUpdateContact(id, { status: newStatus });
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        loadContacts(); // Refresh the list
      }
    } catch (err) {
      alert('Failed to update contact status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact message?')) {
      return;
    }
    
    try {
      const result = await adminDeleteContact(id);
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        loadContacts(); // Refresh the list
      }
    } catch (err) {
      alert('Failed to delete contact message');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'read':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  // Group contacts by status
  const groupedContacts = contacts.reduce((groups, contact) => {
    const status = contact.status || 'new';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(contact);
    return groups;
  }, {});

  const statusOrder = ['new', 'read', 'closed'];
  const sortedGroups = statusOrder.filter(status => groupedContacts[status]);

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
          <h1 className="text-3xl font-bold text-gray-900">Contact Messages</h1>
          <p className="mt-2 text-gray-600">Manage customer inquiries and support requests</p>
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
              placeholder="Search by name, email, subject, or message..."
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
            <option value="all" className="text-gray-900">All Status</option>
            <option value="new" className="text-gray-900">New</option>
            <option value="read" className="text-gray-900">Read</option>
            <option value="closed" className="text-gray-900">Closed</option>
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

      {/* Contact Messages */}
      <div className="space-y-6">
        {sortedGroups.length > 0 ? (
          sortedGroups.map(status => (
            <div key={status} className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 capitalize flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    status === 'new' ? 'bg-blue-400 animate-pulse' :
                    status === 'read' ? 'bg-green-400' :
                    'bg-gray-400'
                  }`}></div>
                  {status} ({groupedContacts[status].length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {groupedContacts[status].map((contact) => (
                  <div key={contact._id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            {contact.subject || 'No Subject'}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                            {contact.status || 'new'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1 mb-3">
                          <p><span className="font-medium">From:</span> {contact.name || 'Anonymous'} ({contact.email || 'No email'})</p>
                          <p><span className="font-medium">Date:</span> {formatDate(contact.createdAt)}</p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{contact.message}</p>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col space-y-2">
                        {contact.status === 'new' && (
                          <button
                            onClick={() => handleStatusUpdate(contact._id, 'read')}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                        {contact.status !== 'closed' && (
                          <button
                            onClick={() => handleStatusUpdate(contact._id, 'closed')}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                          >
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(contact._id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contact messages</h3>
            <p className="mt-1 text-sm text-gray-500">No contact messages found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContact;
