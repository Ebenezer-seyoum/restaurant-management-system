// @ts-nocheck
import "./globals.css";
import { getPublicContent } from "@/lib/cms";
import { absoluteUrl, commaList, enabledSeoLinks, normalizeSiteUrl } from "@/lib/seo";

export async function generateMetadata() {
  const content = await getPublicContent();
  const seo = content.seo || {};
  const siteUrl = normalizeSiteUrl(seo.siteUrl);
  const title = seo.tabTitle || seo.title || content.brand?.name || "EMRAKEL";
  const description = seo.description || content.home?.description || "";
  const image = absoluteUrl(seo.image || "/logo.png", siteUrl);
  const favicon = seo.favicon || seo.logo || seo.image || "/logo.png";
  const appleIcon = seo.appleIcon || seo.favicon || seo.logo || seo.image || "/logo.png";
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords: seo.keywords || undefined,
    alternates: {
      canonical: siteUrl
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: content.brand?.name || "EMRAKEL",
      images: [{ url: image, alt: title }],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    },
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: appleIcon
    }
  };
}

export default async function RootLayout({ children }) {
  const content = await getPublicContent();
  const seo = content.seo || {};
  const siteUrl = normalizeSiteUrl(seo.siteUrl);
  const enabledSitelinks = enabledSeoLinks(seo);
  const title = seo.title || content.brand?.name || "EMRAKEL";
  const description = seo.schemaDescription || seo.description || content.home?.description || "";
  const logo = absoluteUrl(seo.logo || seo.image || content.brand?.logoImage || "/logo.png", siteUrl);
  const image = absoluteUrl(seo.image || seo.logo || content.brand?.logoImage || "/logo.png", siteUrl);
  const cuisine = commaList(seo.cuisine);
  const sameAs = commaList(seo.sameAs);
  const siteNavigation = enabledSitelinks.map((link, index) => ({
    "@type": "SiteNavigationElement",
    position: index + 1,
    name: link.label,
    description: link.description,
    url: absoluteUrl(link.url, siteUrl)
  }));
  const websiteData = {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: title,
    url: siteUrl
  };

  if (seo.searchActionEnabled === true) {
    websiteData.potentialAction = {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    };
  }

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": seo.schemaType || "Restaurant",
          "@id": `${siteUrl}/#restaurant`,
          name: seo.schemaName || content.brand?.name || "EMRAKEL",
          description,
          url: siteUrl,
          logo,
          image,
          telephone: content.brand?.phone,
          email: content.brand?.email,
          address: content.brand?.address,
          hasMenu: absoluteUrl(seo.menuUrl || "/menu", siteUrl),
          servesCuisine: cuisine.length ? cuisine : undefined,
          priceRange: seo.priceRange || undefined,
          openingHours: content.brand?.hours,
          sameAs: sameAs.length ? sameAs : undefined
        },
        {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
          name: seo.schemaName || content.brand?.name || "EMRAKEL",
          url: siteUrl,
          logo,
          sameAs: sameAs.length ? sameAs : undefined
        },
        websiteData,
        ...siteNavigation
      ]
    }
  ];

  return (
    <html lang="en">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}

