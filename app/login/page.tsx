// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Footer, Header } from "../shared";
import { brand as defaultBrand, footerSettings, loginPageSettings } from "@/lib/data";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [status, setStatus] = useState("");
  const [brand, setBrand] = useState(defaultBrand);
  const [footer, setFooter] = useState(footerSettings);
  const [pageText, setPageText] = useState(loginPageSettings);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        setBrand({ ...defaultBrand, ...(data.brand || {}) });
        setFooter({ ...footerSettings, ...(data.footer || {}) });
        setPageText({ ...loginPageSettings, ...(data.loginPage || {}) });
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus(mode === "login" ? pageText.checkingMessage : pageText.creatingMessage);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(data.error || "Unable to sign in right now. Please try again.");
        return;
      }

      window.location.href = data.user.role === "admin" ? "/admin" : "/customer";
    } catch {
      setStatus("Unable to reach the login service. Please check the server connection and try again.");
    }
  }

  return (
    <>
      <Header brandData={brand} />
      <main className="loginPage">
        <section className="pageHero">
          <p className="eyebrow">{pageText.eyebrow}</p>
          <h1>{pageText.headline}</h1>
          <p className="pageLead">{pageText.description}</p>
        </section>
        <section className="section formWrap">
          <div className="panel">
            <h2>{mode === "login" ? pageText.loginPanelTitle : pageText.registerPanelTitle}</h2>
            <p className="contactText">{pageText.panelText}</p>
          </div>
          <div className="formPanel">
            <div className="authSwitch" aria-label="Account mode">
              <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
                {pageText.loginTabLabel}
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                type="button"
                onClick={() => setMode("register")}
              >
                {pageText.registerTabLabel}
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {mode === "register" ? (
                <>
                  <label>
                    {pageText.nameLabel}
                    <input name="name" required placeholder={pageText.namePlaceholder} />
                  </label>
                  <label>
                    {pageText.phoneLabel}
                    <input name="phone" placeholder={pageText.phonePlaceholder} />
                  </label>
                </>
              ) : null}
              <label>
                {pageText.emailLabel}
                <input name="email" type="email" required placeholder={mode === "login" ? pageText.loginEmailPlaceholder : pageText.registerEmailPlaceholder} />
              </label>
              <label>
                {pageText.passwordLabel}
                <input name="password" type="password" required placeholder={mode === "register" ? pageText.registerPasswordPlaceholder : pageText.loginPasswordPlaceholder} />
              </label>
              <button className="button buttonGold" type="submit">
                {mode === "login" ? pageText.loginButtonLabel : pageText.registerButtonLabel}
              </button>
              {status ? <p className="loginStatus" role="status">{status}</p> : null}
            </form>
          </div>
        </section>
      </main>
      <Footer brandData={brand} footerData={footer} />
    </>
  );
}

