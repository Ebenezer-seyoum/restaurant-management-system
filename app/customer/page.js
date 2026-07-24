"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Footer, Header } from "../shared";
import { brand as defaultBrand, customerPageSettings, footerSettings } from "@/lib/data";

export default function CustomerDashboardPage() {
  const [session, setSession] = useState(null);
  const [brand, setBrand] = useState(defaultBrand);
  const [footer, setFooter] = useState(footerSettings);
  const [pageText, setPageText] = useState(customerPageSettings);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setSession(data?.user || null))
      .catch(() => setSession(null));
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        setBrand({ ...defaultBrand, ...(data.brand || {}) });
        setFooter({ ...footerSettings, ...(data.footer || {}) });
        setPageText({ ...customerPageSettings, ...(data.customerPage || {}) });
      })
      .catch(() => undefined);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <Header brandData={brand} />
      <main>
        <section className="pageHero">
          <p className="eyebrow">{pageText.eyebrow}</p>
          <h1>{pageText.headline}</h1>
          <p className="pageLead">{pageText.description}</p>
        </section>
        <section className="section formWrap">
          <div className="panel">
            <h2>{session?.role === "customer" ? `${pageText.welcomePrefix}, ${session.name}` : pageText.loginRequiredTitle}</h2>
            <p className="contactText">{pageText.panelText}</p>
          </div>
          <div className="panel">
            <div className="actions">
              <Link className="button buttonGold" href="/menu">
                {pageText.orderButtonLabel}
              </Link>
              <Link className="button buttonLine" href="/book-table">
                {pageText.bookButtonLabel}
              </Link>
              <button className="button buttonLine" type="button" onClick={logout}>
                {pageText.logoutButtonLabel}
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer brandData={brand} footerData={footer} />
    </>
  );
}
