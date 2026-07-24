// @ts-nocheck
import { getPublicContent } from "@/lib/cms";
import { metadataForPath } from "@/lib/seo";
import { SectionPageShell } from "../section-page-shell";
import ContactFormClient from "./ContactFormClient";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const content = await getPublicContent();
  return metadataForPath(content, "/contact", {
    title: content.contact.headline,
    description: content.contact.description
  });
}

export default async function ContactPage() {
  const content = await getPublicContent();
  const { brand, contact } = content;

  return (
    <SectionPageShell
      eyebrow={contact.eyebrow}
      title={contact.headline}
      description={contact.description}
      backLabel={content.home.backHomeLabel}
    >
      <section className="section contactSplit">
        <div className="contactInfoPanel">
          <p className="eyebrow">{contact.infoEyebrow}</p>
          <h2>{brand.name}</h2>
          <p className="contactText">{brand.address}</p>
          <p className="contactText">{brand.hours}</p>
          <p className="contactText">{brand.phone}</p>
          <p className="contactText">{brand.email}</p>
          <img src={contact.image} alt="" />
        </div>
        <div className="formPanel feedbackPanel">
          <p className="eyebrow">{contact.formEyebrow}</p>
          <h2>{contact.formHeadline}</h2>
          <ContactFormClient />
        </div>
      </section>
    </SectionPageShell>
  );
}

