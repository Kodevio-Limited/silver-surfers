import React, { useState, useEffect, useRef } from 'react';
import { adminListBlog, adminCreateBlog, adminDeleteBlog, adminUpdateBlog } from '../../api';
import RichTextEditor from '../../components/RichTextEditor';

const AdminBlog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: '',
    author: '',
    date: '',
    readTime: '',
    featured: false,
    published: false
  });

  const [initialFormData, setInitialFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: '',
    author: '',
    date: '',
    readTime: '',
    featured: false,
    published: false
  });

  const [formError, setFormError] = useState('');
  const modalContentRef = useRef(null);

  const getEmptyFormData = () => ({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: '',
    author: '',
    date: '',
    readTime: '',
    featured: false,
    published: false
  });

  const hasUnsavedChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  useEffect(() => {
    loadBlogs();
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

  // Ensure form errors inside the modal are fully visible by scrolling to the top
  useEffect(() => {
    if (formError && modalContentRef.current) {
      modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [formError]);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const result = await adminListBlog();
      if (result.error) {
        setError(result.error);
      } else {
        setBlogs(result.items || []);
      }
    } catch (err) {
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormError('');
    
    try {
      const payload = { ...formData };
      if (payload.date) {
        payload.date = new Date(payload.date).toISOString();
      }
      
      let result;
      if (editingId) {
        result = await adminUpdateBlog(editingId, payload);
      } else {
        result = await adminCreateBlog(payload);
      }
      
      if (result.error) {
        // Show creation/update errors inside the blog modal
        setFormError(result.error);
      } else {
        setSuccess(editingId ? 'Blog post updated successfully!' : 'Blog post created successfully!');
        setShowForm(false);
        setEditingId(null);
        const empty = getEmptyFormData();
        setFormData(empty);
        setInitialFormData(empty);
        setFormError('');
        loadBlogs();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setFormError('Failed to save blog post');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) {
      return;
    }
    
    try {
      const result = await adminDeleteBlog(id);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Blog post deleted successfully!');
        loadBlogs();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to delete blog post');
    }
  };

  const handleEdit = (blog) => {
    const data = {
      title: blog.title || '',
      slug: blog.slug || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      category: blog.category || '',
      author: blog.author || '',
      date: blog.date ? new Date(blog.date).toISOString().slice(0, 10) : '',
      readTime: blog.readTime || '',
      featured: blog.featured || false,
      published: blog.published || false
    };

    setEditingId(blog._id);
    setFormData(data);
    setInitialFormData(data);
    setFormError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    // Confirm before discarding changes if the form has been modified
    if (hasUnsavedChanges()) {
      const confirmClose = window.confirm(
        'You have unsaved changes. If you close this window, all changes will be discarded. Do you want to discard your changes?'
      );
      if (!confirmClose) {
        return;
      }
    }

    const empty = getEmptyFormData();
    setShowForm(false);
    setEditingId(null);
    setFormData(empty);
    setInitialFormData(empty);
    setFormError('');
    setError('');
  };

  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         blog.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         blog.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         blog.author?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'published' && blog.published) ||
                         (filterStatus === 'draft' && !blog.published) ||
                         (filterStatus === 'featured' && blog.featured);
    
    const matchesCategory = filterCategory === 'all' || blog.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Sort blogs
  const sortedBlogs = [...filteredBlogs].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    } else if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (sortBy === 'category') {
      return (a.category || '').localeCompare(b.category || '');
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

  const getCategories = () => {
    return [...new Set(blogs.map(blog => blog.category).filter(Boolean))];
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  const handleOpenCreate = () => {
    const empty = getEmptyFormData();
    setEditingId(null);
    setFormData(empty);
    setInitialFormData(empty);
    setFormError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Blog Management</h1>
            <p className="mt-2 text-purple-100">Create and manage blog posts</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{blogs.length}</div>
            <div className="text-purple-100">Total Posts</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">{blogs.filter(b => b.published).length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{blogs.filter(b => !b.published).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Featured</p>
              <p className="text-2xl font-bold text-gray-900">{blogs.filter(b => b.featured).length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{getCategories().length}</p>
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
              <p className="text-sm font-medium text-gray-600">Avg. Words</p>
              <p className="text-2xl font-bold text-gray-900">
                {blogs.length > 0 ? Math.round(blogs.reduce((acc, blog) => acc + (blog.content?.split(' ').length || 0), 0) / blogs.length) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Posts</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by title, slug, category, or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">All Status</option>
              <option value="published" className="text-gray-900">Published</option>
              <option value="draft" className="text-gray-900">Drafts</option>
              <option value="featured" className="text-gray-900">Featured</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">All Categories</option>
              {getCategories().map(category => (
                <option key={category} value={category} className="text-gray-900">{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="date" className="text-gray-900">Date</option>
              <option value="title" className="text-gray-900">Title A-Z</option>
              <option value="category" className="text-gray-900">Category</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-l-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-r-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
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
          Showing {sortedBlogs.length} of {blogs.length} posts
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Create New Post</span>
        </button>
      </div>

      {/* Blog Modal Form */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancel();
            }
          }}
        >
          <div
            ref={modalContentRef}
            className="bg-white shadow-2xl rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingId ? 'Edit Blog Post' : 'Create New Blog Post'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {editingId ? 'Update the blog post information below' : 'Fill in the details to create a new blog post'}
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

            {formError && (
              <div className="px-8 pt-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800 break-words">{formError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-8">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-gray-900 bg-white"
                  placeholder="Enter blog post title..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-gray-900 bg-white"
                  placeholder="url-friendly-slug"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">URL: /blog/{formData.slug}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excerpt
              </label>
              <RichTextEditor
                value={formData.excerpt}
                onChange={(value) => setFormData(prev => ({ ...prev, excerpt: value }))}
                placeholder="Brief description of the post... You can use **bold** and *italic* formatting here too!"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                placeholder="Write your blog post content here... Use the formatting toolbar above to add headings, bold text, lists, and more!"
                rows={15}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-gray-900 bg-white"
                  placeholder="e.g., Technology, Business"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-gray-900 bg-white"
                  placeholder="Author name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publish Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-gray-900 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Read Time
                </label>
                <input
                  type="text"
                  name="readTime"
                  value={formData.readTime}
                  onChange={handleInputChange}
                  placeholder="e.g., 5 min read"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-gray-900 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-8">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-colors"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Featured Post</span>
                  <p className="text-xs text-gray-500">Highlight this post</p>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="published"
                  checked={formData.published}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-colors"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Published</span>
                  <p className="text-xs text-gray-500">Make this post public</p>
                </div>
              </label>
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
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{editingId ? 'Update Post' : 'Create Post'}</span>
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Blog Posts */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedBlogs.map((blog) => (
            <div key={blog._id} className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">{blog.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">{blog.excerpt}</p>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => handleEdit(blog)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(blog._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    blog.published 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {blog.published ? 'Published' : 'Draft'}
                  </span>
                  
                  {blog.featured && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Featured
                    </span>
                  )}
                  
                  {blog.category && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {blog.category}
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p><span className="font-medium">Slug:</span> {blog.slug}</p>
                  {blog.author && <p><span className="font-medium">Author:</span> {blog.author}</p>}
                  {blog.date && <p><span className="font-medium">Date:</span> {formatDate(blog.date)}</p>}
                  {blog.readTime && <p><span className="font-medium">Read Time:</span> {blog.readTime}</p>}
                  <p><span className="font-medium">Created:</span> {formatDate(blog.createdAt)}</p>
                  <p><span className="font-medium">Words:</span> {blog.content?.split(' ').filter(w => w.length > 0).length || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBlogs.map((blog) => (
            <div key={blog._id} className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 mr-4">{blog.title}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        blog.published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {blog.published ? 'Published' : 'Draft'}
                      </span>
                      {blog.featured && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ml-2">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{blog.excerpt}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {blog.category && <span>Category: {blog.category}</span>}
                      {blog.author && <span>Author: {blog.author}</span>}
                      {blog.date && <span>Date: {formatDate(blog.date)}</span>}
                      {blog.readTime && <span>{blog.readTime}</span>}
                      <span>{blog.content?.split(' ').filter(w => w.length > 0).length || 0} words</span>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-6">
                    <button
                      onClick={() => handleEdit(blog)}
                      className="p-3 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(blog._id)}
                      className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sortedBlogs.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No blog posts found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
              ? 'Try adjusting your search or filter criteria.' 
              : 'Get started by creating your first blog post.'}
          </p>
          {!searchQuery && filterStatus === 'all' && filterCategory === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create Your First Post
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBlog;