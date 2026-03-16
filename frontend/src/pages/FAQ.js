import React, { useEffect, useState } from 'react';
import './FAQ.css';
import { fetchJSON } from '../config/apiBase';

const FAQ = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [faqData, setFaqData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError('');
      const { ok, data } = await fetchJSON('/faqs?published=true');
      if (!active) return;
      if (ok) {
        const items = Array.isArray(data.items) ? data.items : (data.faqs || []);
        setFaqData(items);
        setLoading(false);
      } else {
        setError(data?.error || 'Failed to load FAQs');
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const toggleFaq = (faqId) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };


  const navigateToContact = () => {
    window.location.href = '/contact';
  };

  const navigateToHome = () => {
    window.location.href = '/?openScan=1';
  };

  return (
    <div className="faq-container">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900">
          <div className="absolute inset-0 bg-gradient-to-tl from-green-600/15 via-transparent to-blue-600/8"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,197,94,0.12),transparent_50%)] opacity-60"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.12),transparent_50%)] opacity-60"></div>
        </div>

        {/* Animated geometric shapes */}
        <div className="absolute top-20 left-10 w-48 h-48 bg-gradient-to-br from-blue-500/15 to-green-600/25 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-56 h-56 bg-gradient-to-br from-teal-400/20 to-cyan-600/15 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-gradient-to-br from-green-400/12 to-blue-500/18 rounded-full blur-2xl animate-pulse delay-1400"></div>
        <div className="absolute top-3/4 right-1/4 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-blue-500/15 rounded-full blur-xl animate-pulse delay-2100"></div>

        {/* Hero content */}
        <div className="relative z-10 flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-12">
              <h1 className="heading-hero text-white mb-6">
                <span className="block bg-gradient-to-r from-blue-300 via-green-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent leading-tight" style={{lineHeight: '1.2', paddingBottom: '0.1em'}}>
                  Frequently Asked Questions
                </span>
              </h1>
              
              <h2 className="text-xl sm:text-2xl text-gray-200 font-light leading-relaxed max-w-4xl mx-auto">
              Find answers to the most frequently asked questions about SilverSurfers
              </h2>
            </div>
          </div>
        </div>
      </div>


      {/* FAQ List */}
      <section className="faq-section">
        <div className="faq-content">
          {loading && <p className="text-center text-white">Loading FAQs...</p>}
          {error && <p className="text-center text-red-400 text-sm">{error}</p>}
          {!loading && !error && faqData.map((faq, idx) => (
            <div 
              key={faq._id || idx} 
              className={`faq-item ${expandedFaq === (faq._id || idx) ? 'expanded' : ''}`}
            >
              <button 
                type="button"
                className="faq-button"
                onClick={() => toggleFaq(faq._id || idx)}
              >
                <div className="faq-question">
                  <span className="question-number">{Number(faq.order ?? idx) + 1}</span>
                  <h3 className="question-text">{faq.question}</h3>
                </div>
                <div className="faq-icon">
                  <svg 
                    className="icon-arrow" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ 
                      transform: expandedFaq === (faq._id || idx) ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </button>
              
              {expandedFaq === (faq._id || idx) && (
                <div className="faq-answer">
                  <div className="answer-content">
                    <span className="answer-icon">A</span>
                    <p className="answer-text">{faq.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!loading && !error && faqData.length === 0 && (
            <div className="text-center text-gray-300">No FAQs published yet.</div>
          )}
        </div>
      </section>

      {/* Additional Resources */}
      <section className="resources-section">
        <div className="resources-container">
          <div className="resources-header">
            <h2 className="resources-title">Helpful Resources</h2>
            <p className="resources-subtitle">Dive deeper into the digital experience.</p>
          </div>
          
          <div className="resources-grid">

            <div className="resource-card">
              <div className="resource-icon resource-icon-pink">
                <svg className="icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="resource-title">SilverSurfers Blog</h3>
              <p className="resource-description">See how we’ve helped businesses improve their digital platforms</p>
              <button 
                type="button"
                onClick={() => window.location.href = '/blog'}
                className="resource-button"
              >
                Read Blog →
              </button>
            </div>
            
          </div>
        </div>
      </section>

      {/* Contact CTA */}
            {/* Contact CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-200 mb-8">Join the growing community of businesses elevating their digital experience with SilverSurfers.ai</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              type="button"
              onClick={() => window.location.href = '/?openScan=1'}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 via-green-600 to-teal-500 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Get Quick Scan Report
            </button>
            <button 
              type="button"
              onClick={navigateToContact}
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 font-semibold rounded-xl hover:bg-white/20 transition-all duration-300"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;