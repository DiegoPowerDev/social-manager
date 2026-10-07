import { BarChart, Send } from "lucide-react";
import Image from "next/image";

export const mainNav = [
  {
    title: "Dashboard",
    href: "/",
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
      <Image height={20} width={20} src="./linkedin.svg" alt="Linkedin logo" />
    ),
  },
  {
    title: "YouTube",
    href: "/youtube",
    icon: "",
    image: (
      <Image height={20} width={20} src="./youtube.svg" alt="Youtube logo" />
    ),
  },
  {
    title: "Publicar en masa",
    href: "/publish",
    icon: Send, // o Layers, Share2, etc.
  },
  {
    title: "LinkedIn",
    href: "/linkedin",
    icon: "",
    image: (
      <Image height={20} width={20} src="./linkedin.svg" alt="LinkedIn logo" />
    ),
  },
];
