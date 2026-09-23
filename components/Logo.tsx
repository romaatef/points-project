import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  size = 56,
  className,
  src = "/logo.png",
}: {
  size?: number;
  className?: string;
  src?: string;
}) {
  return (
    <Image
      src={src}
      alt="شعار مسابقة الانطوني"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
