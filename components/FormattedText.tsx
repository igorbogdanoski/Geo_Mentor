import React from 'react';
import katex from 'katex';

interface FormattedTextProps {
  text: string;
  className?: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "" }) => {
  if (!text) return null;

  // Process the text line by line to handle list items properly
  const lines = text.split('\n');
  
  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, lineIndex) => {
        // Handle Bullet Points
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ');
        const cleanLine = isBullet ? line.replace(/^[\-\*\•]\s+/, '') : line;

        // Regex to split by LaTeX delimiters: $$...$$ (display) or $...$ (inline)
        // This captures the delimiters and the content inside
        const parts = cleanLine.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

        const renderedLine = parts.map((part, index) => {
          // Check if part is LaTeX
          if (part.startsWith('$')) {
            const isDisplay = part.startsWith('$$');
            const mathContent = isDisplay ? part.slice(2, -2) : part.slice(1, -1);
            
            try {
              const html = katex.renderToString(mathContent, {
                throwOnError: false,
                displayMode: isDisplay
              });
              return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch (e) {
              return <span key={index} className="text-red-500">{part}</span>;
            }
          }

          // Handle Basic Markdown (Bold)
          const boldParts = part.split(/(\*\*[^\*]+\*\*)/g);
          return (
            <span key={index}>
              {boldParts.map((subPart, subIndex) => {
                if (subPart.startsWith('**') && subPart.endsWith('**')) {
                  return <strong key={subIndex}>{subPart.slice(2, -2)}</strong>;
                }
                return <span key={subIndex}>{subPart}</span>;
              })}
            </span>
          );
        });

        if (isBullet) {
          return (
            <div key={lineIndex} className="flex gap-2 pl-2">
              <span className="text-slate-400">•</span>
              <div>{renderedLine}</div>
            </div>
          );
        }

        // Empty lines act as spacers
        if (!line.trim()) {
            return <div key={lineIndex} className="h-2" />;
        }

        return <div key={lineIndex}>{renderedLine}</div>;
      })}
    </div>
  );
};

export default FormattedText;