import { create } from "zustand";
import type { User, AuthResponse } from "../types/auth";
import axiosClient from "../api/axiosClient";
import { useCartStore } from "./useCartStore";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isHydrated: false,

  login: (user: User, accessToken: string) => {
    set({ user, accessToken, isLoading: false });
    // Call cart synchronization stub after login
    useCartStore.getState().syncAfterLogin().catch(() => {});
  },

  setAccessToken: (accessToken: string) => {
    set({ accessToken });
  },

  setUser: (user: User) => {
    set({ user });
  },

  logout: async () => {
    try {
      await axiosClient.post("/auth/logout");
    } catch {
      // Ignore network errors on logout
    } finally {
      set({ user: null, accessToken: null, isLoading: false });
    }
  },

  hydrate: async () => {
    if (get().isHydrated) return;
    set({ isLoading: true });
    try {
      // Call silent refresh via HttpOnly cookie
      const data = (await axiosClient.post("/auth/refresh")) as unknown as AuthResponse;
      if (data && data.access_token && data.user) {
        set({
          user: data.user,
          accessToken: data.access_token,
          isHydrated: true,
          isLoading: false,
        });
        useCartStore.getState().syncAfterLogin().catch(() => {});
        return;
      }
    } catch {
      // User is not logged in or cookie expired
    }
    set({ user: null, accessToken: null, isHydrated: true, isLoading: false });
  },
}));
