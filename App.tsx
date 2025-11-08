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
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            document.getElementById('root').innerHTML = ''; // Clear previous content
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

// --- Authentication Components ---

const AuthFormContainer = ({ title, children }) => (
    <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
            <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-1000 animate-tilt"></div>
                <div className="relative bg-gray-900 border border-gray-800 rounded-xl p-8">
                    <h1 className="text-3xl md:text-4xl text-center font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">
                        Wireframe Wizard
                    </h1>
                    <p className="text-center text-gray-400 mb-8">{title}</p>
                    {children}
                </div>
            </div>
        </div>
    </div>
);

const LoginPage = ({ onLogin, onSwitchToSignup }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!onLogin(email, password)) {
            setError('Invalid email or password.');
        }
    };

    return (
        <AuthFormContainer title="Welcome back, please log in.">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon /></div>
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><LockIcon /></div>
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" className="w-full py-3 font-semibold rounded-md text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/50">Log In</button>
                <p className="text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <button type="button" onClick={onSwitchToSignup} className="font-medium text-indigo-400 hover:underline">Sign up</button>
                </p>
            </form>
        </AuthFormContainer>
    );
};

const SignupPage = ({ onSignup, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!onSignup(email, password)) {
            setError('An account with this email already exists.');
        }
    };
    
    return (
        <AuthFormContainer title="Create your account.">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon /></div>
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><LockIcon /></div>
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" className="w-full py-3 font-semibold rounded-md text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/50">Create Account</button>
                <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <button type="button" onClick={onSwitchToLogin} className="font-medium text-indigo-400 hover:underline">Log in</button>
                </p>
            </form>
        </AuthFormContainer>
    );
};


