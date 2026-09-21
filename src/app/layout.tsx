import type { Metadata, Viewport } from "next";
import { Raleway, Roboto } from "next/font/google";
import Script from "next/script";
import { brand } from "@/config/brand";
import "./globals.css";

const META_PIXEL_ID = "2169167907337885";
const GOOGLE_TAG_ID = "G-2PWGFQG1SB";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.faaurelle.com"),
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
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <html lang="en">
      <body className={`${roboto.variable} ${raleway.variable}`}>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_TAG_ID}');`}
        </Script>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');`}
        </Script>
        <link
          rel="preload"
          href={`${basePath}/models/hero/fa-aurelle-new-bottle-runtime-v11.glb`}
          as="fetch"
          type="model/gltf-binary"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={`${basePath}/environments/hero/fa-aurelle-serum-studio-v1.hdr`}
          as="fetch"
          type="image/vnd.radiance"
          crossOrigin="anonymous"
        />
        <noscript>
          {/* Meta Pixel requires a literal tracking pixel when JavaScript is disabled. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        <div className="site-stage">{children}</div>
      </body>
    </html>
  );
}
