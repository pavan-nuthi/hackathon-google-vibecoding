import { useMutation, useQuery } from '@tanstack/react-query';
import {
	login,
	signup,
	type LoginRequest,
	type SignupRequest,
	type AuthResponse,
} from './authService';
import { setAuthToken, apiClient } from './apiClient';

export function useLogin() {
	return useMutation<AuthResponse, unknown, LoginRequest>({
		mutationKey: ['auth', 'login'],
		mutationFn: (payload: LoginRequest) => login(payload),
		onSuccess: (data) => {
			localStorage.setItem('wireframe-wizard-user', JSON.stringify(data));
			setAuthToken(data.token);
		},
	});
}

export function useSignup() {
	return useMutation<AuthResponse, unknown, SignupRequest>({
		mutationKey: ['auth', 'signup'],
		mutationFn: (payload: SignupRequest) => signup(payload),
		onSuccess: (data) => {
			localStorage.setItem('wireframe-wizard-user', JSON.stringify(data));
			setAuthToken(data.token);
		},
	});
}

export interface SaveWireframeRequest {
	title: string;
	code: string;
	language?: string; // defaults to 'typescript' if not provided
	thumbnail: string;
}

export interface SnippetResponse {
	_id: string;
	user: string;
	title: string;
	code: string;
	language: string;
	thumbnail?: string;
	createdAt: string;
	updatedAt: string;
}

export function useSaveWireframe() {
	return useMutation<SnippetResponse, unknown, SaveWireframeRequest>({
		mutationKey: ['snippets', 'create'],
		mutationFn: async (payload: SaveWireframeRequest) => {
			const body = {
				title: payload.title,
				code: payload.code,
				language: payload.language ?? 'typescript',
                thumbnail: payload.thumbnail,
			};
			const { data } = await apiClient.post<SnippetResponse>('/snippets', body);
			return data;
		},
	});
}

export function useGetSnippets() {
	return useQuery<SnippetResponse[], unknown>({
		queryKey: ['snippets'],
		queryFn: async () => {
			const { data } = await apiClient.get<SnippetResponse[]>('/snippets');
			return data;
		},
	});
}

