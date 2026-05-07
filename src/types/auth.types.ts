// User roles enum
export enum UserRole {
  SUPER_USER = 'super_user',
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  INVENTORY_STAFF = 'inventory_staff',
}

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  company: number | null;
  company_name?: string | null;
  branch: number | null;
  branch_name?: string | null;
  phone?: string;
  is_active: boolean;
}

// Login credentials
export interface LoginCredentials {
  username: string;
  password: string;
}

// Auth response
export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// Token payload (decoded JWT)
export interface TokenPayload {
  user_id: number;
  username: string;
  role: UserRole;
  company: number | null;
  exp: number;
  iat: number;
}
