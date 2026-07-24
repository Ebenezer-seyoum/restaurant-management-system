// @ts-nocheck
import { getPublicContent } from "@/lib/cms";
import { metadataForPath } from "@/lib/seo";
import BookTableClient from "./BookTableClient";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const content = await getPublicContent();
  return metadataForPath(content, "/book-table", {
    title: content.bookingPage.headline,
    description: content.bookingPage.description
  });
}

export default function BookTablePage() {
  return <BookTableClient />;
}

