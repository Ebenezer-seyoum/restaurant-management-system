"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { bookingPageSettings } from "@/lib/data";

export default function BookTableClient() {
  const [status, setStatus] = useState("");
  const [pageText, setPageText] = useState(bookingPageSettings);
  const [customer, setCustomer] = useState({ customer_name: "", phone: "", email: "" });

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const session = data?.user;
        if (session?.role === "customer") {
          setCustomer({
            customer_name: session.name || "",
            phone: session.phone || "",
            email: session.email || ""
          });
        }
      })
      .catch(() => undefined);
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => setPageText({ ...bookingPageSettings, ...(data.bookingPage || {}) }))
      .catch(() => undefined);
  }, []);

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  async function submitBooking(event) {
    event.preventDefault();
    setStatus(pageText.sendingMessage || "Sending booking...");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setStatus(response.ok ? data.message : data.error);
    if (response.ok) {
      event.currentTarget.reset();
    }
  }

  return (
    <main className="sectionDetailPage">
      <section className="sectionDetailHero">
        <div>
          <Link className="sectionBackLink" href="/">
            {pageText.backLabel}
          </Link>
          <p className="eyebrow">{pageText.eyebrow}</p>
          <h1>{pageText.headline}</h1>
          <p className="pageLead">{pageText.description}</p>
        </div>
      </section>
      <section className="section formWrap">
        <div className="panel">
          <h2>{pageText.panelTitle}</h2>
          <p className="contactText">{pageText.panelText}</p>
        </div>
        <div className="formPanel">
          <form onSubmit={submitBooking}>
            <label>
              {pageText.nameLabel}
              <input
                name="customer_name"
                onChange={(event) => updateCustomer("customer_name", event.target.value)}
                required
                placeholder={pageText.namePlaceholder}
                value={customer.customer_name}
              />
            </label>
            <label>
              {pageText.phoneLabel}
              <input
                name="phone"
                onChange={(event) => updateCustomer("phone", event.target.value)}
                required
                placeholder={pageText.phonePlaceholder}
                value={customer.phone}
              />
            </label>
            <label>
              {pageText.emailLabel}
              <input
                name="email"
                onChange={(event) => updateCustomer("email", event.target.value)}
                placeholder={pageText.emailPlaceholder}
                type="email"
                value={customer.email}
              />
            </label>
            <label>
              {pageText.dateLabel}
              <input name="booking_date" type="date" required />
            </label>
            <label>
              {pageText.timeLabel}
              <input name="booking_time" type="time" required />
            </label>
            <label>
              {pageText.guestsLabel}
              <input name="guests" type="number" min="1" max="30" required defaultValue="2" />
            </label>
            <label>
              {pageText.notesLabel}
              <textarea name="notes" placeholder={pageText.notesPlaceholder} />
            </label>
            <button className="button buttonGold" type="submit">
              {pageText.submitLabel}
            </button>
            {status ? <p className="contactText">{status}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
