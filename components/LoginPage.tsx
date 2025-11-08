import { useState } from 'react';
import AuthFormContainer from '../components/AuthFormContainer';
import { UserIcon, LockIcon } from '../components/Icons';
import { useLogin } from '@/services/authHooks';

const LoginPage = ({ onLogin, onSwitchToSignup }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const { mutate: login, isPending } = useLogin();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        login({ emailOrUsername: email, password }, {
            onSuccess: () => {
                onLogin();
            },
            onError: (error) => {
                setError(error.message);
            },
        });
    };

    return (
        <AuthFormContainer title="Welcome back, please log in.">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon /></div>
                    <input type="text" placeholder="Email Address or Username" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
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
                {isPending && <p className="text-center text-sm text-gray-500">Loading...</p>}
            </form>
        </AuthFormContainer>
    );
};

export default LoginPage;