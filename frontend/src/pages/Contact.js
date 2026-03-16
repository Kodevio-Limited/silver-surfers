import React, { useState } from 'react';
import { submitContact, getMe } from '../api';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    business: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const contactInfo = {
  email: "hello@silversurfers.ai",
  phone: "+19146238747",
  phoneDisplay: "+1 914-623-8747",
  address: "2320 E Marshall Ave, Phoenix, AZ 85016",
    officeHours: "Monday - Friday: 9:00 AM - 7:00 PM EST",
    responseTime: "We typically respond within 4-6 hours on weekdays"
  };

  const contactMethods = [
    {
      icon: "📧",
      title: "Email Us",
      description: "Send us a detailed message about your accessibility needs",
      action: "hello@silversurfers.ai",
      link: "https://mail.google.com/mail/?view=cm&fs=1&to=hello@silversurfers.ai",
      gradient: "from-blue-500 to-green-500",
      target: "_blank"
    },
    {
      icon: "📞",
      title: "Call Sales",
      description: "Speak with one of our experts",
      action: "+1 914-623-8747",
      link: "tel:+19146238747",
      gradient: "from-green-500 to-teal-500"
    },
    {
      icon: "📅",
      title: "Schedule Consultation",
      description: "Book a 30-minute consultation call with our team",
      action: "Book Now",
      link: "https://calendly.com/silversurfers-info/30min",
      gradient: "from-blue-500 to-green-500"
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(isSubmitting) return;
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      if (!formData.message || formData.message.trim().length < 5) {
        setSubmitStatus({ type:'error', message: 'Please include a message (min 5 characters).' });
        return;
      }
      const payload = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject || `Inquiry from ${formData.business || 'visitor'}`,
        message: formData.message,
      };
      const res = await submitContact(payload);
      if (res?.error) {
        setSubmitStatus({ type:'error', message: res.error });
      } else {
        setSubmitStatus({ type:'success', message: 'Thanks! Your message was sent. We will reply shortly.' });
        setFormData({ name:'', business:'', email:'', subject:'', message:'' });
      }
    } catch(err){
      setSubmitStatus({ type:'error', message: 'This is a demo version. Please contact us directly.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(()=> setSubmitStatus(null), 7000);
    }
  };

  return (
    <div className="min-h-screen">
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
                  Get in Touch
                </span>
              </h1>
              
              <h2 className="text-xl sm:text-2xl text-gray-200 font-light leading-relaxed max-w-4xl mx-auto">
                Have questions or need a custom quote? <br />Our friendly, expert team is here to help! <br />Contact us today.
              </h2>
            </div>
          </div>
        </div>
      </div>

  {/* Contact Methods */}
  <section id="support" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">How Can We Help?</h2>
            <p className="text-xl text-gray-600 leading-relaxed">Choose the best way to reach us based on your needs</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => (
              <div key={index} className="group relative bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-200 hover:border-purple-200 transition-all duration-300 hover:shadow-2xl hover:scale-105 text-center flex flex-col h-full">
                <div className="flex-grow flex flex-col">
                  <div className={`w-20 h-20 bg-gradient-to-br ${method.gradient} rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 text-2xl`}>
                    {method.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{method.title}</h3>
                  <p className="text-gray-600 mb-6 text-lg leading-relaxed flex-grow">{method.description}</p>
                </div>
                <a 
                  href={method.link} 
                  target={method.target || "_self"}
                  rel={method.target === "_blank" ? "noopener noreferrer" : undefined}
                  className={`inline-flex items-center px-6 py-3 bg-gradient-to-r ${method.gradient} text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-lg mt-auto`}
                >
                  {method.action}
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

    {/* Contact Form */}
  <section id="form" className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-xl border border-purple-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Tell us about your business and what you hope to achieve. We'll respond promptly.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-900 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Your full name"
                    className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 shadow-sm text-lg"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-900 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="your.email@company.com"
                    className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 shadow-sm text-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  name="business"
                  value={formData.business}
                  onChange={handleInputChange}
                  placeholder="Your company name"
                  className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="How can we help?"
                  className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 shadow-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows="6"
                  placeholder=""
                  required
                  className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 shadow-sm resize-none"
                ></textarea>
              </div>
              
                <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 px-8 bg-gradient-to-r from-blue-500 via-blue-600 to-green-500 hover:from-blue-600 hover:via-blue-700 hover:to-green-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send Message'
                )}
              </button>
            </div>
            
            {submitStatus && submitStatus.type==='success' && (
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-2xl">
                <div className="flex items-center mb-3">
                  <svg className="w-6 h-6 text-green-600 mr-2" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  <h3 className="text-lg font-semibold text-green-800">Message Sent Successfully!</h3>
                </div>
                <p className="text-green-700">{submitStatus.message}</p>
              </div>
            )}
            {submitStatus && submitStatus.type==='error' && (
              <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-center mb-3">
                  <svg className="w-6 h-6 text-red-600 mr-2" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <h3 className="text-lg font-semibold text-red-800">Failed to Send</h3>
                </div>
                <p className="text-red-700">{submitStatus.message}</p>
              </div>
            )}
          </div>
        </div>
      </section>

  {/* Contact Information */}
  <section id="contact-info" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-lg text-gray-600">Reach out to our friendly, expert team</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                📧
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-sm text-gray-600 mb-3">For general inquiries and support</p>
              <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${contactInfo.email}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 font-medium">
                {contactInfo.email}
              </a>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                📞
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-sm text-gray-600 mb-3">For sales and urgent inquiries</p>
              <a href={`tel:${contactInfo.phone}`} className="text-purple-600 hover:text-purple-700 font-medium">
                {contactInfo.phoneDisplay}
              </a>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                📍
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Address</h3>
              <p className="text-sm text-gray-600 mb-3">Our headquarters</p>
              <span className="text-gray-700">{contactInfo.address}</span>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                🕒
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Hours</h3>
              <p className="text-sm text-gray-600 mb-3">When we're available</p>
              <span className="text-gray-700">{contactInfo.officeHours}</span>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Response Time</h3>
              <p className="text-sm text-gray-600 mb-3">How quickly we'll get back to you</p>
              <span className="text-gray-700">{contactInfo.responseTime}</span>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                💬
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Custom Solutions</h3>
              <p className="text-sm text-gray-600 mb-3">Need something specific?</p>
              <span className="text-gray-700">We can create custom solutions for your digital business. Contact us today.</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tl from-blue-500/20 via-transparent to-green-500/10"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Improve Your Digital Experience?
          </h2>
          <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
            Join hundreds of businesses that are already enhancing their digital experience to capture the SilverSurfers market.  Our expert team is ready to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/" className="px-8 py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-green-500 hover:from-blue-600 hover:via-blue-700 hover:to-green-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
              Quick Scan Report
            </a>
            <a 
              href="/services" 
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 font-semibold rounded-xl hover:bg-white/20 hover:border-white/50 transition-all duration-300"
            >
              View Services
            </a>
            <a 
              href="https://calendly.com/silversurfers-info/30min" 
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 font-semibold rounded-xl hover:bg-white/20 hover:border-white/50 transition-all duration-300"
            >
              Schedule Call
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;