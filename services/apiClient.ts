import axios from 'axios';

const baseURL = 'http://localhost:5000/api';

export const apiClient = axios.create({
	baseURL,
	headers: {
		'Content-Type': 'application/json',
	},
	withCredentials: true,
});

export function setAuthToken(token?: string) {
	if (token) {
		apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
	} else {
		delete apiClient.defaults.headers.common['Authorization'];
	}
}

// Initialize Authorization header from localStorage if available
try {
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem('wireframe-wizard-user');
		if (stored) {
			const parsed = JSON.parse(stored);
			if (parsed && parsed.token) {
				setAuthToken(parsed.token);
			}
		}
	}
} catch {
	// ignore
}

// Ensure latest token from localStorage is attached on each request
apiClient.interceptors.request.use((config) => {
	try {
		const stored = localStorage.getItem('wireframe-wizard-user');
		if (stored) {
			const parsed = JSON.parse(stored);
			if (parsed && parsed.token) {
				if (!config.headers) {
					config.headers = {} as any;
				}
				(config.headers as any)['Authorization'] = `Bearer ${parsed.token}`;
			}
		}
	} catch {
		// ignore
	}
	return config;
});


