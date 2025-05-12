// frontend-refactored/src/types/auth.ts
export interface User {
  id: string;
  username: string;
  role: string;
  created_at: string;
  status: string;
  is_first_login: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  role: string;
  is_first_login: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface CreateUserRequest {
  username: string;
  role?: string;
}

export interface CreateUserResponse extends User {
  initial_password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  new_password: string;
}

export interface UserListResponse {
  total: number;
  items: User[];
}
