import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchJSON } from '../config/apiBase';
import { RichTextPreviewDark } from '../components/RichTextEditor';
import './Blog.css';

export default function BlogPost() {
  const { id: slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { ok, data } = await fetchJSON(`/blogs/${slug}`);
        
        if (ok) {
          setPost(data.post);
        } else {
          setError(data?.error || 'Failed to load blog post');
        }
      } catch (err) {
        setError('Failed to load blog post');
        console.error('Blog post fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  // Loading state
  if (loading) {
    return (
      <div className="pt-40 text-center text-white bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 min-h-screen">
        <div className="max-w-3xl mx-auto px-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-700 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !post) {
    return (
      <div className="pt-40 text-center text-white bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 min-h-screen">
        <div className="max-w-3xl mx-auto px-6">
          <p>{error || 'Post not found.'}</p>
          <div className="mt-6">
            <Link to="/blog" className="text-blue-300 hover:text-blue-200">
              ← Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900">
      {/* Header Section */}
      <div className="pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <Link to="/blog" className="inline-flex items-center text-blue-300 hover:text-blue-200 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {post.title}
          </h1>
          
          {/* Meta Information */}
          <div className="flex flex-wrap gap-4 mb-8">
            {post.category && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600/20 text-blue-200 border border-blue-400/30">
                {post.category}
              </span>
            )}
            {post.author && (
              <span className="text-gray-300 text-sm">
                By <span className="font-medium text-white">{post.author}</span>
              </span>
            )}
            {post.readTime && (
              <span className="text-gray-300 text-sm">
                {post.readTime}
              </span>
            )}
            {post.date && (
              <span className="text-gray-300 text-sm">
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Excerpt Section */}
      {post.excerpt && (
        <div className="bg-white/5 backdrop-blur-sm border-t border-white/10 border-b border-white/10">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="text-xl text-gray-100 leading-relaxed">
              <RichTextPreviewDark content={post.excerpt} />
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-white/10">
            <article className="prose prose-lg prose-invert max-w-none">
              {post.content ? (
                <RichTextPreviewDark content={post.content} />
              ) : (
                <p className="text-gray-400 italic text-center py-8">
                  No content available for this post.
                </p>
              )}
            </article>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="border-t border-white/10 pt-8">
            <Link 
              to="/blog" 
              className="inline-flex items-center text-blue-300 hover:text-blue-200 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}