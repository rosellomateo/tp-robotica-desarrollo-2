import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unitree Control Center",
  description: "Dashboard de telemetría en tiempo real para robots Unitree",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
