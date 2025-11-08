import React, { useState, useCallback, ChangeEvent, useEffect, useRef } from 'react';
import { generateCodeFromImage } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import CodeBlock from './components/CodeBlock';
import Loader from './components/Loader';

// --- Icon Components ---
const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" opacity="0.4" />
    </svg>
);
const DesktopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const TabletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);
const MobileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M6 21h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);


// Creates a complete, self-contained HTML file string that listens for code.
const createPreviewHtml = (): string => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="img-src 'self' data:;">
    <title>Wireframe Wizard Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
      html, body, #root { height: 100%; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      .error-container { color: #b91c1c; background-color: #fee2e2; font-family: monospace; padding: 20px; height: 100vh; box-sizing: border-box; overflow: auto; }
      .error-container h3 { margin-top: 0; font-family: sans-serif; }
      .error-container pre { white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/javascript">
      window.addEventListener('message', (event) => {
        if (event.data.type === 'code') {
          try {
            const transformedCode = Babel.transform(event.data.code, { 
              presets: ['react', 'typescript'], 
              filename: 'component.tsx' // This is required for the TSX preset
            }).code;
            const script = document.createElement('script');
            script.innerHTML = transformedCode;
            document.body.appendChild(script);
          } catch (e) {
            const root = document.getElementById('root');
            if (root) {
              root.innerHTML = '<div class="error-container"><h3>Preview Error</h3><pre>' + e.message + '</pre><hr style="margin: 1em 0;" /><h4>Stack Trace:</h4><pre>' + e.stack + '</pre></div>';
            }
            console.error(e);
          }
        }
      }, false);
      window.parent.postMessage('ready', '*');
    </script>
  </body>
  </html>
`;

type Device = 'desktop' | 'tablet' | 'mobile';

const devices: Record<Device, { width: string; height: string; label: string; }> = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '667px', label: 'Mobile' },
};


export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatedTsx, setGeneratedTsx] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [selectedDevice, setSelectedDevice] = useState<Device>('desktop');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isIframeReady, setIsIframeReady] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow && event.data === 'ready') {
        setIsIframeReady(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (isIframeReady && generatedTsx && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'code', code: generatedTsx }, '*');
    }
  }, [isIframeReady, generatedTsx]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setImageUrl(reader.result as string); };
      reader.readAsDataURL(file);
      setGeneratedTsx(null);
      setError(null);
    }
  };

  const handleGenerateCode = useCallback(async () => {
    if (!imageFile) {
      setError("Please upload an image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedTsx(null);
    setIsIframeReady(false); // Reset iframe readiness for new content
    setActiveTab('preview');
    setSelectedDevice('desktop');

    try {
      const { base64, mimeType } = await fileToBase64(imageFile);
      const { tsx } = await generateCodeFromImage(base64, mimeType);
      setGeneratedTsx(tsx);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate code: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [imageFile]);
  
  const resetState = () => {
    setImageFile(null);
    setImageUrl(null);
    setGeneratedTsx(null);
    setIsLoading(false);
    setError(null);
    setIsIframeReady(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col">
       <header className="py-5 px-4 md:px-8 border-b border-gray-800/50 sticky top-0 bg-gray-950/80 backdrop-blur-sm z-20">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
            Wireframe Wizard
          </h1>
          {generatedTsx ? (
             <button onClick={resetState} className="px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-indigo-500">
                Start Over
             </button>
          ) : (
            <p className="text-sm text-gray-400 hidden md:block">Napkin Sketch to Functional Code, Instantly.</p>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 flex-grow flex flex-col">
        {isLoading ? (
          <Loader />
        ) : generatedTsx ? (
          <div className="flex flex-col flex-grow animate-fade-in min-h-0">
            <div className="flex border-b border-gray-800">
              {['preview', 'code'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab as 'preview' | 'code')} className={`py-3 px-5 text-sm font-medium transition-colors ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}>
                      {tab === 'preview' ? 'Live Preview' : 'Code'}
                  </button>
              ))}
            </div>
            
            <div className="bg-gray-900 rounded-b-lg border border-t-0 border-gray-800 flex-1 flex flex-col min-h-0 shadow-lg">
              {activeTab === 'preview' ? (
                 <div className="flex flex-col flex-grow p-4 min-h-0">
                  <div className="flex justify-center items-center mb-4 p-1.5 bg-gray-800 rounded-lg space-x-1">
                    {(Object.keys(devices) as Device[]).map(device => (
                      <button key={device} onClick={() => setSelectedDevice(device)} className={`p-2 rounded-md transition-colors ${selectedDevice === device ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`} title={devices[device].label}>
                        {device === 'desktop' && <DesktopIcon />}
                        {device === 'tablet' && <TabletIcon />}
                        {device === 'mobile' && <MobileIcon />}
                      </button>
                    ))}
                  </div>
                  <div className={`flex-grow grid overflow-auto bg-dots ${selectedDevice !== 'desktop' ? 'place-items-center' : ''}`}>
                    <div 
                      className={`shadow-2xl transition-all duration-300 ease-in-out ${selectedDevice !== 'desktop' ? 'rounded-xl' : 'w-full h-full'}`}
                      style={selectedDevice !== 'desktop' ? { width: devices[selectedDevice].width, height: devices[selectedDevice].height, maxWidth: '100%', maxHeight: '100%' } : {}}
                    >
                      <iframe
                        ref={iframeRef}
                        srcDoc={createPreviewHtml()}
                        title="Live Preview"
                        sandbox="allow-scripts allow-same-origin"
                        className="w-full h-full bg-white"
                        style={{ borderRadius: selectedDevice !== 'desktop' ? '1rem' : '0' }}
                      />
                    </div>
                  </div>
                  <style>{`.bg-dots { background-image: radial-gradient(#2d3748 1px, transparent 0); background-size: 20px 20px; }`}</style>
                </div>
              ) : (
                <CodeBlock title="Generated Component (.tsx)" language="tsx" code={generatedTsx!} />
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center animate-fade-in my-auto">
            <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 animate-tilt"></div>
                <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-8 md:p-12">
                  <input type="file" id="file-upload" className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="mx-auto max-h-64 rounded-lg" />
                    ) : (
                      <div className="flex flex-col items-center space-y-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg font-medium text-gray-300"><span className="text-indigo-400">Upload a sketch</span> or drag and drop</p>
                        <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
            </div>
            {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-md">{error}</p>}
            {imageFile && (
              <button onClick={handleGenerateCode} disabled={isLoading} className="mt-8 w-full inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-semibold rounded-full shadow-lg text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/50 hover:shadow-purple-500/50 hover:shadow-2xl">
                <MagicWandIcon />
                Wizardify My Sketch
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}