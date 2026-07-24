// @ts-nocheck
import Link from "next/link";

export function SectionPageShell({ eyebrow, title, description, image, backLabel = "Back to home", children }) {
  return (
    <main className="sectionDetailPage">
      <section className={image ? "sectionDetailHero sectionDetailHeroWithImage" : "sectionDetailHero"}>
        <div>
          <Link className="sectionBackLink" href="/">
            {backLabel}
          </Link>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description ? <p className="pageLead">{description}</p> : null}
        </div>
        {image ? <img src={image} alt="" /> : null}
      </section>
      {children}
    </main>
  );
}

