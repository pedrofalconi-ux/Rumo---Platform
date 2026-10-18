import type { Metadata } from "next";
import RumoToastProvider from "../components/rumo-toast-provider";
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@300..600,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-surface text-on-surface">
        <RumoToastProvider>{children}</RumoToastProvider>
      </body>
    </html>
  );
}
