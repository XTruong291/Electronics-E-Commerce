import { create } from "zustand";

interface CartState {
  items: unknown[];
  syncAfterLogin: () => Promise<void>;
}

export const useCartStore = create<CartState>(() => ({
  items: [],
  syncAfterLogin: async () => {
    // TODO: Phase 2+ (Module 1 & 2): Implement cart synchronization/merge POST /cart/merge after successful login/SSO
  },
}));
