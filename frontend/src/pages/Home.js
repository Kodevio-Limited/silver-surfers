import React, { useEffect, useRef, useState } from 'react';
import { quickAudit } from '../api';

// Simple modal component for demo
const ScanResultsModal = ({ result, isVisible, onClose }) => {
  if (!isVisible || !result) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-2xl font-bold mb-6">Senior-Friendly Score Results</h3>
        <div className="mb-6">
          <div className="text-4xl font-bold text-green-600 mb-3">{result.score}/100</div>
          <p className="text-gray-600 text-lg leading-relaxed">{result.summary}</p>
        </div>
        <div className="mb-6">
          <h4 className="text-xl font-semibold mb-3">Recommendations:</h4>
          <ul className="list-disc list-inside text-gray-600 text-lg leading-relaxed space-y-2">
            {result.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
        <button 
          onClick={onClose}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition text-lg font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const MainScreen = () => {
 const [scanData, setScanData] = useState({
   websiteUrl: '',
   email: '',
   firstName: '',
   lastName: ''
 });
 const [selectedDevice, setSelectedDevice] = useState('desktop'); // Quick scan only supports desktop
 const [isScanning, setIsScanning] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
const [showResultsModal, setShowResultsModal] = useState(false);
const [scanResult, setScanResult] = useState(null);
const [formHighlighted, setFormHighlighted] = useState(false);

 const handleInputChange = (e) => {
   setScanData({
     ...scanData,
     [e.target.name]: e.target.value
   });
 };
 
 const navigateToServices = () => {
  window.location.href = '/services';
};

const navigateToContact = () => {
  window.location.href = '/contact';
};

const handleContactClick = () => {
  const email = 'hello@silversurfers.ai';
  showEmailFallback(email);
};

const showEmailFallback = (email) => {
  // Create a temporary notification with the email address
  const fallback = document.createElement('div');
  fallback.className = 'email-fallback fixed top-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-sm';
  fallback.innerHTML = `
    <div class="flex items-start space-x-3">
      <div class="flex-shrink-0">
        <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-medium text-gray-900">Email us directly:</h3>
        <p class="text-sm text-blue-600 font-mono mt-1">${email}</p>
        <p class="text-xs text-gray-500 mt-2">Click to copy or send us an email manually</p>
        <button onclick="navigator.clipboard.writeText('${email}')" class="text-xs text-blue-500 hover:text-blue-700 mt-1">
          Copy email address
        </button>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 text-gray-400 hover:text-gray-600">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(fallback);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (fallback.parentElement) {
      fallback.remove();
    }
  }, 10000);
};

 const formRef = useRef(null);

 const handleCloseModal = () => {
  setShowResultsModal(false);
  setScanResult(null);
  setScanData({
    websiteUrl: '',
    email: ''
  });
};

// Submit free scan request to backend
const handleScanSubmit = async (e) => {
  e.preventDefault();
  if (isScanning) return; // guard against double-click/double submission
  setIsScanning(true);
  setError('');
  setSuccess('');

  try {
    // Normalize URL to include protocol
    let url = scanData.websiteUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const res = await quickAudit(scanData.email.trim(), url, scanData.firstName.trim(), scanData.lastName.trim());
    if (res?.error) {
      setError(res.error);
    } else {
      // Backend typically returns a message like "Audit started"
      setSuccess(res?.message || '🆓 Your FREE scan has started! We\'ll email you the results shortly - no subscription required!');
      // Optionally clear the form
      setScanData({ websiteUrl: '', email: '', firstName: '', lastName: '' });
    }
  } catch (err) {
    console.error('Scan error:', err);
    setError('Unable to start the scan right now. Please try again in a moment.');
  } finally {
    setIsScanning(false);
  }
};

 // If navigated from Services with openScan=1, scroll into view
 useEffect(() => {
   const params = new URLSearchParams(window.location.search);
   if (params.get('openScan') === '1') {
     // Add a small delay to ensure the page is fully rendered
     setTimeout(() => {
       if (formRef.current) {
         // Scroll to center the form in the viewport
         formRef.current.scrollIntoView({ 
           behavior: 'smooth', 
           block: 'center',
           inline: 'center'
         });
         
         // Highlight the form briefly to draw attention
         setFormHighlighted(true);
         setTimeout(() => setFormHighlighted(false), 3000);
         
         // Clear the URL parameter after scrolling
         const url = new URL(window.location);
         url.searchParams.delete('openScan');
         window.history.replaceState({}, '', url);
       }
     }, 500);
   }
 }, []);

 return (
   <div className="min-h-screen">
      {/* HERO SECTION */}
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
               <span className="block">Are You Delivering</span>
               <span className="block bg-gradient-to-r from-blue-300 via-green-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent leading-tight" style={{lineHeight: '1.2', paddingBottom: '0.1em'}}>
                 Older Adult Friendly Digital Experiences?
               </span>
             </h1>
             
             <h2 className="text-xl sm:text-2xl text-gray-200 font-light leading-relaxed max-w-4xl mx-auto">
             <b>Reach 124 million older adults with $8.3 trillion in buying power.</b> <br />Unlock your SilverSurfers Score today.
             </h2>
           </div>

           {/* Scan form */}
           <div className="max-w-2xl mx-auto">
             <div className={`bg-white/8 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/20 shadow-2xl shadow-green-500/10 transition-all duration-1000 ${
               formHighlighted ? 'ring-4 ring-green-400/50 ring-opacity-75 shadow-green-400/30 shadow-2xl' : ''
             }`}>
               {/* Success message - moved above form for better visibility */}
               {success && (
                 <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg backdrop-blur-sm">
                   <p className="text-green-100 text-base text-center">{success}</p>
                 </div>
               )}
               
               {/* Error message - also moved above form for better visibility */}
               {error && (
                 <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
                   <p className="text-red-200 text-base text-center">{error}</p>
                 </div>
               )}
               
               <form ref={formRef} onSubmit={handleScanSubmit} noValidate className="space-y-4">
                 <div className="grid gap-4 sm:grid-cols-2">
                   <div className="relative">
                    <input
                      type="text"
                       name="websiteUrl"
                      placeholder="Enter your website"
                       value={scanData.websiteUrl}
                       onChange={handleInputChange}
                      inputMode="url"
                      autoComplete="url"
                       className="w-full px-5 py-5 bg-white/95 backdrop-blur-sm rounded-xl border border-white/30 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-base sm:text-lg shadow-lg"
                       required
                     />
                     <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                       </svg>
                     </div>
                   </div>
                   <div className="relative">
                     <input
                       type="email"
                       name="email"
                       placeholder="Work email address"
                       value={scanData.email}
                       onChange={handleInputChange}
                       className="w-full px-5 py-5 bg-white/95 backdrop-blur-sm rounded-xl border border-white/30 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-base sm:text-lg shadow-lg"
                       required
                     />
                     <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                       </svg>
                     </div>
                   </div>
                 </div>
                 <div className="grid gap-4 sm:grid-cols-2">
                   <div className="relative">
                     <input
                       type="text"
                       name="firstName"
                       placeholder="First Name"
                       value={scanData.firstName}
                       onChange={handleInputChange}
                       autoComplete="given-name"
                       className="w-full px-5 py-5 bg-white/95 backdrop-blur-sm rounded-xl border border-white/30 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-base sm:text-lg shadow-lg"
                       required
                     />
                     <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                       </svg>
                     </div>
                   </div>
                   <div className="relative">
                     <input
                       type="text"
                       name="lastName"
                       placeholder="Last Name"
                       value={scanData.lastName}
                       onChange={handleInputChange}
                       autoComplete="family-name"
                       className="w-full px-5 py-5 bg-white/95 backdrop-blur-sm rounded-xl border border-white/30 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200 text-base sm:text-lg shadow-lg"
                       required
                     />
                     <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                       </svg>
                     </div>
                   </div>
                 </div>
                 
                 {/* Device Selection for Quick Scan */}
                 <div className="space-y-3">
                   <label className="block text-sm font-medium text-white mb-2">
                     Select Device Type
                   </label>
                   <div className="grid grid-cols-3 gap-3">
                     <button
                       type="button"
                       onClick={() => setSelectedDevice('desktop')}
                       className={`p-3 border-2 rounded-lg transition-all ${
                         selectedDevice === 'desktop'
                           ? 'border-green-400 bg-green-500/30 text-white shadow-lg'
                           : 'border-white/30 bg-white/10 text-white hover:border-white/50'
                       }`}
                     >
                       <svg className="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                       </svg>
                       <div className="text-sm font-semibold">Desktop</div>
                       <div className="text-xs text-green-300 font-medium mt-0.5">FREE</div>
                     </button>
                     
                     <button
                       type="button"
                       disabled
                       className="p-3 border-2 border-gray-500/40 bg-gray-600/30 text-gray-400 rounded-lg cursor-not-allowed opacity-70"
                     >
                       <svg className="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                         <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" />
                       </svg>
                       <div className="text-sm font-semibold">Tablet</div>
                       <div className="text-xs text-orange-300 font-medium mt-0.5">Subscription</div>
                     </button>
                     
                     <button
                       type="button"
                       disabled
                       className="p-3 border-2 border-gray-500/40 bg-gray-600/30 text-gray-400 rounded-lg cursor-not-allowed opacity-70"
                     >
                       <svg className="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                       </svg>
                       <div className="text-sm font-semibold">Mobile</div>
                       <div className="text-xs text-orange-300 font-medium mt-0.5">Subscription</div>
                     </button>
                   </div>
                   <p className="text-xs text-gray-300 text-center">
                     📱 Tablet and Mobile testing available with <a href="/services" className="underline hover:text-white">paid subscriptions</a>
                   </p>
                 </div>
                 
                 <button
                   type="submit"
                   disabled={isScanning}
                   className="w-full py-4 px-8 bg-gradient-to-r from-blue-500 via-green-600 to-teal-500 hover:from-blue-700 hover:via-green-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
                 >
                   {isScanning ? (
                     <div className="flex items-center justify-center space-x-2">
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                       <span>Analyzing...</span>
                     </div>
                   ) : (
                     'Get your SilverSurfers Score'
                   )}
                 </button>
               </form>

               {/* Get Full Audit Button */}
               <div className="mt-6 text-center">
                 <a 
                   href="/subscription" 
                   className="inline-block px-6 py-3 bg-white/90 backdrop-blur-sm text-blue-600 hover:bg-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                 >
                   Get Full Audit Here
                 </a>
                 <p className="text-sm text-gray-200 mt-3">
                   Tablet and Mobile testing available with{' '}
                   <a href="/subscription" className="text-blue-200 hover:text-white font-medium underline">
                     paid subscriptions
                   </a>
                 </p>
               </div>

               <p className="text-gray-200 text-small sm:text-xl mt-6 leading-relaxed text-center font-medium">
               Earn the SilverSurfers Seal of Approval through expert audits that score your site and deliver actionable reports to create more delightful digital experiences for older adults.
               </p>
             </div>
           </div>
           {/* Replacement descriptive text instead of buttons/cards */}
           <div className="mt-12 max-w-4xl mx-auto">
             <p className="text-gray-100 text-lg sm:text-xl leading-relaxed font-medium px-4">
               SilverSurfers empowers organizations to create accessible and inclusive digital experiences that delight and engage SilverSurfers (adults 50+) as they surf the digital oceans.
             </p>
           </div>
         </div>
       </div>

       {/* Bottom gradient transition */}
       <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50/80 to-transparent"></div>
     </div>

     {/* TRUST BAR SECTION */}
     <section className="relative py-20 bg-white">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="text-center mb-16">
           <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
             Creating Delightful & Inclusive Digital Experiences
           </h2>
           <p className="text-lg sm:text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
             Trusted by businesses to create accessible, easy-to-use websites that welcome users of all ages
           </p>
         </div>

         {/* Key metrics */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
           <div className="text-center">
             <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent mb-2">500+</div>
             <div className="text-gray-700 font-medium">Websites Audited</div>
           </div>
           <div className="text-center">
             <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent mb-2">85%</div>
             <div className="text-gray-700 font-medium">Improved Accessibility</div>
           </div>
           <div className="text-center">
             <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">95%</div>
             <div className="text-gray-700 font-medium">Client Satisfaction</div>
           </div>
           <div className="text-center">
             <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">30s</div>
             <div className="text-gray-700 font-medium">Quick Assessment</div>
           </div>
         </div>

         {/* Core capabilities */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
           <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-blue-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
             <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center mb-6">
               <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
               </svg>
             </div>
             <h3 className="text-xl font-semibold text-gray-900 mb-4">Accessibility Analysis</h3>
             <p className="text-gray-700 leading-relaxed mb-4">
               Comprehensive evaluation of your website's accessibility for older adults, focusing on readability, navigation, and usability.
             </p>
           </div>

           <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-green-100 hover:shadow-xl hover:border-green-200 transition-all duration-300">
             <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center mb-6">
               <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </div>
             <h3 className="text-xl font-semibold text-gray-900 mb-4">Seal of Approval</h3>
             <p className="text-gray-700 leading-relaxed mb-4">
               Earn the SilverSurfers Seal of Approval Badge to display on your website, showing your commitment to inclusive design.
             </p>
           </div>

           <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-blue-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
             <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center mb-6">
               <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
             </div>
             <h3 className="text-xl font-semibold text-gray-900 mb-4">Improvement Guide</h3>
             <p className="text-gray-700 leading-relaxed mb-4">
               Receive detailed, actionable recommendations to enhance your website's usability for older adult visitors.
             </p>
           </div>
         </div>
       </div>
     </section>

     {/* HOW IT WORKS SECTION */}
     <section className="relative py-20 bg-gradient-to-br from-slate-100 via-blue-50 to-green-50">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="text-center mb-16">
           <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
             How SilverSurfers Works
           </h2>
           <p className="text-xl sm:text-2xl text-gray-800 max-w-4xl mx-auto leading-relaxed font-medium">
             Simple 3-step process to make your website older adult friendly and earn your <br />Seal of Approval Badge
           </p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
           <div className="relative bg-white rounded-2xl p-8 shadow-md hover:shadow-lg border border-blue-100 text-center transition-all">
             <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
               <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                 1
               </div>
             </div>
             <div className="mt-6 mb-6">
               <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-green-100 rounded-2xl mx-auto flex items-center justify-center mb-6">
                 <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
               </div>
               <h3 className="text-2xl font-bold text-gray-900 mb-4">Quick Scan</h3>
               <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
                 Enter your URL to get an instant <span className="font-semibold">SilverSurfers Score</span> and see how accessible and inclusive your website really is.
               </p>
               <button
                 onClick={navigateToServices}
                 className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
               >
                 Get Full Audit Here
               </button>
             </div>
           </div>

           <div className="relative bg-white rounded-2xl p-8 shadow-md hover:shadow-lg border border-green-100 text-center transition-all">
             <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
               <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                 2
               </div>
             </div>
             <div className="mt-6 mb-6">
               <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl mx-auto flex items-center justify-center mb-6">
                 <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
               </div>
               <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Improvements</h3>
               <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
                 Receive expert guidance that goes beyond industry standards, offering improvements in visual design, navigation, and user experience to enhance accessibility and create more delightful digital experiences for older adults.
               </p>
             </div>
           </div>

           <div className="relative bg-white rounded-2xl p-8 shadow-md hover:shadow-lg border border-blue-100 text-center transition-all">
             <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
               <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                 3
               </div>
             </div>
             <div className="mt-6 mb-6">
               <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-green-100 rounded-2xl mx-auto flex items-center justify-center mb-6">
                 <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
               </div>
               <h3 className="text-2xl font-bold text-gray-900 mb-4">Earn Your Seal</h3>
               <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
                 Once you meet SilverSurfers standards, earn the SilverSurfers Seal of Approval to proudly display on your website.
               </p>
             </div>
           </div>
         </div>

         <div className="text-center">
           <button 
             onClick={navigateToServices}
             className="px-10 py-5 bg-gradient-to-r from-blue-500 via-green-600 to-teal-500 hover:from-blue-700 hover:via-green-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-lg"
           >
             Explore Our Services
           </button>
         </div>
       </div>
     </section>

     {/* TESTIMONIAL SECTION */}
     <section className="relative py-20 bg-white">
       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
         <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-lg border border-blue-100">
           <svg className="w-16 h-16 text-blue-300 mx-auto mb-8" fill="currentColor" viewBox="0 0 24 24">
             <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-10zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
           </svg>
           <blockquote className="text-xl lg:text-2xl text-gray-700 font-medium leading-relaxed mb-8">
             "SilverSurfers helped us create a website that our older customers can actually use. Our conversion rate from senior visitors increased by 40% after implementing their recommendations."
           </blockquote>
           <div className="flex items-center justify-center space-x-4">
             <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
               <span className="text-white font-bold text-lg">M</span>
             </div>
             <div className="text-left">
               <div className="font-semibold text-gray-900">Maria Rodriguez</div>
               <div className="text-gray-600">Owner, Sunset Health Services</div>
             </div>
           </div>
         </div>
       </div>
     </section>

     {/* FINAL CTA SECTION */}
     <section className="relative py-20 bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/20 via-transparent to-green-500/10"></div>
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(103,159,186,0.1),transparent_50%)]"></div>
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(223,120,47,0.1),transparent_50%)]"></div>
       
       <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
         <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
           Ready to welcome{' '}
           <span className="bg-gradient-to-r from-blue-300 via-green-400 to-teal-300 bg-clip-text text-transparent">
             all generations?
           </span>
         </h2>
         <p className="text-xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed">
           Start your journey to creating an inclusive and delightful digital experience for everyone. Get your free assessment and discover how to make your digital assets accessible to users of all ages.
         </p>
         <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button 
            onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 via-green-600 to-teal-500 hover:from-blue-700 hover:via-green-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg"
          >
            Get the Quick Scan Report
          </button>
          <button 
            onClick={handleContactClick}
            className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 font-semibold rounded-xl hover:bg-white/20 hover:border-white/50 transition-all duration-300 text-lg"
          >
            Contact Our Team
          </button>
         </div>
         
         {/* Get Full Audit Button */}
         <div className="mt-8 text-center">
           <a 
             href="/subscription" 
             className="inline-block px-6 py-3 bg-white/90 backdrop-blur-sm text-blue-600 hover:bg-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
           >
             Get Full Audit Here
           </a>
           <p className="text-sm text-gray-200 mt-4">
             Tablet and Mobile testing available with{' '}
             <a href="/subscription" className="text-blue-200 hover:text-white font-medium underline">
               paid subscriptions
             </a>
           </p>
         </div>
       </div>
     </section>
     
     <ScanResultsModal 
        result={scanResult}
        isVisible={showResultsModal}
        onClose={handleCloseModal}
      />
   </div>
 );
};

export default MainScreen;