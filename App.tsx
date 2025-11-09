import React, { useState, useCallback, ChangeEvent, useEffect, useRef } from 'react';
import { generateCodeFromImage } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import CodeBlock from './components/CodeBlock';
import Loader from './components/Loader';
import { DesktopIcon, TabletIcon, MobileIcon, MagicWandIcon, TrashIcon } from './components/Icons';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import { setAuthToken } from './services/apiClient';
import { useSaveWireframe, useGetSnippets } from './services/authHooks';

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
// TrashIcon is exported from ./components/Icons — don't redefine it here.
type Device = 'desktop' | 'tablet' | 'mobile';
const devices: Record<Device, { width: string; height: string; label: string; }> = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '667px', label: 'Mobile' },
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
    <div className="flex flex-col flex-grow animate-fade-in min-h-0 h-full">
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
         <div className="flex flex-col flex-grow p-4 min-h-0 h-full">
              <div className="flex justify-center items-center mb-4 p-1.5 bg-gray-800 rounded-lg space-x-1">
                {(Object.keys(devices) as Device[]).map(device => (
                  <button key={device} onClick={() => setSelectedDevice(device)} className={`p-2 rounded-md transition-colors ${selectedDevice === device ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`} title={devices[device].label}>
                    {device === 'desktop' && <DesktopIcon />}
                    {device === 'tablet' && <TabletIcon />}
                    {device === 'mobile' && <MobileIcon />}
                  </button>
                ))}
              </div>
              <div className={`flex-grow grid overflow-auto bg-dots h-full ${selectedDevice !== 'desktop' ? 'place-items-center' : ''}`}>
                <div className={`shadow-2xl transition-all duration-300 ease-in-out ${selectedDevice !== 'desktop' ? 'rounded-xl' : 'w-full h-full'}`} style={selectedDevice !== 'desktop' ? { width: devices[selectedDevice].width, height: devices[selectedDevice].height, maxWidth: '100%', maxHeight: '100%' } : {}}>
                  <iframe
                    ref={iframeRef}
                    srcDoc={createPreviewHtml()}
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-full bg-white block"
                    style={{ borderRadius: selectedDevice !== 'desktop' ? '1rem' : '0', width: '100%', height: '100%', display: 'block' }}
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
   )
}


