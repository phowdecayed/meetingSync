import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { type User, createUser, verifyUserCredentials, updateAuthUser } from '@/lib/data';

// A custom storage implementation that safely handles server-side rendering.
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (error) {
      // On the server, localStorage is not available.
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      // On the server, localStorage is not available.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      // On the server, localStorage is not available.
    }
  },
};

type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password_unused: string) => Promise<void>;
  register: (name: string, email: string, password_unused: string) => Promise<void>;
  updateUser: (data: { name: string }) => Promise<void>;
  logout: () => void;
  _setLoading: (isLoading: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      isLoading: true, // Start with loading true to check persistence
      _setLoading: (isLoading) => set({ isLoading }),
      login: async (email, password) => {
        const user = await verifyUserCredentials(email, password);
        if (!user) {
          throw new Error('Invalid email or password.');
        }
        set({ isAuthenticated: true, user });
      },
      register: async (name, email, password) => {
        try {
            const newUser = await createUser({ name, email, role: 'member' });
            set({ isAuthenticated: true, user: newUser });
        } catch (error) {
            throw error;
        }
      },
      updateUser: async (data: { name: string }) => {
        const currentUser = get().user;
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        
        const updatedUser = await updateAuthUser(currentUser.id, { name: data.name });
        
        set({ user: updatedUser });
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => safeLocalStorage), // (optional) by default, 'localStorage' is used
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._setLoading(false);
        }
      },
    }
  )
);

// Initialize loading state on first load
useAuthStore.getState()._setLoading(false);
