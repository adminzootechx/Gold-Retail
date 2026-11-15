import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "./lib/store";
import Frame from "./components/Frame";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AKOIRAH ERP",
  description: "Lab-grown diamond jewellery ERP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <StoreProvider>
          <Frame>{children}</Frame>
        </StoreProvider>
      </body>
    </html>
  );
}