// --- Result Viewer Component (reusable for wizard and profile) ---
// FIX: Add interface for component props to resolve type error. The initialTab prop was being inferred as 'string' instead of the more specific '"preview" | "code"', causing a type mismatch when initializing the component's state.
interface ResultViewerProps {
  generatedTsx: string;
  initialTab?: 'preview' | 'code';
}
const ResultViewer = ({ generatedTsx, initialTab = 'preview' }: ResultViewerProps) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>(initialTab);
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

   return (
      <div className="flex flex-col flex-grow animate-fade-in min-h-0">
        <div className="flex border-b border-gray-800">
          {/* FIX: Use 'as const' to ensure 'tab' is inferred as 'preview' | 'code', not string. */}
          {(['preview', 'code'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`py-3 px-5 text-sm font-medium transition-colors ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}>
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
                <div className={`shadow-2xl transition-all duration-300 ease-in-out ${selectedDevice !== 'desktop' ? 'rounded-xl' : 'w-full h-full'}`} style={selectedDevice !== 'desktop' ? { width: devices[selectedDevice].width, height: devices[selectedDevice].height, maxWidth: '100%', maxHeight: '100%' } : {}}>
                  <iframe ref={iframeRef} srcDoc={createPreviewHtml()} title="Live Preview" sandbox="allow-scripts allow-same-origin" className="w-full h-full bg-white" style={{ borderRadius: selectedDevice !== 'desktop' ? '1rem' : '0' }}/>
                </div>
              </div>
              <style>{`.bg-dots { background-image: radial-gradient(#2d3748 1px, transparent 0); background-size: 20px 20px; }`}</style>
            </div>
          ) : (
            <CodeBlock title="Generated Component (.tsx)" language="tsx" code={generatedTsx!} />
          )}
        </div>
      </div>
   )
}


// --- Main Wizard Application ---
const WizardApp = ({ user, onLogout, onSwitchToProfile }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatedTsx, setGeneratedTsx] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const saveWireframeToHistory = (wireframe) => {
    const history = JSON.parse(localStorage.getItem('wireframe-wizard-history') || '{}');
    if (!history[user.email]) {
        history[user.email] = [];
    }
    history[user.email].unshift(wireframe); // Add to the beginning of the list
    localStorage.setItem('wireframe-wizard-history', JSON.stringify(history));
  };


  const handleGenerateCode = useCallback(async () => {
    if (!imageFile || !imageUrl) {
      setError("Please upload an image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedTsx(null);

    try {
      const { base64, mimeType } = await fileToBase64(imageFile);
      const { tsx } = await generateCodeFromImage(base64, mimeType);
      setGeneratedTsx(tsx);
      
      // Save to history on success
      const newWireframe = {
        id: new Date().toISOString(),
        sketchUrl: imageUrl,
        generatedTsx: tsx,
        createdAt: new Date().toISOString(),
      };
      saveWireframeToHistory(newWireframe);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate code: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, imageUrl, user.email]);
  
  const resetState = () => {
    setImageFile(null);
    setImageUrl(null);
    setGeneratedTsx(null);
    setIsLoading(false);
    setError(null);
  }
  
  return (
    <>
       <header className="py-5 px-4 md:px-8 border-b border-gray-800/50 sticky top-0 bg-gray-950/80 backdrop-blur-sm z-20">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
            Wireframe Wizard
          </h1>
          <div className="flex items-center space-x-4">
            {generatedTsx && (
                <button onClick={resetState} className="px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-indigo-500">
                    New Sketch
                </button>
            )}
            <div className="hidden md:flex items-center space-x-4 pl-4 border-l border-gray-700">
                <span className="text-sm text-gray-400 truncate max-w-[150px]">{user.email}</span>
                 <button onClick={onSwitchToProfile} className="px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-indigo-500">
                    My Profile
                 </button>
                 <button onClick={onLogout} className="px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-indigo-500">
                    Logout
                 </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 flex-grow flex flex-col">
        {isLoading ? (
          <Loader />
        ) : generatedTsx ? (
          <ResultViewer generatedTsx={generatedTsx} />
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
    </>
  );
}

// --- My Profile Page ---
const ProfilePage = ({ user, onLogout, onSwitchToApp }) => {
    const [wireframes, setWireframes] = useState([]);
    const [selectedWireframe, setSelectedWireframe] = useState(null);
    const [wireframeToDelete, setWireframeToDelete] = useState(null);

    useEffect(() => {
        const history = JSON.parse(localStorage.getItem('wireframe-wizard-history') || '{}');
        setWireframes(history[user.email] || []);
    }, [user.email]);
    
    const handleDelete = (e, wireframeId) => {
        e.stopPropagation(); // Prevent card click event from firing
        setWireframeToDelete(wireframeId);
    };
    
    const confirmDelete = () => {
        if (!wireframeToDelete) return;
        
        const history = JSON.parse(localStorage.getItem('wireframe-wizard-history') || '{}');
        const userHistory = history[user.email] || [];
        const updatedHistory = userHistory.filter(w => w.id !== wireframeToDelete);
        history[user.email] = updatedHistory;
        localStorage.setItem('wireframe-wizard-history', JSON.stringify(history));
        
        setWireframes(updatedHistory);
        setWireframeToDelete(null); // Close modal
    };

    return (
        <>
            <header className="py-5 px-4 md:px-8 border-b border-gray-800/50 sticky top-0 bg-gray-950/80 backdrop-blur-sm z-20">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
                        My Profile
                    </h1>
                    <div className="flex items-center space-x-4">
                        <button onClick={onSwitchToApp} className="px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors">
                            Back to Wizard
                        </button>
                        <div className="hidden md:flex items-center space-x-4 pl-4 border-l border-gray-700">
                            <span className="text-sm text-gray-400 truncate max-w-[150px]">{user.email}</span>
                            <button onClick={onLogout} className="px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8 flex-grow">
                {selectedWireframe ? (
                    <div className="flex flex-col h-full">
                        <div className="mb-6 flex items-center justify-between">
                             <div>
                                <h2 className="text-xl font-bold text-white">Viewing Wireframe</h2>
                                <p className="text-sm text-gray-400">Created on {new Date(selectedWireframe.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedWireframe(null)} className="px-4 py-2 bg-gray-800 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 transition-colors">
                                &larr; Back to Gallery
                            </button>
                        </div>
                        <ResultViewer generatedTsx={selectedWireframe.generatedTsx} />
                    </div>
                ) : wireframes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {wireframes.map((wireframe) => (
                            <div key={wireframe.id} onClick={() => setSelectedWireframe(wireframe)} className="group relative aspect-square bg-gray-900 border border-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1">
                                <img src={wireframe.sketchUrl} alt="Wireframe sketch" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button onClick={(e) => handleDelete(e, wireframe.id)} className="p-2 bg-red-600/80 hover:bg-red-500 rounded-full text-white shadow-lg transition-colors" aria-label="Delete wireframe">
                                        <TrashIcon />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 left-0 p-4">
                                    <p className="text-sm font-medium text-white">Created:</p>
                                    <p className="text-xs text-gray-400">{new Date(wireframe.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center my-auto">
                        <h2 className="text-2xl font-semibold text-gray-300">No Wireframes Yet</h2>
                        <p className="text-gray-500 mt-2">Start by creating your first wireframe with the wizard!</p>

                        <button onClick={onSwitchToApp} className="mt-6 px-6 py-3 font-semibold rounded-md text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300">
                            Go to Wizard
                        </button>
                    </div>
                )}
            </main>
            
            {/* Delete Confirmation Modal */}
            {wireframeToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full m-4">
                        <h3 className="text-xl font-bold text-white mb-4">Confirm Deletion</h3>
                        <p className="text-gray-400 mb-8">Are you sure you want to permanently delete this wireframe? This action cannot be undone.</p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={() => setWireframeToDelete(null)} className="px-5 py-2.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </>
    );
};


// --- App Shell / Router ---
export default function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('login'); // 'login', 'signup', 'app', 'profile'

    useEffect(() => {
        const loggedInUser = localStorage.getItem('wireframe-wizard-user');
        if (loggedInUser) {
            try {
                const parsedUser = JSON.parse(loggedInUser);
                if (parsedUser && parsedUser.email) {
                    setUser(parsedUser);
                    setView('app');
                }
            } catch (e) {
                // Malformed user data, clear it
                localStorage.removeItem('wireframe-wizard-user');
            }
        }
    }, []);

    const handleLogin = (email, password) => {
        // In a real app, this would be an API call to a secure backend.
        // WARNING: Storing user data and passwords in localStorage is INSECURE and for prototype purposes ONLY.
        const storedUsers = JSON.parse(localStorage.getItem('wireframe-wizard-users') || '{}');
        if (storedUsers[email] && storedUsers[email].password === password) {
            const userData = { email };
            localStorage.setItem('wireframe-wizard-user', JSON.stringify(userData));
            setUser(userData);
            setView('app');
            return true;
        }
        return false;
    };
    
    const handleSignup = (email, password) => {
        const storedUsers = JSON.parse(localStorage.getItem('wireframe-wizard-users') || '{}');
        if (storedUsers[email]) {
            return false; // User already exists
        }
        storedUsers[email] = { password };
        localStorage.setItem('wireframe-wizard-users', JSON.stringify(storedUsers));
        
        // Auto-login after successful signup
        const userData = { email };
        localStorage.setItem('wireframe-wizard-user', JSON.stringify(userData));
        setUser(userData);
        setView('app');
        return true;
    };
    
    const handleLogout = () => {
        localStorage.removeItem('wireframe-wizard-user');
        setUser(null);
        setView('login');
    };
    
    const renderView = () => {
        if (!user) {
             switch (view) {
                case 'signup':
                    return <SignupPage onSignup={handleSignup} onSwitchToLogin={() => setView('login')} />;
                case 'login':
                default:
                    return <LoginPage onLogin={handleLogin} onSwitchToSignup={() => setView('signup')} />;
            }
        }

        switch (view) {
            case 'profile':
                 return <ProfilePage user={user} onLogout={handleLogout} onSwitchToApp={() => setView('app')} />;
            case 'app':
            default:
                return <WizardApp user={user} onLogout={handleLogout} onSwitchToProfile={() => setView('profile')} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col">
            {renderView()}
        </div>
    );
}
