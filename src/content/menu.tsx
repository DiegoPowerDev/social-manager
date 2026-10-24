import {
  BarChart,
  Calendar,
  CreditCard,
  ImageIcon,
  LucideIcon,
  Send,
  Settings,
  ShieldCheckIcon,
  Users,
} from "lucide-react";
import Image from "next/image";
import { ReactElement } from "react";

export type { PlanId, MemberRole } from "@/content/access";
export { canAccessSection, planAtLeast } from "@/content/access";
// si planAtLeast lo dejas en access, o en menu:

export interface Menu {
  title: string;
  href: string;
  icon: LucideIcon | "";
  image?: ReactElement;
}

export const mainNav: Menu[] = [
  { title: "Dashboard", href: "/dashboard", icon: BarChart },
  {
    title: "Instagram",
    href: "/dashboard/instagram",
    icon: "",
    image: (
      <Image height={20} width={20} src="/instagram-icon.svg" alt="Instagram" />
    ),
  },
  {
    title: "Facebook",
    href: "/dashboard/facebook",
    icon: "",
    image: (
      <Image height={20} width={20} src="/facebook-icon.svg" alt="Facebook" />
    ),
  },
  {
    title: "YouTube",
    href: "/dashboard/youtube",
    icon: "",
    image: (
      <Image
        className="bg-white rounded"
        height={20}
        width={20}
        src="/youtube.svg"
        alt="YouTube"
      />
    ),
  },
  {
    title: "LinkedIn",
    href: "/dashboard/linkedin",
    icon: "",
    image: (
      <Image
        className="bg-white rounded"
        height={20}
        width={20}
        src="/linkedin.svg"
        alt="LinkedIn"
      />
    ),
  },
  {
    title: "TikTok",
    href: "/dashboard/tiktok",
    icon: "",
    image: (
      <Image
        height={20}
        width={20}
        src="/tiktok.svg"
        alt="TikTok"
        className="rounded"
      />
    ),
  },
  { title: "Publicar en masa", href: "/dashboard/publish", icon: Send },
  { title: "Calendario", href: "/dashboard/calendar", icon: Calendar },
  { title: "Configuración", href: "/dashboard/settings", icon: Settings },
];

export const secondaryNav: Menu[] = [
  { title: "Media Library", href: "/dashboard/media", icon: ImageIcon },
  { title: "Equipo", href: "/dashboard/team", icon: Users },
  { title: "Membresía", href: "/dashboard/membresia", icon: CreditCard },
];

export const adminOption: Menu[] = [
  { title: "Admin Panel", href: "/dashboard/admin", icon: ShieldCheckIcon },
];
