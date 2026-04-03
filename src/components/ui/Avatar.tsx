import Image from "next/image";
import { User } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-8 h-8", text: "text-xs", icon: 14 },
  md: { container: "w-10 h-10", text: "text-sm", icon: 18 },
  lg: { container: "w-14 h-14", text: "text-lg", icon: 24 },
  xl: { container: "w-20 h-20", text: "text-2xl", icon: 32 },
};

export default function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: AvatarProps) {
  const { container, text, icon } = sizeMap[size];
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <div
        className={`${container} rounded-full overflow-hidden border-2 border-border ${className}`}
      >
        <Image
          src={src}
          alt={name}
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${container} rounded-full bg-secondary/20 border-2 border-secondary/30 flex items-center justify-center ${className}`}
    >
      {name ? (
        <span className={`${text} font-bold text-primary`}>{initials}</span>
      ) : (
        <User size={icon} className="text-primary/60" />
      )}
    </div>
  );
}
