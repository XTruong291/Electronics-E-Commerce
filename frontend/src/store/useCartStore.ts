import { create } from "zustand";
import { persist } from "zustand/middleware";
import { message } from "antd";
import type { Product } from "../types/catalog";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  syncAfterLogin: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product, quantity: number = 1) => {
        const { items } = get();
        const existingIndex = items.findIndex((i) => i.product.id === product.id);

        if (existingIndex > -1) {
          const currentQty = items[existingIndex].quantity;
          const newQty = Math.min(currentQty + quantity, product.stock);

          if (currentQty >= product.stock) {
            message.warning(
              `Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho.`
            );
            return;
          }

          const updated = [...items];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newQty,
          };
          set({ items: updated });
          message.success(`Đã cập nhật số lượng "${product.name}" trong giỏ.`);
        } else {
          if (product.stock <= 0) {
            message.warning(`Sản phẩm "${product.name}" hiện đã hết hàng.`);
            return;
          }
          const addQty = Math.min(quantity, product.stock);
          set({ items: [...items, { product, quantity: addQty }] });
          message.success(`Đã thêm "${product.name}" vào giỏ hàng.`);
        }
      },

      removeItem: (productId: number) => {
        const { items } = get();
        const filtered = items.filter((i) => i.product.id !== productId);
        set({ items: filtered });
        message.info("Đã xóa sản phẩm khỏi giỏ hàng.");
      },

      updateQuantity: (productId: number, quantity: number) => {
        const { items } = get();
        const target = items.find((i) => i.product.id === productId);
        if (!target) return;

        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const validQty = Math.min(quantity, target.product.stock);
        if (quantity > target.product.stock) {
          message.warning(
            `Chỉ còn ${target.product.stock} sản phẩm trong kho.`
          );
        }

        const updated = items.map((i) =>
          i.product.id === productId ? { ...i, quantity: validQty } : i
        );
        set({ items: updated });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((sum, item) => {
          const effectivePrice =
            item.product.sale_price !== null &&
            item.product.sale_price !== undefined &&
            item.product.sale_price > 0
              ? item.product.sale_price
              : item.product.price;
          return sum + effectivePrice * item.quantity;
        }, 0);
      },

      syncAfterLogin: async () => {
        // Stub for server-side cart merge if needed
      },
    }),
    {
      name: "ecom-cart-storage",
    }
  )
);
