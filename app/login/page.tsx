// @ts-nocheck
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { brand as defaultBrand, loginPageSettings } from "@/lib/data";

export default function LoginPage() {
  const [status, setStatus] = useState("");
  const [brand, setBrand] = useState(defaultBrand);
  const [pageText, setPageText] = useState(loginPageSettings);
  const [showPassword, setShowPassword] = useState(false);

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

      if (data.user.role !== "admin") {
        setStatus("Customer accounts are no longer available. Please contact the restaurant.");
        await fetch("/api/auth/logout", { method: "POST" });
        return;
      }

      window.location.href = "/admin";
    } catch {
      setStatus("Unable to reach the login service. Please check the server connection and try again.");
    }
  }

  return (
    <main className="loginPage loginPageStandalone">
      <section className="loginCard loginStandaloneCard" aria-labelledby="login-title">
        <div className="loginStandaloneBrand">
          <span className="loginLogoShell">
            <img src={brand.logoImage || "/logo.png"} alt="" />
          </span>
          <div>
            <p className="eyebrow">Secure admin access</p>
            <h1 id="login-title">{pageText.loginTabLabel || "Admin Login"}</h1>
            <p>Sign in to manage {brand.name}.</p>
          </div>
        </div>

        <form className="loginForm loginStandaloneForm" onSubmit={handleSubmit}>
          <label>
            {pageText.emailLabel}
            <input name="email" type="email" required placeholder={pageText.loginEmailPlaceholder} autoComplete="email" />
          </label>
          <label>
            {pageText.passwordLabel}
            <span className="loginPasswordField">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder={pageText.loginPasswordPlaceholder}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
          </label>
          <button className="button buttonGold" type="submit">
            <LockKeyhole size={18} aria-hidden="true" />
            {pageText.loginButtonLabel}
          </button>
          {status ? <p className="loginStatus" role="status">{status}</p> : null}
        </form>

        <Link className="loginBackHome" href="/">
          <ArrowLeft size={17} aria-hidden="true" />
          Back Home
        </Link>
      </section>
    </main>
  );
}

