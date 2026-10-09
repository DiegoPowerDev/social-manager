import { BarChart, Calendar, LucideIcon, Send, Settings } from "lucide-react";
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
    href: "/instagram",
    icon: "",
    image: (
      <Image
        height={20}
        width={20}
        src="./instagram-icon.svg"
        alt="Instagram logo"
      />
    ),
  },
  {
    title: "Facebook",
    href: "/facebook",
    icon: "",
    image: (
      <Image
        height={20}
        width={20}
        src="./facebook-icon.svg"
        alt="facebook logo"
      />
    ),
  },
  {
    title: "LinkedIn",
    href: "/linkedin",
    icon: "",
    image: (
      <Image
        className="bg-white rounded"
        height={20}
        width={20}
        src="./linkedin.svg"
        alt="Linkedin logo"
      />
    ),
  },
  {
    title: "Publicar en masa",
    href: "/publish",
    icon: Send,
  },
  { title: "Calendario", href: "/calendar", icon: Calendar },
  { title: "Configuración", href: "/settings", icon: Settings },
];
