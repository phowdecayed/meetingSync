import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { users, type User, createUser } from '@/lib/data'; // Mock user data

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
        // The createUser function handles the existence check now
        try {
            const newUser = await createUser({ name, email, role: 'member' });
            // In a real app, you would also handle the password here.
            // After creating the user, we log them in.
            set({ isAuthenticated: true, user: newUser });
        } catch (error) {
            // Re-throw the error to be caught by the form handler
            throw error;
        }
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
