import React from 'react';

const SimpleTextFormatter = ({ text }) => {
  if (!text) return null;

  // Convert simple markdown-like formatting to JSX
  const formatText = (input) => {
    // Split by lines to handle line breaks
    const lines = input.split('\n');
    
    return lines.map((line, index) => {
      let formattedLine = line;
      let element = null;

      // Handle headings
      if (line.startsWith('# ')) {
        element = <h1 key={index} className="text-3xl font-bold text-gray-900 mb-4">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        element = <h2 key={index} className="text-2xl font-semibold text-gray-800 mb-3">{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        element = <h3 key={index} className="text-xl font-medium text-gray-700 mb-2">{line.substring(4)}</h3>;
      } else if (line.trim() === '') {
        element = <br key={index} />;
      } else {
        // Handle inline formatting
        let processedLine = line;
        
        // Bold text: **text**
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic text: *text*
        processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        element = (
          <p 
            key={index} 
            className="text-gray-700 mb-3 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        );
      }

      return element;
    });
  };

  return (
    <div className="prose max-w-none">
      {formatText(text)}
    </div>
  );
};

export default SimpleTextFormatter;

