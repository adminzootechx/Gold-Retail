import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "./lib/store";
import Frame from "./components/Frame";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AKOIRAH ERP",
  description: "Lab-grown diamond jewellery ERP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>
        <StoreProvider>
          <Frame>{children}</Frame>
        </StoreProvider>
      </body>
    </html>
  );
}
