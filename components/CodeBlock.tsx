import React, { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language: 'tsx' | 'css';
  title: string;
}

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);


const CodeBlock = ({ code, language, title }: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 relative flex flex-col flex-1 min-h-0 shadow-lg">
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800 flex-shrink-0 bg-gray-800/50 rounded-t-lg">
        <p className="text-sm font-semibold text-gray-300 font-mono">{title}</p>
        <button
          onClick={handleCopy}
          className="p-1.5 bg-gray-700 rounded-md text-gray-400 hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-colors"
          aria-label={`Copy ${title} code`}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <div className="overflow-auto h-full">
        <pre className="p-4 text-sm h-full">
            <code className={`language-${language} text-gray-300 font-mono`}>
            {code}
            </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;