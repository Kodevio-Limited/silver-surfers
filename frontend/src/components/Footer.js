import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="relative bg-gray-900 overflow-hidden">
      {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-green-900/20"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-8">
            {/* Company Info */}
            <div className="md:col-span-2 lg:col-span-2 space-y-4 lg:space-y-6">
              <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-3 group" >
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                    <img 
                      src="/Logo.png" 
                      alt="Silver Surfers Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

              </Link>

                <div className="flex flex-col">
                  <span className="text-lg lg:text-xl text-white">
                    <span className="font-light">Silver</span><span className="font-bold">Surfers</span>
                  </span>
                  <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-green-600 to-teal-500 rounded-full"></div>
                </div>
              </div>
              
              <p className="text-gray-300 leading-relaxed max-w-md text-base lg:text-lg">
                Shaping an age-inclusive digital world. SilverSurfers provides expert digital experience assessments, certification, and actionable guidance to help businesses delight all generations of users.
              </p>
              
              <div className="flex space-x-4">
                {/* LinkedIn */}
                <a 
                  href="https://www.linkedin.com/company/silversurfers-ai" target="_blank" rel="noreferrer noopener"
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-gray-300 hover:text-white transition-all duration-300"
                  title="Follow us on LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                
                {/* Instagram */}
                <a 
                  href="https://www.instagram.com/silversurfersofficial/" target="_blank" rel="noreferrer noopener"
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-gray-300 hover:text-white transition-all duration-300"
                  title="Follow us on Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                
                {/* Facebook */}
                <a 
                  href="https://www.facebook.com/profile.php?id=61581504520459" target="_blank" rel="noreferrer noopener"
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-gray-300 hover:text-white transition-all duration-300"
                  title="Follow us on Facebook"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                
                {/* TikTok */}
                <a 
                  href="https://www.tiktok.com/@silversurfersofficial" target="_blank" rel="noreferrer noopener"
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-gray-300 hover:text-white transition-all duration-300"
                  title="Follow us on TikTok"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Services / Plans */}
            <div className="space-y-3 lg:space-y-4">
              <h3 className="text-lg lg:text-xl font-semibold text-white">Plans</h3>
              <ul className="space-y-2 lg:space-y-3">
                <li><Link to="/checkout?pkg=1" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">Starter</Link></li>
                <li><Link to="/checkout?pkg=2" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">Pro</Link></li>
                <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">Custom</Link></li>
                <li><a href="https://calendly.com/silversurfers-info/30min" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">Consulting</a></li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3 lg:space-y-4">
              <h3 className="text-lg lg:text-xl font-semibold text-white">Company</h3>
              <ul className="space-y-2 lg:space-y-3">
                <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">About Us</Link></li>
                <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">Contact</Link></li>
                <li><Link to="/blog" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">Blog</Link></li>
                <li><Link to="/faq" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">FAQ</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-3 lg:space-y-4">
              <h3 className="text-lg lg:text-xl font-semibold text-white">Resources</h3>
              <ul className="space-y-2 lg:space-y-3">
                <li><Link to="/accessibility-guides" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">Accessibility Guides</Link></li>
                <li><Link to="/blog" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">Case Studies</Link></li>
                <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors duration-300 text-base lg:text-lg">Support</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-800 py-6 lg:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <p className="text-gray-400 text-sm lg:text-base text-center sm:text-left">&copy; 2025 SilverSurfers. All rights reserved.</p>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6">
              <Link to="/privacy" className="text-gray-400 hover:text-white text-sm lg:text-base transition-colors duration-300 text-center">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm lg:text-base transition-colors duration-300 text-center">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;