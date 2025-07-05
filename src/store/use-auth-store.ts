import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { users, type User } from '@/lib/data'; // Mock user data

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
        const user = users.find((u) => u.email === email);
        if (!user) {
          throw new Error('User not found.');
        }
        // In a real app, you would verify the password here.
        set({ isAuthenticated: true, user });
      },
      register: async (name, email, password) => {
        if (users.some((u) => u.email === email)) {
          throw new Error('An account with this email already exists.');
        }
        const newUser: User = { id: `user-${Date.now()}`, name, email, role: 'member' };
        // In a real app, you would save the new user to the database.
        // For this simulation, we're not adding to the mock `users` array
        // as it's not persistent across reloads without a backend.
        // We'll just log them in.
        set({ isAuthenticated: true, user: newUser });
      },
      updateUser: async (data: { name: string }) => {
        const currentUser = get().user;
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // simulate API call
        
        const updatedUser = { ...currentUser, name: data.name };
        
        // This is for demonstration purposes to keep the mock array in sync.
        // It won't persist across hard reloads, but will persist in the session.
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].name = data.name;
        }

        set({ user: updatedUser });
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
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
