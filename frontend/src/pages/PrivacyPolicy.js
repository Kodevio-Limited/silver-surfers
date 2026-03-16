import React from 'react';
import LegalDocumentViewer from '../components/LegalDocumentViewer';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-green-900 to-teal-900 pt-24 pb-8"> {/* Dark background for header visibility */}
      <div className="container mx-auto px-4">
        <LegalDocumentViewer 
          type="privacy-policy" 
          showAcceptButton={false} // Don't show accept button on public page
        />
      </div>
    </div>
  );
};

export default PrivacyPolicy;