// --- Main Wizard Application ---
const WizardApp = ({ user, onLogout, onSwitchToProfile }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatedTsx, setGeneratedTsx] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const saveWireframeMutation = useSaveWireframe();
  
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

      // Attempt to save via API
      try {
        await saveWireframeMutation.mutateAsync({
          title: `Wireframe ${new Date().toLocaleString()}`,
          code: tsx,
          language: 'typescript',
          thumbnail: imageUrl,
        });
      } catch (saveErr) {
        const saveMessage = saveErr instanceof Error ? saveErr.message : "Unknown error";
        setError(`Failed to save wireframe: ${saveMessage}`);
      }

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
                <button onClick={onSwitchToProfile} className="flex items-center space-x-2 hover:bg-gray-800 px-2 py-1.5 rounded-md transition-colors">
                  <img src={user.profilePic ? user.profilePic : 'https://ui-avatars.com/api/?name=' + user.username} alt="Profile" className="w-8 h-8 rounded-full" />
                  <span className="text-sm text-gray-400 truncate max-w-[150px]">{user.username}</span>
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
  const { data: snippets = [], isLoading, isError, error } = useGetSnippets();
  const [selectedWireframe, setSelectedWireframe] = useState(null);
  const [wireframeToDelete, setWireframeToDelete] = useState<string | null>(null);

  // Local copy of snippets so we can update UI optimistically when deleting
  const [wireframes, setWireframes] = useState<any[]>(snippets);
  useEffect(() => { setWireframes(snippets); }, [snippets]);

  const handleDelete = (e: React.MouseEvent, wireframeId: string) => {
    e.stopPropagation(); // Prevent card click from firing
    setWireframeToDelete(wireframeId);
  };

  const confirmDelete = () => {
    if (!wireframeToDelete) return;

    // Optimistically update UI
    const updated = (wireframes || []).filter(w => (w._id || w.id) !== wireframeToDelete);
    setWireframes(updated);

    // Also remove from localStorage history if present (support both id/_id keys)
    try {
      const history = JSON.parse(localStorage.getItem('wireframe-wizard-history') || '{}');
      if (history[user.email]) {
        history[user.email] = (history[user.email] || []).filter((w: any) => (w.id || w._id) !== wireframeToDelete);
        localStorage.setItem('wireframe-wizard-history', JSON.stringify(history));
      }
    } catch (err) {
      // ignore localStorage errors
    }

    // Close modal
    setWireframeToDelete(null);
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
                            <button onClick={onLogout} className="px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8 flex-grow flex flex-col min-h-0">
                {isLoading ? (
                    <Loader />
                ) : isError ? (
                    <div className="text-center my-auto">
                        <h2 className="text-2xl font-semibold text-red-400">Failed to load snippets</h2>
                        <p className="text-gray-500 mt-2">{(error as Error)?.message || 'An error occurred while fetching your snippets.'}</p>
                    </div>
        ) : selectedWireframe ? (
          <div className="flex flex-col flex-1 min-h-0">
                        <div className="mb-6 flex items-center justify-between">
                             <div>
                                <h2 className="text-xl font-bold text-white">Viewing Wireframe</h2>
                                <p className="text-sm text-gray-400">Created on {new Date(selectedWireframe.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedWireframe(null)} className="px-4 py-2 bg-gray-800 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 transition-colors">
                                &larr; Back to Gallery
                            </button>
                        </div>
                        <ResultViewer generatedTsx={selectedWireframe.code} />
                    </div>
                ) : snippets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {(wireframes || []).map((snippet) => (
                      <div key={snippet._id || snippet.id} onClick={() => setSelectedWireframe(snippet)} className="group relative aspect-square bg-gray-900 border border-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1">
                        <img src={snippet.thumbnail || 'https://via.placeholder.com/600x600?text=No+Thumbnail'} alt="Wireframe sketch" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                        {/* Delete button (appears on hover) */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button onClick={(e) => handleDelete(e, snippet._id || snippet.id)} className="p-2 bg-red-600/80 hover:bg-red-500 rounded-full text-white shadow-lg transition-colors" aria-label="Delete wireframe">
                            <TrashIcon />
                          </button>
                        </div>

                        <div className="absolute bottom-0 left-0 p-4">
                          <p className="text-sm font-medium text-white">Created:</p>
                          <p className="text-xs text-gray-400">{new Date(snippet.createdAt).toLocaleDateString()}</p>
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
                    if (parsedUser.token) {
                        setAuthToken(parsedUser.token);
                    }
                    setView('app');
                }
            } catch (e) {
                // Malformed user data, clear it
                localStorage.removeItem('wireframe-wizard-user');
            }
        }
    }, []);

    const handleAuthSuccess = () => {
        const loggedInUser = localStorage.getItem('wireframe-wizard-user');
        if (!loggedInUser) return;
        try {
            const parsedUser = JSON.parse(loggedInUser);
            if (parsedUser && parsedUser.email) {
                setUser(parsedUser);
                if (parsedUser.token) {
                    setAuthToken(parsedUser.token);
                }
                setView('app');
            }
        } catch {
            // ignore
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('wireframe-wizard-user');
        setAuthToken();
        setUser(null);
        setView('login');
    };
    
    const renderView = () => {
        if (!user) {
             switch (view) {
                case 'signup':
                    return <SignupPage onSignup={handleAuthSuccess} onSwitchToLogin={() => setView('login')} />;
                case 'login':
                default:
                    return <LoginPage onLogin={handleAuthSuccess} onSwitchToSignup={() => setView('signup')} />;
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