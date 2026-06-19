import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      cart: {}, // { [productId]: { id, name, price, unit, qty } }

      addItem: (product) => set((state) => {
        const existing = state.cart[product.id];
        return { cart: { ...state.cart, [product.id]: { ...product, qty: (existing?.qty || 0) + 1 } } };
      }),

      removeItem: (productId) => set((state) => {
        const existing = state.cart[productId];
        if (!existing || existing.qty <= 1) {
          const newCart = { ...state.cart };
          delete newCart[productId];
          return { cart: newCart };
        }
        return { cart: { ...state.cart, [productId]: { ...existing, qty: existing.qty - 1 } } };
      }),

      getQty: (productId) => get().cart[productId]?.qty || 0,

      getCartItems: () => Object.values(get().cart).filter((i) => i.qty > 0),

      getCartTotal: () => Object.values(get().cart).reduce((sum, i) => sum + i.qty * i.price, 0),

      getCartCount: () => Object.values(get().cart).reduce((sum, i) => sum + i.qty, 0),

      clearCart: () => set({ cart: {} }),
    }),
    { name: 'jdm-customer-cart' }
  )
);
