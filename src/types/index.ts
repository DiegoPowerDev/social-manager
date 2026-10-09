export type UserRole = "admin" | "editor" | "viewer";

export type Platform = "instagram" | "facebook" | "linkedin" | "youtube";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface SocialAccount {
  id: string;
  platform: Platform;
  name: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  connectedBy: string;
  connectedAt: Date;
}

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  filename: string;
  size: number;
  uploadedBy: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  platform: Platform;
  content: string;
  mediaIds: string[];
  status: "published" | "failed";
  publishedAt: Date;
  publishedBy: string;
  platformPostId?: string;
  error?: string;
  createdAt: Date;
}

export interface PlatformCredentials {
  platform: Platform;
  appId: string;
  appSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishedPost {
  id: string;
  platform: "facebook";
  pageId: string;
  pageName: string;
  message?: string;
  imageUrl?: string;
  videoUrl?: string;
  link?: string;
  facebookPostId?: string;
  publishedAt: Date;
  status: "published" | "failed";
}
export type MemberRole = "admin" | "editor" | "viewer";

export interface Company {
  id: string;
  name: string;
  createdAt: Date;
  logoUrl: string | null;
  createdBy: string;
  plan: "free" | "monthly" | "yearly";
  planStatus: "active" | "past_due" | "canceled" | "trialing";
}

export interface Membership {
  id: string;
  uid: string;
  companyId: string;
  role: MemberRole;
  createdAt: Date;
}
