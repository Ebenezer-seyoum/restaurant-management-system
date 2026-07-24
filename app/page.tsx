// @ts-nocheck
import { Footer, Header } from "./shared";
import { getPublicContent } from "@/lib/cms";
import MenuOrderClient from "./menu/MenuOrderClient";
import GalleryClient from "./gallery/GalleryClient";
import ContactFormClient from "./contact/ContactFormClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const content = await getPublicContent();
  const { about, brand, contact } = content;
  const galleryImages = content.gallery.map((image) => image.image);
  const latestGalleryImages = galleryImages.length ? galleryImages.slice(-3).reverse() : [content.home.galleryPreviewImage].filter(Boolean);
  const aboutPreviewImage = content.home.aboutPreviewImage || about.image;
  const contactPreviewImage = content.home.contactPreviewImage || contact.image;

  return (
    <>
      <Header
        brandData={content.brand}
        heroKicker={content.home.headerKicker}
        heroTitle={content.home.headerTitle}
        heroText={content.home.description}
      />
      <main className="referenceHome">
        {content.jazz?.enabled !== false ? (
          <section className="homeJazzOnly" id="home">
            <article className="refJazzCard">
              <img src={content.jazz?.image || "/uploads/house/jazz-night.png"} alt="" />
              <div>
                <p>{content.jazz?.eyebrow}</p>
                <h2>{content.jazz?.title}</h2>
                <span>{content.jazz?.date}</span>
                <span>{content.jazz?.time}</span>
                <Link href="/contact">{content.jazz?.actionLabel}</Link>
              </div>
            </article>
          </section>
        ) : null}

        <div id="menu" className="homeScrollSection">
          <div className="homeSectionAction">
            <Link className="button buttonGold" href="/menu">
              {content.home.menuViewMoreLabel}
            </Link>
          </div>
          <MenuOrderClient categories={content.categories} defaultSectionImage={content.home.menuPreviewImage} items={content.items} menuBoard={content.menuBoard} previewLimitItems={3} />
        </div>

        <div id="gallery" className="homeScrollSection">
          <div className="homeSectionIntro">
            <p className="eyebrow">{content.home.galleryEyebrow}</p>
            <h2>{content.home.galleryHeadline}</h2>
            <p>{content.home.galleryDescription}</p>
            <Link className="button buttonGold" href="/gallery">
              {content.home.galleryViewMoreLabel}
            </Link>
          </div>
          <GalleryClient images={latestGalleryImages} />
        </div>

        <section id="about" className="section aboutStoryGrid homeScrollSection">
          <div className="aboutStoryImage">
            <img src={aboutPreviewImage} alt="" />
          </div>
          <div className="aboutStoryText">
            <p className="eyebrow">{about.eyebrow}</p>
            <h2>{about.headline}</h2>
            <p className="contactText">{about.description}</p>
            <Link className="button buttonGold" href="/about">
              {content.home.aboutViewMoreLabel}
            </Link>
          </div>
          <div className="aboutStoryImage">
            <img src={about.secondaryImage} alt="" />
          </div>
          <div className="aboutStoryText">
            <p className="eyebrow">{about.secondaryEyebrow}</p>
            <h2>{about.secondaryHeadline}</h2>
            <p className="contactText">{about.secondaryDescription}</p>
          </div>
        </section>

        <section id="contact" className="section contactSplit homeScrollSection">
          <div className="contactInfoPanel">
            <p className="eyebrow">{contact.infoEyebrow}</p>
            <h2>{brand.name}</h2>
            <p className="contactText">{brand.address}</p>
            <p className="contactText">{brand.hours}</p>
            <p className="contactText">{brand.phone}</p>
            <p className="contactText">{brand.email}</p>
            <img src={contactPreviewImage} alt="" />
          </div>
          <div className="formPanel feedbackPanel">
            <p className="eyebrow">{contact.formEyebrow}</p>
            <h2>{contact.formHeadline}</h2>
            <ContactFormClient />
            <Link className="button buttonGold sectionPanelAction" href="/contact">
              {content.home.contactViewMoreLabel}
            </Link>
          </div>
        </section>
      </main>
      <Footer brandData={content.brand} footerData={content.footer} />
    </>
  );
}

