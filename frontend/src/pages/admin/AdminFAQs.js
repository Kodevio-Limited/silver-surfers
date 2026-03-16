import React, { useState, useEffect } from 'react';
import { adminListFaqs, adminCreateFaq, adminDeleteFaq, adminUpdateFaq } from '../../api';

const AdminFAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('order');
  const [viewMode, setViewMode] = useState('list'); // list or grid
  
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    order: 0,
    published: true,
    category: ''
  });

  useEffect(() => {
    loadFaqs();
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && showForm) {
        handleCancel();
      }
    };

    if (showForm) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const result = await adminListFaqs();
      if (result.error) {
        setError(result.error);
      } else {
        setFaqs(result.items || []);
      }
    } catch (err) {
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      let result;
      if (editingId) {
        result = await adminUpdateFaq(editingId, formData);
      } else {
        result = await adminCreateFaq(formData);
      }
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(editingId ? 'FAQ updated successfully!' : 'FAQ created successfully!');
        setShowForm(false);
        setEditingId(null);
        setFormData({
          question: '',
          answer: '',
          order: 0,
          published: true,
          category: ''
        });
        loadFaqs();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to save FAQ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) {
      return;
    }
    
    try {
      const result = await adminDeleteFaq(id);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('FAQ deleted successfully!');
        loadFaqs();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to delete FAQ');
    }
  };

  const handleEdit = (faq) => {
    setEditingId(faq._id);
    setFormData({
      question: faq.question || '',
      answer: faq.answer || '',
      order: faq.order || 0,
      published: faq.published || false,
      category: faq.category || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      question: '',
      answer: '',
      order: 0,
      published: true,
      category: ''
    });
    setError('');
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'published' && faq.published) ||
                         (filterStatus === 'draft' && !faq.published);
    
    return matchesSearch && matchesStatus;
  });

  // Sort FAQs
  const sortedFaqs = [...filteredFaqs].sort((a, b) => {
    if (sortBy === 'order') {
      return (a.order || 0) - (b.order || 0);
    } else if (sortBy === 'date') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'question') {
      return (a.question || '').localeCompare(b.question || '');
    }
    return 0;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getNextOrder = () => {
    const maxOrder = Math.max(...faqs.map(faq => faq.order || 0));
    return maxOrder + 1;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 shadow rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">FAQ Management</h1>
            <p className="mt-2 text-blue-100">Create and manage frequently asked questions</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{faqs.length}</div>
            <div className="text-blue-100">Total FAQs</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">{faqs.filter(f => f.published).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Drafts</p>
              <p className="text-2xl font-bold text-gray-900">{faqs.filter(f => !f.published).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{new Set(faqs.map(f => f.category).filter(Boolean)).size}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Length</p>
              <p className="text-2xl font-bold text-gray-900">
                {faqs.length > 0 ? Math.round(faqs.reduce((acc, faq) => acc + (faq.answer?.length || 0), 0) / faqs.length) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search FAQs</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by question, answer, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
            >
              <option value="all" style={{ color: '#1f2937', backgroundColor: '#ffffff' }}>All Status</option>
              <option value="published" style={{ color: '#1f2937', backgroundColor: '#ffffff' }}>Published</option>
              <option value="draft" style={{ color: '#1f2937', backgroundColor: '#ffffff' }}>Drafts</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
            >
              <option value="order" style={{ color: '#1f2937', backgroundColor: '#ffffff' }}>Display Order</option>
              <option value="date" style={{ color: '#1f2937', backgroundColor: '#ffffff' }}>Date Created</option>
              <option value="question" style={{ color: '#1f2937', backgroundColor: '#ffffff' }}>Question A-Z</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-l-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-r-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {sortedFaqs.length} of {faqs.length} FAQs
        </div>
        <button
          onClick={() => {
            setFormData(prev => ({ ...prev, order: getNextOrder() }));
            setShowForm(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add New FAQ</span>
        </button>
      </div>

      {/* FAQ Modal Form */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancel();
            }
          }}
        >
          <div className="bg-white shadow-2xl rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingId ? 'Edit FAQ' : 'Create New FAQ'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {editingId ? 'Update the FAQ information below' : 'Fill in the details to create a new FAQ'}
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                  title="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-8">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question *
                </label>
                <input
                  type="text"
                  name="question"
                  value={formData.question}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                  placeholder="Enter the FAQ question..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                  placeholder="e.g., General, Billing, Technical"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer *
              </label>
              <textarea
                name="answer"
                value={formData.answer}
                onChange={handleInputChange}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                placeholder="Provide a detailed answer..."
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                {formData.answer.length} characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />
                <p className="mt-1 text-sm text-gray-500">Lower numbers appear first</p>
              </div>

              <div className="flex items-center justify-center">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="published"
                    checked={formData.published}
                    onChange={handleInputChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Published</span>
                    <p className="text-xs text-gray-500">Make this FAQ visible to users</p>
                  </div>
                </label>
              </div>
            </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{editingId ? 'Update FAQ' : 'Create FAQ'}</span>
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* FAQs List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedFaqs.map((faq, index) => (
            <div key={faq._id} className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mr-2">
                        #{faq.order || 0}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                        faq.published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {faq.published ? 'Published' : 'Draft'}
                      </span>
                      {faq.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 ml-2">
                          {faq.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">{faq.question}</h3>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-4">{faq.answer}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit FAQ"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(faq._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete FAQ"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {faq.answer?.length || 0} chars
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedFaqs.map((faq, index) => (
          <div key={faq._id} className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mr-3">
                      #{faq.order || 0}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      faq.published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {faq.published ? 'Published' : 'Draft'}
                    </span>
                    {faq.category && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 ml-2">
                        {faq.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-6">
                  <button
                    onClick={() => handleEdit(faq)}
                    className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit FAQ"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(faq._id)}
                    className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete FAQ"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-100">
                <div className="flex space-x-4">
                  <span>Created: {formatDate(faq.createdAt)}</span>
                  {faq.updatedAt && faq.updatedAt !== faq.createdAt && (
                    <span>Updated: {formatDate(faq.updatedAt)}</span>
                  )}
                </div>
                <div className="text-gray-400">
                  {faq.answer?.length || 0} characters
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {sortedFaqs.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'Get started by creating your first FAQ.'}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, order: getNextOrder() }));
                setShowForm(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create Your First FAQ
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFAQs;