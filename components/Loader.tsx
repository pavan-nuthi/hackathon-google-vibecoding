import React from 'react';

const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center flex-grow my-auto">
      <div className="relative w-28 h-28">
        <div className="absolute -inset-2 bg-gradient-radial from-purple-600/50 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute inset-0 border-4 border-t-transparent border-purple-500 rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-4 border-t-transparent border-indigo-400 rounded-full animate-spin animation-delay-200"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        </div>
      </div>
      <h2 className="mt-8 text-2xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
        The Wizard is Building Your UI...
      </h2>
      <p className="mt-2 text-gray-500">Analyzing sketch, conjuring assets, and writing code.</p>
      
      <style>{`
        .animation-delay-200 {
            animation-duration: 1.2s;
            animation-direction: reverse;
        }
        .bg-gradient-radial {
            background-image: radial-gradient(ellipse at center, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
};

export default Loader;