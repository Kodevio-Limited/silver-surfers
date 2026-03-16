import React from 'react';

const About = () => {
  const mission = {
  title: "Our Mission: Making the Web Accessible for Everyone",
  description: "SilverSurfers was founded on the belief that the digital world should be welcoming to people of all ages. As more adults over 50 engage online, we saw a growing need for digital experiences that truly serve them. Our mission is to bridge the digital divide by helping businesses create inclusive, older adult–friendly experiences that work beautifully for every generation.",
  };

  const approach = [
    {
      icon: "♿",
      title: "Accessibility First",
      description: "We utilize inclusive design principles that ensure digital experiences are usable for people of all abilities and technical skill levels."
    },
    {
      icon: "👥",
      title: "User-Focused",
      description: "Every recommendation is based on real user research and testing with older adult participants."
    },
    {
      icon: "🎯",
      title: "Results-Driven",
      description: "We measure success by improved user engagement, reduced bounce rates, and positive feedback from older adult users."
    },
    {
      icon: "🤝",
      title: "Partnership",
      description: "We work with your team to enhance accessibility & inclusivity while preserving the integrity of your brand."
    }
  ];

  const stats = [
    { number: "124M+", label: "SilverSurfers Online", description: "Active older adults utilizing digital services" },
    { number: "500+", label: "Sites Audited", description: "Digital experiences improved for older adults" },
    { number: "85%", label: "Better Usability", description: "Average improvement in older adult digital experiences" }
  ];


  return (
    <div className="min-h-screen relative  bg-white">
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
                   About SilverSurfers
                </span>
              </h1>
              
              <h2 className="text-xl sm:text-2xl text-gray-200 font-light leading-relaxed max-w-4xl mx-auto">
                Experts in Creating Inclusive Digital Experiences
                <br />
                We help businesses make their digital experiences welcoming and easy to use for everyone.
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Statement Section */}
      <section id="mission" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                {mission.title}
              </h2>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 via-green-50/50 to-blue-50/30 rounded-3xl p-8 lg:p-12 border border-blue-100 shadow-lg">
              <p className="text-xl text-gray-700 leading-relaxed">
                {mission.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Our Impact</h2>
            <p className="text-xl text-gray-600 leading-relaxed">Measurable results across digital platforms</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto justify-items-center">
            {stats.map((stat, index) => (
              <div key={index} className="w-full sm:w-80 bg-white rounded-2xl p-8 shadow-lg border border-green-100 text-center hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-xl font-semibold text-gray-900 mb-3">{stat.label}</div>
                <div className="text-base text-gray-600 leading-relaxed">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values/Approach Section */}
      <section id="approach" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Our Approach & Values</h2>
            <p className="text-xl text-gray-600 leading-relaxed">The core principles that guide our work</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {approach.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-2xl flex items-center justify-center text-2xl">
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section id="team" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Our Values</h2>
            <p className="text-xl text-gray-600 leading-relaxed">The principles that guide how we serve, innovate, and build inclusive digital experiences</p>
          </div>
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {[
              { letter: 'S', title: 'Supportive', description: 'We design digital experiences that guide and assist older adults with clarity.' },
              { letter: 'I', title: 'Inclusive', description: 'Our platforms welcome all users, regardless of ability or background.' },
              { letter: 'L', title: 'Legible', description: 'We prioritize readability with clear fonts, contrast, and layouts.' },
              { letter: 'V', title: 'Value', description: 'We create meaningful tools that enhance everyday life for older adults.' },
              { letter: 'E', title: 'Empowering', description: 'We enable confidence and independence through intuitive design.' },
              { letter: 'R', title: 'Respectful', description: 'We treat older adults as capable, valued users deserving of excellent digital experiences.' }
            ].map((val, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-green-50/40 rounded-2xl p-8 shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center space-x-6 w-full">
                <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-blue-500 via-blue-600 to-green-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {val.letter}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 break-words">{val.title}</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">{val.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 overflow-hidden">
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
            Curious to learn more or have questions?
          </h2>
          <p className="text-xl sm:text-2xl text-gray-200 mb-10 max-w-3xl mx-auto leading-relaxed">
            We're not a faceless company – we're people who care deeply about inclusive, older adult–friendly digital experiences. Reach out anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/contact#contact-form" className="px-8 py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-green-500 hover:from-blue-600 hover:via-blue-700 hover:to-green-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg">Contact Us</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;