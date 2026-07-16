import type { Metadata } from "next";
import RumoToastProvider from "../components/rumo-toast-provider";
import ScrollRevealObserver from "../components/scroll-reveal-observer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rumo Platform - Dashboard de Viagens",
  description: "Gerencie e acompanhe todos os itinerários ativos da sua agência.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-surface text-on-surface">
        <ScrollRevealObserver />
        <RumoToastProvider>{children}</RumoToastProvider>
      </body>
    </html>
  );
}
