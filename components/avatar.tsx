import Image from "next/image";

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs((hash * 137.508) % 360);
  return `hsl(${hue}, 65%, 55%)`;
}

interface AvatarProps {
  displayName: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ displayName, avatarUrl, size = 40, className = "" }: AvatarProps) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={displayName}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        loading="eager"
      />
    );
  }

  const bg = hashColor(displayName);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white select-none flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
      aria-label={displayName}
    >
      {initial}
    </div>
  );
}
