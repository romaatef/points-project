import { Cairo } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-cairo",
});

export const metadata = {
  title: "مسابقة الانطوني",
  description: "مسابقة الانطوني",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${cairo.className} antialiased`}>
        {children}
        <Toaster
          position="top-center"
          dir="rtl"
          richColors
          toastOptions={{ style: { fontFamily: "Cairo, sans-serif" } }}
        />
      </body>
    </html>
  );
}
