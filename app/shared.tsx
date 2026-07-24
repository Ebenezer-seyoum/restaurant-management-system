// @ts-nocheck
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { brand, brandImage, footerSettings } from "@/lib/data";

const links = [
  ["Home", "/"],
  ["Menu", "/#menu"],
  ["Gallery", "/#gallery"],
  ["About Us", "/#about"],
  ["Contact", "/#contact"]
];

function displayBrandName(brandData) {
  const subtitle = brandData.subtitle || "";
  return subtitle ? `${brandData.name} ${subtitle}` : brandData.name;
}

export function Header({
  brandData = brand,
  heroKicker = "",
  heroTitle = "",
  heroText = "",
  rotateStories
}) {
  const headerClassName = "siteHeader homeHeroHeader";
  const [openPanel, setOpenPanel] = useState("");
  const [storyIndex, setStoryIndex] = useState(0);
  const houseStories = rotateStories || [
    "A warm house for burgers, pizza, cocktails, and relaxed evenings.",
    "Hand-painted walls, leafy details, and golden light set the room mood.",
    "Guests can scan the menu, choose quickly, and enjoy the house atmosphere.",
    "Built for today with space for future online booking and customer service."
  ];
  const displayText = heroText || houseStories[storyIndex];
  const navLinks = (brandData.navLinks || links.map(([label, url], index) => ({ id: `${index}`, label, url, enabled: true }))).filter(
    (link) => link.enabled !== false
  );

  useEffect(() => {
    if (heroText || houseStories.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setStoryIndex((current) => (current + 1) % houseStories.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [heroText, houseStories.length]);

  return (
    <>
      <div className="topSupportBar">
        <span>{brandData.supportLabel || "Customer Support"} -</span>
        <a href={`tel:${(brandData.phone || "").replace(/\s/g, "")}`}>{brandData.phone}</a>
      </div>
      <header className={headerClassName}>
        <Link className="brandMark" href="/" aria-label="EMRAKEL home">
          <span className="logoShell">
            <img src={brandData.logoImage || brandImage} alt="" />
          </span>
          <span className="brandText">
            <strong>{brandData.name}</strong>
            <small>{brandData.subtitle}</small>
          </span>
        </Link>
        <nav>
          {navLinks.map((link) => (
            <Link key={link.id || link.url} href={link.url || "/"}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="navActions">
          <div className="headerDropdownWrap">
            <button
              className="button buttonLine compact bookHeaderButton"
              onClick={() => setOpenPanel(openPanel === "book" ? "" : "book")}
              type="button"
            >
              {brandData.headerBookingLabel || "Book a Table"}
            </button>
            {openPanel === "book" ? (
              <div className="headerDropdownPanel bookingDropdown">
                <p className="dropdownEyebrow">{brandData.bookingDropdownEyebrow || "Reserve by phone"}</p>
                <strong>{brandData.phone}</strong>
                <a className="button buttonGold compact" href={`tel:${brandData.phone.replace(/\s/g, "")}`}>
                  {brandData.bookingDropdownAction || "Call Now"}
                </a>
                <p>{brandData.bookingDropdownText}</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="heroRotatingText" aria-live="polite">
          {heroKicker ? <small>{heroKicker}</small> : null}
          {heroTitle ? <strong>{heroTitle}</strong> : null}
          <span>{displayText}</span>
        </div>
      </header>
    </>
  );
}

export function Footer({ brandData = brand, footerData }) {
  const fullBrandName = displayBrandName(brandData);
  const socialLinks = (footerData?.socialLinks || footerSettings.socialLinks).filter((link) => link.enabled !== false);
  const quickLinks = (footerData?.quickLinks || footerSettings.quickLinks).filter((link) => link.enabled !== false);
  const copyrightText =
    footerData?.copyright === "Copyright 2026 EMRAKEL. All rights reserved."
      ? `Copyright 2026 ${fullBrandName}. All rights reserved.`
      : footerData?.copyright || `Copyright 2026 ${fullBrandName}. All rights reserved.`;
  const creditText = footerData?.note || footerSettings.note;
  const creditUrl = footerData?.noteUrl || "";
  const showCreditLink = footerData?.noteLinkEnabled !== false && creditUrl;

  return (
    <footer className="footer">
      <div className="footerBrand">
        <img src={footerData?.logoImage || brandData.logoImage || brandImage} alt="" />
        <div>
          <h2>{fullBrandName}</h2>
          <p>{brandData.subtitle}</p>
          <p>{footerData?.description || footerSettings.description}</p>
        </div>
      </div>
      <div>
        <h3>{footerData?.visitHeading || "Visit"}</h3>
        <p>{brandData.address}</p>
        <p>{brandData.hours}</p>
      </div>
      <div>
        <h3>{footerData?.contactHeading || "Contact"}</h3>
        <p>{brandData.phone}</p>
        <p>{brandData.email}</p>
      </div>
      <div>
        <h3>{footerData?.quickLinksHeading || "Quick Links"}</h3>
        {quickLinks.map((link) => (
          <Link key={link.id || link.url} href={link.url || "/"}>
            {link.label}
          </Link>
        ))}
        <Link href="/book-table">{footerData?.bookTableLabel || "Book Table"}</Link>
      </div>
      <div>
        <h3>{footerData?.socialHeading || "Social"}</h3>
        <div className="footerSocial">
          {socialLinks.map((link) => (
            <a href={link.url || "#"} key={link.id || link.name} aria-label={link.name} target="_blank" rel="noreferrer">
              {link.image ? <img src={link.image} alt="" /> : <span>{String(link.name || "S").slice(0, 2)}</span>}
              {link.name}
            </a>
          ))}
        </div>
      </div>
      <div className="copyright">
        <p>{copyrightText}</p>
        <p>
          {showCreditLink ? (
            <a href={creditUrl} target="_blank" rel="noreferrer">
              {creditText}
            </a>
          ) : (
            creditText
          )}
        </p>
      </div>
    </footer>
  );
}

