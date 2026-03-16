import React, { useState, useEffect } from 'react';
import { updateLegalDocument, publishLegalDocument, getAllLegalDocuments } from '../api';

const AdminLegal = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'terms-of-use',
    title: '',
    content: '',
    summary: '',
    version: '1.0',
    language: 'en',
    region: 'US',
    acceptanceRequired: true
  });

  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  const documentTypes = [
    { 
      value: 'terms-of-use', 
      label: 'Terms of Service', 
      icon: '📋',
      description: 'User agreement and terms of service',
      color: 'blue'
    },
    { 
      value: 'privacy-policy', 
      label: 'Privacy Policy', 
      icon: '🔒',
      description: 'How we collect and use personal data',
      color: 'green'
    },
    { 
      value: 'accessibility-guides', 
      label: 'Accessibility Guides', 
      icon: '♿',
      description: 'Guidelines and resources for web accessibility',
      color: 'purple'
    }
  ];

  const getDocumentType = (type) => {
    return documentTypes.find(t => t.value === type) || documentTypes[0];
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const result = await getAllLegalDocuments();
      if (result.error) {
        setError(result.error);
      } else {
        setDocuments(result.documents || []);
      }
    } catch (err) {
      setError('Failed to load legal documents');
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
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateLegalDocument(editingDocument._id, formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Document updated successfully!');
        setShowForm(false);
        setEditingDocument(null);
        resetForm();
        loadDocuments();
      }
    } catch (error) {
      setError('Error saving document: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (documentId) => {
    if (!window.confirm('Are you sure you want to publish this document? This will make it live.')) {
      return;
    }

    try {
      const result = await publishLegalDocument(documentId);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Document published successfully!');
        loadDocuments();
      }
    } catch (error) {
      setError('Error publishing document: ' + error.message);
    }
  };

  const handleEdit = (document) => {
    setEditingDocument(document);
    setFormData({
      type: document.type,
      title: document.title,
      content: document.content,
      summary: document.summary,
      version: document.version,
      language: document.language,
      region: document.region,
      acceptanceRequired: document.acceptanceRequired
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'terms-of-use',
      title: '',
      content: '',
      summary: '',
      version: '1.0',
      language: 'en',
      region: 'US',
      acceptanceRequired: true
    });
  };

  // Simple text formatting functions
  const formatText = (format) => {
    const textarea = document.querySelector('textarea[name="content"]');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (!selectedText) return;

    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'large':
        formattedText = `# ${selectedText}`;
        break;
      case 'medium':
        formattedText = `## ${selectedText}`;
        break;
      case 'small':
        formattedText = `### ${selectedText}`;
        break;
      default:
        return;
    }

    const newContent = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    setFormData(prev => ({ ...prev, content: newContent }));
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  const handleContentChange = (e) => {
    setFormData(prev => ({ ...prev, content: e.target.value }));
  };

  const handleTextSelection = (e) => {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    setSelectedText(selected);
    setCursorPosition(start);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold">Legal Documents</h1>
        <p className="mt-2 text-indigo-100">Manage your Terms of Service and Privacy Policy</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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

      {/* Documents List */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Current Documents</h3>
          <p className="text-sm text-gray-600">Manage your published and draft documents</p>
        </div>
        
        {documents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No legal documents found</h3>
            <p className="mt-1 text-sm text-gray-500">Legal documents should be created in the database. Contact your developer if none are visible.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((doc) => {
              const docType = getDocumentType(doc.type);
              return (
                <div key={doc._id} className="px-6 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl">{docType.icon}</span>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{doc.title}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            doc.status === 'published' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.status}
                          </span>
                          <span className="text-sm text-gray-500">v{doc.version}</span>
                          <span className="text-sm text-gray-500">{doc.language}/{doc.region}</span>
                        </div>
                        {doc.summary && (
                          <p className="text-sm text-gray-600 mt-2">{doc.summary}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleEdit(doc)}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                      >
                        Edit
                      </button>
                      {doc.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(doc._id)}
                          className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                        >
                          Publish
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-lg bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Edit Document
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Update your legal document
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingDocument(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Document Type and Version */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Type *
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                      required
                    >
                      {documentTypes.map(type => (
                        <option key={type.value} value={type.value} className="text-gray-900">
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Version *
                    </label>
                    <input
                      type="text"
                      name="version"
                      value={formData.version}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="e.g., 1.0, 1.1, 2.0"
                      required
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Enter a clear, descriptive title"
                    required
                  />
                </div>

                {/* Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Summary
                  </label>
                  <textarea
                    name="summary"
                    value={formData.summary}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Brief summary of what this document covers"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Content *
                  </label>
                  
                  {/* Formatting Toolbar */}
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg border">
                    <span className="text-sm text-gray-600 mr-2">Format selected text:</span>
                    <button
                      type="button"
                      onClick={() => formatText('bold')}
                      className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded border text-gray-700 font-bold"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => formatText('italic')}
                      className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded border text-gray-700 italic"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => formatText('large')}
                      className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded border text-gray-700"
                      title="Large Heading"
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => formatText('medium')}
                      className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded border text-gray-700"
                      title="Medium Heading"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => formatText('small')}
                      className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded border text-gray-700"
                      title="Small Heading"
                    >
                      H3
                    </button>
                  </div>

                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleContentChange}
                    onSelect={handleTextSelection}
                    rows={20}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 bg-white"
                    placeholder="Enter your legal document content here..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Formatting:</strong> Select text and use buttons above. Use # for large headings, ## for medium, ### for small. Use **bold** and *italic* for emphasis.
                  </p>
                </div>

                {/* Language and Region */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="en" className="text-gray-900">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Region
                    </label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="US" className="text-gray-900">United States</option>
                    </select>
                  </div>
                </div>

                {/* Acceptance Required */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="acceptanceRequired"
                      checked={formData.acceptanceRequired}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-700">
                        Require User Acceptance
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Users must accept this document before using your service
                      </p>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingDocument(null);
                      resetForm();
                    }}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium flex items-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Update Document'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLegal;