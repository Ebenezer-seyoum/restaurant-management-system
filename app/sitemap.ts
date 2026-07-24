// @ts-nocheck
import { getPublicContent } from "@/lib/cms";
import { absoluteUrl, enabledSeoLinks, normalizeSiteUrl } from "@/lib/seo";

export default async function sitemap() {
  const content = await getPublicContent();
  const siteUrl = normalizeSiteUrl(content.seo?.siteUrl);
  const links = enabledSeoLinks(content.seo).filter((link) => link.noindex !== true);

  return links.map((link) => ({
    url: absoluteUrl(link.url || "/", siteUrl),
    lastModified: new Date(),
    changeFrequency: link.url === "/" ? "weekly" : "monthly",
    priority: link.url === "/" ? 1 : 0.8
  }));
}

