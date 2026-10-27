export type UserRole = "CUSTOMER" | "STAFF" | "ADMIN";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Address {
  id: number;
  user_id: number;
  recipient: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  is_default: boolean;
  created_at: string;
}

export interface AddressCreatePayload {
  recipient: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  is_default?: boolean;
}

export interface AddressUpdatePayload {
  recipient?: string;
  phone?: string;
  province?: string;
  district?: string;
  ward?: string;
  detail?: string;
  is_default?: boolean;
}
