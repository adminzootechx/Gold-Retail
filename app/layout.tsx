import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "./lib/store";
import Frame from "./components/Frame";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AKOIRAH ERP",
  description: "Lab-grown diamond jewellery ERP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${schibsted.variable}`}>
      <body>
        <StoreProvider>
          <Frame>{children}</Frame>
        </StoreProvider>
      </body>
    </html>
  );
}
