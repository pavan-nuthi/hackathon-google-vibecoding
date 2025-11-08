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

export default AuthFormContainer;