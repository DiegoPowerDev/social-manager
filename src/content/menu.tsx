import {
  BarChart,
  Calendar,
  ImageIcon,
  LucideIcon,
  Send,
  Settings,
  Users,
} from "lucide-react";
import Image from "next/image";
import { ReactElement } from "react";

interface Menu {
  title: string;
  href: string;
  icon: LucideIcon | "";
  image?: ReactElement;
}

export const mainNav: Menu[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart,
  },
  {
    title: "Instagram",
    href: "/dashboard/instagram",
    icon: "",
    image: (
      <Image
        height={20}
        width={20}
        src="/instagram-icon.svg"
        alt="Instagram logo"
      />
    ),
  },
  {
    title: "Facebook",
    href: "/dashboard/facebook",
    icon: "",
    image: (
      <Image
        height={20}
        width={20}
        src="/facebook-icon.svg"
        alt="facebook logo"
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
        alt="Linkedin logo"
      />
    ),
  },
  {
    title: "youtube",
    href: "/dashboard/youtube ",
    icon: "",
    image: (
      <Image
        className="bg-white rounded"
        height={20}
        width={20}
        src="/youtube.svg"
        alt="Youtube logo"
      />
    ),
  },
  {
    title: "tiktok",
    href: "/dashboard/tiktok ",
    icon: "",
    image: (
      <Image
        className=" rounded"
        height={20}
        width={20}
        src="/tiktok.svg"
        alt="Tik Tok logo"
      />
    ),
  },
  {
    title: "Publicar en masa",
    href: "/dashboard/publish",
    icon: Send,
  },
  { title: "Calendario", href: "/dashboard/calendar", icon: Calendar },
  { title: "Configuración", href: "/dashboard/settings", icon: Settings },
];

export const secondaryNav = [
  {
    title: "Media Library",
    href: "/dashboard/media",
    icon: ImageIcon,
  },
  {
    title: "Equipo",
    href: "/dashboard/team",
    icon: Users,
  },
];
