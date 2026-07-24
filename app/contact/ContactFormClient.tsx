// @ts-nocheck
"use client";

import { useState } from "react";

export default function ContactFormClient() {
  const [status, setStatus] = useState("");

  async function submitMessage(event) {
    event.preventDefault();
    setStatus("Sending message...");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const data = await response.json();

    setStatus(response.ok ? data.message : data.error);
    if (response.ok) {
      event.currentTarget.reset();
    }
  }

  return (
    <form onSubmit={submitMessage}>
      <label>
        Name
        <input name="name" required placeholder="Your name" />
      </label>
      <label>
        Phone
        <input name="phone" placeholder="Phone number" />
      </label>
      <label>
        Email
        <input name="email" type="email" placeholder="Email address" />
      </label>
      <label>
        Subject
        <input name="subject" placeholder="Message subject" />
      </label>
      <label>
        Message
        <textarea name="message" required placeholder="How can we help?" />
      </label>
      <button className="button buttonGold" type="submit">
        Send Message
      </button>
      {status ? <p className="contactText">{status}</p> : null}
    </form>
  );
}

