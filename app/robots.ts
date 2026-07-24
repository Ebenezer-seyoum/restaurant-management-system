// @ts-nocheck
import { getPublicContent } from "@/lib/cms";
import { enabledSeoLinks, normalizeSiteUrl } from "@/lib/seo";

export default async function robots() {
  const content = await getPublicContent();
  const siteUrl = normalizeSiteUrl(content.seo?.siteUrl);
  const hiddenPaths = (content.seo?.sitelinks || [])
    .filter((link) => link.noindex === true || link.enabled === false)
    .map((link) => String(link.url || "").split("?")[0])
    .filter(Boolean);
  const allowPaths = enabledSeoLinks(content.seo)
    .filter((link) => link.noindex !== true)
    .map((link) => String(link.url || "").split("?")[0])
    .filter(Boolean);

  return {
    rules: {
      userAgent: "*",
      allow: allowPaths.length ? allowPaths : "/",
      disallow: hiddenPaths
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}

