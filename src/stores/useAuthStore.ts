import { create } from "zustand";
import { User } from "firebase/auth";
import { AppUser, MemberRole, UserRole } from "@/types";

interface AuthState {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;

  companyId: string | null;
  companyName: string | null;
  companyLogo: string | null;
  memberRole: MemberRole | null;

  // IA / plan (se rellenan al cargar company)
  plan: string | null;
  aiEnabled: boolean;
  aiCaptionsLimit: number;
  aiImagesLimit: number;

  setUser: (user: User | null) => void;
  setAppUser: (appUser: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  setTenant: (data: {
    companyId: string | null;
    companyName: string | null;
    companyLogo: string | null;
    memberRole: MemberRole | null;
    plan?: string | null;
    aiEnabled?: boolean;
    aiCaptionsLimit?: number;
    aiImagesLimit?: number;
  }) => void;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
  canEdit: () => boolean;
  canAdmin: () => boolean;
}

const emptyTenant = {
  companyId: null as string | null,
  companyName: null as string | null,
  companyLogo: null as string | null,
  memberRole: null as MemberRole | null,
  plan: null as string | null,
  aiEnabled: false,
  aiCaptionsLimit: 0,
  aiImagesLimit: 0,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  appUser: null,
  loading: true,
  ...emptyTenant,

  setUser: (user) => set({ user }),
  setAppUser: (appUser) => set({ appUser }),
  setLoading: (loading) => set({ loading }),

  logout: () =>
    set({
      user: null,
      appUser: null,
      ...emptyTenant,
    }),

  setTenant: (data) =>
    set({
      companyId: data.companyId,
      companyName: data.companyName,
      companyLogo: data.companyLogo,
      memberRole: data.memberRole,
      plan: data.plan ?? null,
      aiEnabled: data.aiEnabled ?? false,
      aiCaptionsLimit: data.aiCaptionsLimit ?? 0,
      aiImagesLimit: data.aiImagesLimit ?? 0,
    }),

  hasPermission: (allowedRoles) => {
    const { appUser } = get();
    if (!appUser) return false;
    return allowedRoles.includes(appUser.role);
  },

  canEdit: () => {
    const role = get().memberRole;
    return role === "admin" || role === "editor";
  },

  canAdmin: () => get().memberRole === "admin",
}));
