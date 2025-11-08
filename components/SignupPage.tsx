import { useState } from "react";
import AuthFormContainer from "./AuthFormContainer";
import { LockIcon, UserIcon } from "./Icons";
import { useSignup } from "@/services/authHooks";

const SignupPage = ({ onSignup, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const { mutate: signup, isPending } = useSignup();
    
    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        signup({ email: email, password: password, username: username }, {
            onSuccess: () => {
                onSignup();
            },
            onError: (error) => {
                setError(error.message);
            },
        });
    };
    
    return (
        <AuthFormContainer title="Create your account.">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon /></div>
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon /></div>
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
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

export default SignupPage;