import { create } from "zustand";
import { User } from "firebase/auth";
import { AppUser, UserRole } from "@/types";

interface AuthState {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setAppUser: (appUser: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  appUser: null,
  loading: true,

  setUser: (user) => set({ user }),
  setAppUser: (appUser) => set({ appUser }),
  setLoading: (loading) => set({ loading }),

  logout: () => set({ user: null, appUser: null }),

  hasPermission: (allowedRoles) => {
    const { appUser } = get();
    if (!appUser) return false;
    return allowedRoles.includes(appUser.role);
  },
}));
