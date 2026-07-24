const FALLBACK_SITE_URL = "https://httpemrakelhouse.com";

export function normalizeSiteUrl(value) {
  const rawValue = String(value || FALLBACK_SITE_URL)
    .trim()
    .replace(/^https?:\/\/https?:\/\//i, "https://")
    .replace(/^https?:\/\/http/i, "https://");
  const withProtocol = /^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;

  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function absoluteUrl(pathOrUrl, siteUrl) {
  if (!pathOrUrl) {
    return siteUrl;
  }

  try {
    return new URL(pathOrUrl, siteUrl).toString();
  } catch {
    return siteUrl;
  }
}

export function commaList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function enabledSeoLinks(seo = {}) {
  return (seo.sitelinks || []).filter((link) => link.enabled !== false);
}

export function findSeoLink(seo = {}, path = "/") {
  const cleanPath = path.split("?")[0];
  return (seo.sitelinks || []).find((link) => {
    const linkPath = String(link.url || "").split("?")[0] || "/";
    return linkPath === cleanPath;
  });
}

export function metadataForPath(content, path, fallback = {}) {
  const seo = content.seo || {};
  const siteUrl = normalizeSiteUrl(seo.siteUrl);
  const pageSeo = findSeoLink(seo, path);
  const title = pageSeo?.title || pageSeo?.label || fallback.title || seo.title || content.brand?.name || "EMRAKEL";
  const description = pageSeo?.description || fallback.description || seo.description || content.home?.description || "";
  const image = absoluteUrl(pageSeo?.image || seo.image || content.brand?.logoImage || "/logo.png", siteUrl);
  const canonicalUrl = absoluteUrl(path, siteUrl);
  const noindex = pageSeo?.noindex === true || pageSeo?.enabled === false;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: content.brand?.name || "EMRAKEL",
      images: [{ url: image, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    },
    robots: noindex ? { index: false, follow: true } : undefined
  };
}
