import type { Metadata, Viewport } from "next";
import { Montserrat, Raleway, Roboto } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

const raleway = Raleway({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-raleway",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://faaurelle.com"),
  title: {
    default: brand.seo.title,
    template: `%s | ${brand.displayName}`,
  },
  description: brand.seo.description,
  openGraph: {
    title: brand.seo.title,
    description: brand.seo.description,
    siteName: brand.displayName,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${raleway.variable} ${montserrat.variable}`}>
        <div className="site-stage">{children}</div>
      </body>
    </html>
  );
}
