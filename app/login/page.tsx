// @ts-nocheck
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { brand as defaultBrand, loginPageSettings } from "@/lib/data";

export default function LoginPage() {
  const [status, setStatus] = useState("");
  const [brand, setBrand] = useState(defaultBrand);
  const [pageText, setPageText] = useState(loginPageSettings);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        setBrand({ ...defaultBrand, ...(data.brand || {}) });
        setPageText({ ...loginPageSettings, ...(data.loginPage || {}) });
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus(pageText.checkingMessage);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
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
    <main className="loginPage">
      <div className="loginCard" aria-labelledby="login-title">
        <Link className="loginBrand" href="/" aria-label={`${brand.name} home`}>
          <span className="loginLogoShell">
            <img src={brand.logoImage || "/logo.png"} alt="" />
          </span>
          <span>
            <strong>{brand.name}</strong>
            <small>{brand.subtitle}</small>
          </span>
        </Link>

        <div className="loginIntro">
          <p className="eyebrow">{pageText.eyebrow}</p>
          <h1 id="login-title">{pageText.loginTabLabel || "Login"}</h1>
          <p>{pageText.description}</p>
        </div>

        <form className="loginForm" onSubmit={handleSubmit}>
          <label>
            {pageText.emailLabel}
            <input name="email" type="email" required placeholder={pageText.loginEmailPlaceholder} autoComplete="email" />
          </label>
          <label>
            {pageText.passwordLabel}
            <input name="password" type="password" required placeholder={pageText.loginPasswordPlaceholder} autoComplete="current-password" />
          </label>
          <button className="button buttonGold" type="submit">
            {pageText.loginButtonLabel}
          </button>
          {status ? <p className="loginStatus" role="status">{status}</p> : null}
        </form>

        <Link className="loginBackHome" href="/">← Back Home</Link>
      </div>
    </main>
  );
}

