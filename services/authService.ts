import { apiClient } from './apiClient';

export interface LoginRequest {
	emailOrUsername: string;
	password: string;
}

export interface SignupRequest {
	email: string;
	password: string;
	username: string;
}

export interface AuthResponse {
	_id: string;
	username: string;
	email: string;
	profilePic: string;
	token: string;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
	const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
	return data;
}

export async function signup(payload: SignupRequest): Promise<AuthResponse> {
	const { data } = await apiClient.post<AuthResponse>('/auth/signup', payload);
	return data;
}

