import { Suspense } from "react";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="p-10 text-center">جاري التحميل...</div>}>
      {children}
    </Suspense>
  );
}
