// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  Globe2,
  LogOut,
  MessageSquare,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Trash2
} from "lucide-react";
import { brandImage } from "@/lib/data";
import FinancePanel from "./FinancePanel";

const emptyStatus = { type: "", message: "" };
const websiteTabs = [
  ["home", "Home"],
  ["menu", "Menu"],
  ["gallery", "Gallery"],
  ["about", "About Us"],
  ["contact", "Contact"],
  ["footer", "Footer"],
  ["seo", "Google SEO"],
  ["jazz", "Jazz"]
];
const operationTabs = [["orders", "Orders"], ["finance", "Expenses"]];
const navItems = [...websiteTabs, ...operationTabs, ["reports", "Reports"], ["feedback", "Feedback"]];
const sidebarItems = [
  { id: "website", label: "Website Customization", icon: Globe2, firstTab: "home" },
  { id: "operations", label: "Operations", icon: ClipboardList, firstTab: "orders" },
  { id: "reports", label: "Reports", icon: BarChart3, firstTab: "reports" },
  { id: "feedback", label: "Feedback", icon: MessageSquare, firstTab: "feedback" }
];

function adminHeaders() {
  return {
    "Content-Type": "application/json"
  };
}

function TextInput({ label, value, onChange, textarea = false, type = "text" }) {
  const Field = textarea ? "textarea" : "input";
  return (
    <label>
      {label}
      <Field type={textarea ? undefined : type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ImageControl({ label, value, onChange, onUpload }) {
  const preview = value || brandImage;

  return (
    <div className="imageControl">
      <span>{label}</span>
      <img src={preview} alt="" />
      <div className="imageControlActions">
        <button className="button buttonLine compact" type="button" onClick={() => onChange("")}>
          Remove
        </button>
        <label className="button buttonDark compact">
          Upload
          <input accept="image/*" onChange={(event) => onUpload(event, onChange)} type="file" />
        </label>
      </div>
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder="/uploads/house/image.jpg" />
    </div>
  );
}

function normalizeAdminUrl(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/https?:\/\//i, "https://");
}

function displayUrl(siteUrl, path = "/") {
  const cleanSite = normalizeAdminUrl(siteUrl || "https://httpemrakelhouse.com").replace(/\/$/, "");
  const cleanPath = String(path || "/");
  if (/^https?:\/\//i.test(cleanPath)) {
    return cleanPath;
  }
  return `${cleanSite}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
}

function slugifyAdminValue(value, fallback = "item") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `${fallback}-${Date.now()}`;
}

function SeoPreview({ siteUrl, title, description, path = "/" }) {
  return (
    <div className="seoPreviewBox">
      <div className="seoPreviewIcon">E</div>
      <div>
        <span>{displayUrl(siteUrl, path)}</span>
        <strong>{title || "Google title"}</strong>
        <p>{description || "Google description preview will appear here."}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardClient() {
  const [session, setSession] = useState(undefined);
  const [activeArea, setActiveArea] = useState("website");
  const [activeTab, setActiveTab] = useState("home");
  const [themeMode, setThemeMode] = useState("auto");
  const [resolvedTheme, setResolvedTheme] = useState("light");
  const [status, setStatus] = useState(emptyStatus);
  const [brand, setBrand] = useState(null);
  const [home, setHome] = useState(null);
  const [about, setAbout] = useState(null);
  const [contact, setContact] = useState(null);
  const [footer, setFooter] = useState(null);
  const [jazz, setJazz] = useState(null);
  const [seo, setSeo] = useState(null);
  const [menuBoard, setMenuBoard] = useState(null);
  const [bookingPage, setBookingPage] = useState(null);
  const [loginPage, setLoginPage] = useState(null);
  const [customerPage, setCustomerPage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedMenuSide, setSelectedMenuSide] = useState("food");
  const [editingSections, setEditingSections] = useState([]);
  const [expandedSubsections, setExpandedSubsections] = useState([]);
  const [sectionSearch, setSectionSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [selectedMenuSection, setSelectedMenuSection] = useState("");
  const [menuProductModal, setMenuProductModal] = useState(null);
  const [menuSectionModal, setMenuSectionModal] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adminOrderFilter, setAdminOrderFilter] = useState("all");
  const [adminCancelOrder, setAdminCancelOrder] = useState(null);
  const [adminCancelReason, setAdminCancelReason] = useState("");
  const [customers, setCustomers] = useState([]);
  const [feedback, setFeedback] = useState([]);

  const totals = useMemo(
    () => ({
      pendingBookings: bookings.filter((booking) => booking.status === "pending").length,
      pendingOrders: orders.filter((order) => order.status === "pending").length,
      menuItems: items.length,
      totalOrders: orders.length,
      totalBookings: bookings.length,
      customers: customers.length,
      newFeedback: feedback.filter((item) => item.status === "new").length,
      revenue: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    }),
    [bookings, customers, feedback, items, orders]
  );
  const mainCategories = categories.filter((category) => !category.parentId);
  const menuSideRoot = mainCategories.find(
    (category) => category.id === selectedMenuSide && (category.menuSide || "food") === selectedMenuSide
  );
  const simpleMenuSections = mainCategories
    .filter((category) => (category.menuSide || "food") === selectedMenuSide)
    .flatMap((category) => {
      const children = categories.filter((item) => item.parentId === category.id && (item.menuSide || selectedMenuSide) === selectedMenuSide);
      return children.length ? children : [category];
    })
    .filter((category, index, list) => list.findIndex((item) => item.id === category.id) === index);
  const filteredSimpleMenuSections = simpleMenuSections.filter((section) => {
    const query = sectionSearch.trim().toLowerCase();
    const sectionItems = getCategoryItems(section.id);
    const haystack = [section.id, section.name, section.description, ...sectionItems.map((item) => `${item.name} ${item.price}`)]
      .join(" ")
      .toLowerCase();

    return query ? haystack.includes(query) : true;
  });
  const selectedMenuSectionData = categories.find((category) => category.id === selectedMenuSection);
  const selectedMenuProducts = selectedMenuSectionData
    ? getVisibleCategoryItems(selectedMenuSectionData.id)
    : [];
  const seoSiteUrl = normalizeAdminUrl(seo?.siteUrl || "https://httpemrakelhouse.com") || "https://httpemrakelhouse.com";
  const seoMenuUrl = seo?.menuUrl || displayUrl(seoSiteUrl, "/menu");
  const seoSearchConsoleUrls =
    seo?.searchConsoleUrls ||
    ["/", "/menu", "/about", "/gallery", "/contact"].map((path) => displayUrl(seoSiteUrl, path)).join("\n");
  const enabledSeoLinks = (seo?.sitelinks || []).filter((link) => link.enabled !== false && link.noindex !== true);

  useEffect(() => {
    async function initializeDashboard() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || data.user?.role !== "admin") {
          setSession(null);
          setStatus({ type: "error", message: "Admin login is required. Use the login page first." });
          return;
        }
        setSession(data.user);
        await loadDashboard();
      } catch {
        setSession(null);
        setStatus({ type: "error", message: "Unable to verify the admin session." });
      }
    }

    initializeDashboard();
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("emrakel-admin-theme");
    if (["light", "dark", "auto"].includes(savedTheme || "")) {
      setThemeMode(savedTheme);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      setResolvedTheme(themeMode === "auto" ? (media.matches ? "dark" : "light") : themeMode);
    };
    syncTheme();
    window.localStorage.setItem("emrakel-admin-theme", themeMode);
    media.addEventListener?.("change", syncTheme);
    return () => media.removeEventListener?.("change", syncTheme);
  }, [themeMode]);

  useEffect(() => {
    if (!status.type || !status.message) {
      return undefined;
    }

    const timer = window.setTimeout(() => setStatus(emptyStatus), 3600);
    return () => window.clearTimeout(timer);
  }, [status.type, status.message]);

  async function loadDashboard() {
    setStatus({ type: "", message: "Loading dashboard..." });
    const [settingsRes, menuRes, galleryRes, ordersRes, feedbackRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/menu"),
      fetch("/api/gallery"),
      fetch("/api/orders"),
      fetch("/api/feedback")
    ]);

    const [settingsData, menuData, galleryData, ordersData, feedbackData] = await Promise.all([
      settingsRes.json(),
      menuRes.json(),
      galleryRes.json(),
      ordersRes.json(),
      feedbackRes.json()
    ]);

    setBrand(settingsData.brand);
    setHome(settingsData.home);
    setAbout(settingsData.about);
    setContact(settingsData.contact);
    setFooter(settingsData.footer);
    setJazz(settingsData.jazz);
    setSeo(settingsData.seo);
    setMenuBoard(settingsData.menuBoard);
    setBookingPage(settingsData.bookingPage);
    setLoginPage(settingsData.loginPage);
    setCustomerPage(settingsData.customerPage);
    setCategories(menuData.categories || []);
    setItems(menuData.items || []);
    setGallery(galleryData.gallery || []);
    setOrders(ordersData.orders || []);
    setFeedback(feedbackData.feedback || []);
    setStatus(emptyStatus);
  }

  async function uploadAdminImage(event, onChange) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setStatus({ type: "", message: "Uploading image..." });
    const formData = new FormData();
    formData.append("file", file);

    let response;
    let data;

    try {
      response = await fetch("/api/uploads", {
        method: "POST",
        body: formData
      });
      data = await response.json();
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Image upload failed." });
      event.target.value = "";
      return;
    }

    if (!response.ok) {
      setStatus({ type: "error", message: data.error || "Image upload failed." });
      event.target.value = "";
      return;
    }

    onChange(data.url);
    setStatus({ type: "success", message: "Image uploaded. Save this section to publish it." });
    event.target.value = "";
  }

  async function saveSettings(event) {
    event.preventDefault();
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ brand, home, about, contact, footer, jazz, seo, menuBoard, bookingPage, loginPage, customerPage })
    });
    const data = await response.json();
    setStatus({ type: response.ok ? "success" : "error", message: data.message || data.error });
  }

  function validateSeoSettings() {
    const url = normalizeAdminUrl(seo.siteUrl);

    if (!/^https:\/\//i.test(url)) {
      return "Website URL must start with https://";
    }

    if (/http:\/\/http/i.test(url)) {
      return "Please fix the website URL. Use https://httpemrakelhouse.com";
    }

    if (!seo.title?.trim()) {
      return "Google title is required.";
    }

    if (!seo.description?.trim()) {
      return "Google description is required.";
    }

    return "";
  }

  async function saveSeoSettings(event) {
    event.preventDefault();
    const validationError = validateSeoSettings();

    if (validationError) {
      setStatus({ type: "error", message: validationError });
      return;
    }

    const nextSeo = {
      ...seo,
      siteUrl: seoSiteUrl,
      menuUrl: seo.menuUrl || displayUrl(seoSiteUrl, "/menu"),
      sitemapUrl: seo.sitemapUrl || displayUrl(seoSiteUrl, "/sitemap.xml"),
      robotsUrl: seo.robotsUrl || displayUrl(seoSiteUrl, "/robots.txt"),
      searchConsoleUrls: seoSearchConsoleUrls
    };
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ brand, home, about, contact, footer, jazz, seo: nextSeo, menuBoard, bookingPage, loginPage, customerPage })
    });
    const data = await response.json();
    setSeo(nextSeo);
    setStatus({ type: response.ok ? "success" : "error", message: response.ok ? "Google SEO saved successfully." : data.error });
  }

  async function saveMenu(event?: { preventDefault?: () => void }) {
    event?.preventDefault();
    return persistMenu(categories, items);
  }

  async function persistMenu(nextCategories, nextItems, successMessage = "Menu saved successfully.") {
    setStatus({ type: "", message: "Saving menu..." });
    const response = await fetch("/api/menu", {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ categories: nextCategories, items: nextItems })
    });
    const data = await response.json();
    if (response.ok) {
      setCategories(nextCategories);
      setItems(nextItems);
    }
    setStatus({
      type: response.ok ? "success" : "error",
      message: response.ok ? successMessage : data.error || "Unable to save menu."
    });
    return response.ok;
  }

  function openProductModal(categoryId, item = null) {
    setMenuProductModal({
      mode: item ? "edit" : "add",
      itemId: item?.id || "",
      categoryId,
      name: item?.name || "",
      price: item?.price ?? "",
      description: item?.description || "",
      image: item?.image || "",
      isActive: item?.isActive !== false
    });
  }

  async function submitProductModal(event) {
    event.preventDefault();
    if (!menuProductModal) return;
    const name = menuProductModal.name.trim();
    const price = Number(menuProductModal.price);
    if (!name || !Number.isFinite(price) || price < 0) {
      setStatus({ type: "error", message: "Product name and a valid price are required." });
      return;
    }
    const nextItems =
      menuProductModal.mode === "edit"
        ? items.map((item) =>
            item.id === menuProductModal.itemId
              ? {
                  ...item,
                  name,
                  price,
                  description: menuProductModal.description.trim(),
                  image: menuProductModal.image,
                  isActive: menuProductModal.isActive
                }
              : item
          )
        : [
            ...items,
            {
              id: `${slugifyAdminValue(name)}-${Date.now()}`,
              category: menuProductModal.categoryId,
              name,
              price,
              description: menuProductModal.description.trim(),
              image: menuProductModal.image || brandImage,
              isActive: true
            }
          ];
    const saved = await persistMenu(categories, nextItems, menuProductModal.mode === "edit" ? "Product updated." : "Product added.");
    if (saved) setMenuProductModal(null);
  }

  async function removeProduct(item) {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone after saving.`)) return;
    await persistMenu(categories, items.filter((current) => current.id !== item.id), "Product deleted.");
  }

  async function toggleProduct(item) {
    await persistMenu(
      categories,
      items.map((current) => current.id === item.id ? { ...current, isActive: current.isActive === false } : current),
      `${item.name} visibility updated.`
    );
  }

  function openSectionModal(section = null) {
    setMenuSectionModal({
      mode: section ? "edit" : "add",
      sectionId: section?.id || "",
      name: section?.name || "",
      description: section?.description || "",
      image: section?.image || "",
      isActive: section?.isActive !== false,
      menuSide: section?.menuSide || selectedMenuSide
    });
  }

  async function submitSectionModal(event) {
    event.preventDefault();
    if (!menuSectionModal?.name.trim()) {
      setStatus({ type: "error", message: "Section name is required." });
      return;
    }
    const root = mainCategories.find((category) => category.id === menuSectionModal.menuSide);
    const nextCategories =
      menuSectionModal.mode === "edit"
        ? categories.map((category) =>
            category.id === menuSectionModal.sectionId
              ? {
                  ...category,
                  name: menuSectionModal.name.trim(),
                  description: menuSectionModal.description.trim(),
                  image: menuSectionModal.image || brandImage,
                  menuSide: menuSectionModal.menuSide,
                  parentId: root?.id || menuSectionModal.menuSide,
                  isActive: menuSectionModal.isActive
                }
              : category
          )
        : [
            ...categories,
            {
              id: `${slugifyAdminValue(menuSectionModal.name, "section")}-${Date.now()}`,
              parentId: root?.id || menuSectionModal.menuSide,
              name: menuSectionModal.name.trim(),
              description: menuSectionModal.description.trim(),
              image: menuSectionModal.image || brandImage,
              menuSide: menuSectionModal.menuSide,
              isActive: true
            }
          ];
    const saved = await persistMenu(nextCategories, items, menuSectionModal.mode === "edit" ? "Section updated." : "Section added.");
    if (saved) {
      setSelectedMenuSide(menuSectionModal.menuSide);
      setMenuSectionModal(null);
    }
  }

  async function removeSection(section) {
    if (!window.confirm(`Delete ${section.name} and every product inside it?`)) return;
    const removedIds = [section.id, ...categories.filter((category) => category.parentId === section.id).map((category) => category.id)];
    const nextCategories = categories.filter((category) => !removedIds.includes(category.id));
    const nextItems = items.filter((item) => !removedIds.includes(item.category));
    const saved = await persistMenu(nextCategories, nextItems, "Section and its products deleted.");
    if (saved) setSelectedMenuSection("");
  }

  async function saveGallery(event) {
    event.preventDefault();
    const response = await fetch("/api/gallery", {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ gallery })
    });
    const data = await response.json();
    setStatus({ type: response.ok ? "success" : "error", message: data.message || data.error });
  }

  async function updateBooking(id, nextStatus) {
    const response = await fetch("/api/bookings", {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ id, status: nextStatus })
    });
    const data = await response.json();
    await loadDashboard();
    setStatus({ type: response.ok ? "success" : "error", message: data.message || data.error });
  }

  async function updateOrder(id, nextStatus, { cancelReason = "", paymentMethod = "" } = {}) {
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({
        id,
        status: nextStatus,
        cancel_reason: cancelReason,
        ...(paymentMethod ? { payment_method: paymentMethod } : {})
      })
    });
    const data = await response.json();
    await loadDashboard();
    setStatus({ type: response.ok ? "success" : "error", message: data.message || data.error });
    if (response.ok) {
      setAdminCancelOrder(null);
      setAdminCancelReason("");
    }
  }

  async function updateFeedback(id, nextStatus) {
    const response = await fetch("/api/feedback", {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ id, status: nextStatus })
    });
    const data = await response.json();
    await loadDashboard();
    setStatus({ type: response.ok ? "success" : "error", message: data.message || data.error });
  }

  function addCategory(parentId = "", menuSide = "food") {
    const parent = categories.find((category) => category.id === parentId);
    const resolvedSide = parent?.menuSide || menuSide;
    const id = parentId ? `subsection-${Date.now()}` : `section-${Date.now()}`;
    setCategories((current) => [
      ...current,
      {
        id,
        parentId,
        name: parentId ? "New Subsection" : "New Section",
        description: "",
        image: brandImage,
        menuSide: resolvedSide
      }
    ]);
    if (!parentId) {
      setSelectedMenuSide(resolvedSide);
    } else {
      setExpandedSubsections((current) => (current.includes(id) ? current : [...current, id]));
    }
    setEditingSections((current) => (current.includes(id) ? current : [...current, id]));
  }

  function addSimpleSection() {
    addCategory(menuSideRoot?.id || "", selectedMenuSide);
  }

  function openSectionEditor(sectionId) {
    setEditingSections((current) => (current.includes(sectionId) ? current : [...current, sectionId]));
  }

  function closeSectionEditor(sectionId) {
    setEditingSections((current) => current.filter((id) => id !== sectionId));
  }

  async function cancelSectionLine(sectionId) {
    await loadDashboard();
    closeSectionEditor(sectionId);
  }

  async function saveSectionLine(sectionId) {
    const saved = await saveMenu();

    if (saved) {
      closeSectionEditor(sectionId);
    }
  }

  function updateCategory(categoryId, updates) {
    const nextId = updates.id || categoryId;
    setCategories((current) =>
      current.map((category) => {
        if (category.id === categoryId) {
          return { ...category, ...updates };
        }
        if (category.parentId === categoryId) {
          return { ...category, parentId: nextId, ...(updates.menuSide ? { menuSide: updates.menuSide } : {}) };
        }
        return category;
      })
    );
    if (updates.id) {
      setItems((current) => current.map((item) => (item.category === categoryId ? { ...item, category: updates.id } : item)));
    }
  }

  function deleteCategory(categoryId) {
    const removedIds = categories
      .filter((category) => category.id === categoryId || category.parentId === categoryId)
      .map((category) => category.id);
    setCategories((current) => current.filter((category) => !removedIds.includes(category.id)));
    setItems((current) => current.filter((item) => !removedIds.includes(item.category)));
  }

  function addMenuItemToCategory(categoryId) {
    setItems((current) => [
      ...current,
      {
        id: `item-${Date.now()}`,
        category: categoryId,
        name: "New Item",
        description: "Item description",
        price: 0,
        image: brandImage,
        isActive: true
      }
    ]);
    setExpandedSubsections((current) => (current.includes(categoryId) ? current : [...current, categoryId]));
  }

  function toggleSubsection(categoryId) {
    setExpandedSubsections((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId]
    );
  }

  function getCategoryItems(categoryId) {
    return items.filter((item) => item.category === categoryId);
  }

  function getVisibleCategoryItems(categoryId) {
    const query = itemSearch.trim().toLowerCase();

    return getCategoryItems(categoryId).filter((item) =>
      query ? [item.id, item.name, item.description, item.price].join(" ").toLowerCase().includes(query) : true
    );
  }

  function renderMenuItemRows(categoryId) {
    const visibleItems = getVisibleCategoryItems(categoryId);

    return (
      <div className="menuItemRows">
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <div className="menuItemRow" key={item.id}>
              <div className="menuItemPhotoEditor">
                <img src={item.image || brandImage} alt="" />
                <label className="button buttonLine compact">
                  Upload photo
                  <input
                    accept="image/*"
                    onChange={(event) => uploadAdminImage(event, (value) => updateMenuItem(item.id, { image: value }))}
                    type="file"
                  />
                </label>
              </div>
              <label>
                Item
                <input value={item.name} onChange={(event) => updateMenuItem(item.id, { name: event.target.value })} />
              </label>
              <label>
                Price
                <input
                  min="0"
                  type="number"
                  value={item.price}
                  onChange={(event) => updateMenuItem(item.id, { price: Number(event.target.value) })}
                />
              </label>
              <label className="menuItemDescriptionField">
                Description
                <input
                  value={item.description || ""}
                  onChange={(event) => updateMenuItem(item.id, { description: event.target.value })}
                  placeholder="Short description shown to the waiter"
                />
              </label>
              <label className="menuItemImageField">
                Image URL
                <input
                  value={item.image || ""}
                  onChange={(event) => updateMenuItem(item.id, { image: event.target.value })}
                  placeholder="/uploads/menu/item.jpg"
                />
              </label>
              <button
                className={`activeToggle ${item.isActive !== false ? "active" : ""}`}
                type="button"
                onClick={() => updateMenuItem(item.id, { isActive: item.isActive === false })}
              >
                {item.isActive !== false ? "Active" : "Hidden"}
              </button>
              <button className="button buttonLine compact dangerText" type="button" onClick={() => deleteMenuItem(item.id)}>
                Delete
              </button>
            </div>
          ))
        ) : (
          <p className="emptySmall">No items match this section yet.</p>
        )}
        <button className="button buttonLine compact" type="button" onClick={() => addMenuItemToCategory(categoryId)}>
          Add Item
        </button>
      </div>
    );
  }

  function renderSubsectionCard(subsection, parentCategory) {
    const expanded = expandedSubsections.includes(subsection.id);
    const itemCount = getCategoryItems(subsection.id).length;

    return (
      <article className="menuSubsectionCard" key={subsection.id}>
        <div className="menuSubsectionHead">
          <button className="menuDropdownButton" type="button" onClick={() => toggleSubsection(subsection.id)}>
            <span>{expanded ? "v" : ">"}</span>
          </button>
          <div>
            <strong>{subsection.name || "Untitled sub section"}</strong>
            <small>
              {itemCount} items - {subsection.menuSide === "drinks" ? "Drinks" : "Food"}
            </small>
          </div>
          <button
            className={`activeToggle ${subsection.isActive !== false ? "active" : ""}`}
            type="button"
            onClick={() => updateCategory(subsection.id, { isActive: subsection.isActive === false })}
          >
            {subsection.isActive !== false ? "Active" : "Hidden"}
          </button>
        </div>
        <div className="menuCategoryEditor menuSubsectionFields">
          <label>
            Key
            <input value={subsection.id} onChange={(event) => updateCategory(subsection.id, { id: event.target.value })} />
          </label>
          <label>
            Name
            <input value={subsection.name} onChange={(event) => updateCategory(subsection.id, { name: event.target.value })} />
          </label>
          <label>
            Menu side
            <select
              value={subsection.menuSide || parentCategory.menuSide || "food"}
              onChange={(event) => updateCategory(subsection.id, { menuSide: event.target.value })}
            >
              <option value="food">Food / Burger side</option>
              <option value="drinks">Drinks side</option>
            </select>
          </label>
          <label>
            Description
            <input
              value={subsection.description || ""}
              onChange={(event) => updateCategory(subsection.id, { description: event.target.value })}
            />
          </label>
          <div className="wideField">
            <ImageControl
              label="Sub section photo"
              value={subsection.image}
              onChange={(value) => updateCategory(subsection.id, { image: value })}
              onUpload={uploadAdminImage}
            />
          </div>
        </div>
        <div className="menuSubsectionActions">
          <button className="button buttonLine compact dangerText" type="button" onClick={() => deleteCategory(subsection.id)}>
            Delete Sub Section
          </button>
        </div>
        {expanded ? renderMenuItemRows(subsection.id) : null}
      </article>
    );
  }

  function renderSimpleMenuSection(section) {
    const children = categories.filter((category) => category.parentId === section.id);
    const visibleChildren = children.filter((category) => (category.menuSide || selectedMenuSide) === selectedMenuSide);
    const directItems = getCategoryItems(section.id);
    const childItems = visibleChildren.flatMap((child) => getCategoryItems(child.id));
    const itemCount = directItems.length + childItems.length;
    const isEditing = editingSections.includes(section.id);

    return (
      <article className="menuSimpleSection" key={section.id}>
        <div className="menuSimpleSectionHead">
          <div className="menuSimpleTitleBlock">
            {section.image ? <img className="menuSimpleThumb" src={section.image} alt="" /> : null}
            <div>
              <p className="eyebrow">{selectedMenuSide === "drinks" ? "Drink Section" : "Food Section"}</p>
              <h3>{section.name || "Untitled section"}</h3>
              <p className="menuSimpleMeta">
                {visibleChildren.length} sub sections / {itemCount} items
              </p>
              {section.description ? <p className="menuSimpleDescription">{section.description}</p> : null}
            </div>
          </div>
          <div className="miniActions">
            <button
              className={`activeToggle ${section.isActive !== false ? "active" : ""}`}
              type="button"
              onClick={() => updateCategory(section.id, { isActive: section.isActive === false })}
            >
              {section.isActive !== false ? "Active" : "Hidden"}
            </button>
            {isEditing ? (
              <>
                <button className="button buttonGold compact" type="button" onClick={() => saveSectionLine(section.id)}>
                  Save
                </button>
                <button className="button buttonLine compact" type="button" onClick={() => cancelSectionLine(section.id)}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="button buttonLine compact" type="button" onClick={() => openSectionEditor(section.id)}>
                Edit
              </button>
            )}
            <button className="button buttonLine compact dangerText" type="button" onClick={() => deleteCategory(section.id)}>
              Delete Section
            </button>
          </div>
        </div>

        {isEditing ? (
          <>
            <div className="menuSimpleFields">
              <label>
                Section key
                <input value={section.id} onChange={(event) => updateCategory(section.id, { id: event.target.value })} />
              </label>
              <label>
                Section name
                <input value={section.name} onChange={(event) => updateCategory(section.id, { name: event.target.value })} />
              </label>
              <label className="wideField">
                Description
                <textarea value={section.description || ""} onChange={(event) => updateCategory(section.id, { description: event.target.value })} />
              </label>
              <div className="wideField">
                <ImageControl
                  label="Section photo"
                  value={section.image}
                  onChange={(value) => updateCategory(section.id, { image: value })}
                  onUpload={uploadAdminImage}
                />
              </div>
            </div>

            {visibleChildren.length ? (
              <div className="menuSimpleChildren">
                <div className="compactHead">
                  <div>
                    <p className="eyebrow">Sub sections</p>
                    <h3>Dropdown items</h3>
                  </div>
                  <button className="button buttonLine compact" type="button" onClick={() => addCategory(section.id, section.menuSide || selectedMenuSide)}>
                    Add Sub Section
                  </button>
                </div>
                {visibleChildren.map((child) => renderSubsectionCard(child, section))}
              </div>
            ) : (
              <div className="menuSimpleItems">
                <div className="compactHead">
                  <div>
                    <p className="eyebrow">Items</p>
                    <h3>Add and edit prices</h3>
                  </div>
                </div>
                {renderMenuItemRows(section.id)}
              </div>
            )}
          </>
        ) : null}
      </article>
    );
  }

  function updateMenuItem(itemId, updates) {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  }

  function deleteMenuItem(itemId) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  function addGalleryImage() {
    setGallery((current) => [
      ...current,
      {
        id: `gallery-${Date.now()}`,
        title: "Gallery image",
        image: brandImage
      }
    ]);
  }

  function deleteGalleryImage(imageId) {
    setGallery((current) => current.filter((image) => image.id !== imageId));
  }

  function updateSocialLink(linkId, updates) {
    setFooter((current) => ({
      ...current,
      socialLinks: (current.socialLinks || []).map((link) => (link.id === linkId ? { ...link, ...updates } : link))
    }));
  }

  function addSocialLink() {
    const id = `social-${Date.now()}`;
    setFooter((current) => ({
      ...current,
      socialLinks: [
        ...(current.socialLinks || []),
        {
          id,
          name: "New Social Link",
          url: "#",
          image: "",
          enabled: true
        }
      ]
    }));
  }

  function deleteSocialLink(linkId) {
    setFooter((current) => ({
      ...current,
      socialLinks: (current.socialLinks || []).filter((link) => link.id !== linkId)
    }));
  }

  function updateFooterQuickLink(linkId, updates) {
    setFooter((current) => ({
      ...current,
      quickLinks: (current.quickLinks || []).map((link) => (link.id === linkId ? { ...link, ...updates } : link))
    }));
  }

  function addFooterQuickLink() {
    const id = `footer-link-${Date.now()}`;
    setFooter((current) => ({
      ...current,
      quickLinks: [
        ...(current.quickLinks || []),
        {
          id,
          label: "New Link",
          url: "/",
          enabled: true
        }
      ]
    }));
  }

  function deleteFooterQuickLink(linkId) {
    setFooter((current) => ({
      ...current,
      quickLinks: (current.quickLinks || []).filter((link) => link.id !== linkId)
    }));
  }

  function updateHeaderNavLink(linkId, updates) {
    setBrand((current) => ({
      ...current,
      navLinks: (current.navLinks || []).map((link) => (link.id === linkId ? { ...link, ...updates } : link))
    }));
  }

  function addHeaderNavLink() {
    const id = `header-link-${Date.now()}`;
    setBrand((current) => ({
      ...current,
      navLinks: [...(current.navLinks || []), { id, label: "New Link", url: "/", enabled: true }]
    }));
  }

  function deleteHeaderNavLink(linkId) {
    setBrand((current) => ({
      ...current,
      navLinks: (current.navLinks || []).filter((link) => link.id !== linkId)
    }));
  }

  function addSeoSitelink() {
    const id = `sitelink-${Date.now()}`;
    setSeo((current) => ({
      ...current,
      sitelinks: [
        ...(current.sitelinks || []),
        {
          id,
          label: "New Link",
          url: "/",
          description: "Short Google search description for this link.",
          enabled: true
        }
      ]
    }));
  }

  function updateSeoSitelink(linkId, updates) {
    setSeo((current) => ({
      ...current,
      sitelinks: (current.sitelinks || []).map((link) => (link.id === linkId ? { ...link, ...updates } : link))
    }));
  }

  function deleteSeoSitelink(linkId) {
    setSeo((current) => ({
      ...current,
      sitelinks: (current.sitelinks || []).filter((link) => link.id !== linkId)
    }));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function selectArea(area) {
    const selected = sidebarItems.find((item) => item.id === area);
    if (!selected) return;
    setActiveArea(area);
    setActiveTab(selected.firstTab);
  }

  if (session === undefined) {
    return (
      <section className="adminAuthState">
        <div className="panel">
          <h2>Checking admin session</h2>
          <p className="contactText">Preparing secure restaurant controls.</p>
        </div>
      </section>
    );
  }

  if (!session || session.role !== "admin") {
    return (
      <section className="adminAuthState">
        <div className="panel">
          <h2>Admin login required</h2>
          <p className="contactText">Go to Login and sign in as admin to manage this dashboard.</p>
        </div>
      </section>
    );
  }

  if (!brand || !home || !about || !contact || !footer || !jazz || !seo || !menuBoard || !bookingPage || !loginPage || !customerPage) {
    return (
      <section className="adminAuthState">
        <div className="panel">
          <h2>Loading dashboard</h2>
          <p className="contactText">Preparing admin controls.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="adminShell" data-admin-theme={resolvedTheme}>
      {status.type && status.message ? (
        <div className={`adminToast ${status.type}`} role="status">
          {status.message}
        </div>
      ) : null}
      <aside className="adminSidebar">
        <div className="adminBrandBlock">
          <img src={brand.logoImage || brandImage} alt="" />
          <div>
            <strong>{brand.name}</strong>
            <span>Admin console</span>
          </div>
        </div>
        <nav className="adminSideNav adminPrimaryNav" aria-label="Admin sections">
          <p className="adminNavCaption">Workspace</p>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeArea === item.id ? "active" : ""}
                key={item.id}
                onClick={() => selectArea(item.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
                {item.id === "feedback" && totals.newFeedback ? <small>{totals.newFeedback}</small> : null}
              </button>
            );
          })}
        </nav>
        <div className="adminSidebarFooter">
          <span>Signed in</span>
          <strong>{session.name}</strong>
          <button className="button buttonLine compact" type="button" onClick={logout}>
            <LogOut aria-hidden="true" size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="adminMain">
        <header className="adminTopbar">
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h1>{sidebarItems.find((item) => item.id === activeArea)?.label}</h1>
            <p>Manage the restaurant website, service operations, reports, and customer feedback.</p>
          </div>
          <div className="adminTopActions">
            <button className="button buttonLine compact" type="button" onClick={loadDashboard}>
              <RefreshCw aria-hidden="true" size={16} /> Refresh
            </button>
            <a className="button buttonDark compact" href="/" target="_blank">
              <ExternalLink aria-hidden="true" size={16} /> View Site
            </a>
            <label className="adminThemeSelect">
              <Monitor aria-hidden="true" size={17} />
              <select aria-label="Admin color theme" value={themeMode} onChange={(event) => setThemeMode(event.target.value)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </label>
          </div>
        </header>

        {activeArea === "website" || activeArea === "operations" ? (
          <div className="adminSectionTabs" aria-label={`${activeArea} sections`}>
            {(activeArea === "website" ? websiteTabs : operationTabs).map(([id, label]) => (
              <button className={activeTab === id ? "active" : ""} key={id} onClick={() => setActiveTab(id)} type="button">
                <span>{label}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="adminContentHeader">
          <div>
            <p className="eyebrow">Current section</p>
            <h2>{navItems.find(([id]) => id === activeTab)?.[1]}</h2>
          </div>
          {status.message && !status.type ? <p className="adminStatus">{status.message}</p> : null}
        </div>

      {activeTab === "seo" ? (
        <form className="adminStack" onSubmit={saveSeoSettings}>
          <div className="panel googleSearchEditorPanel">
            <div className="adminPanelHead">
              <div>
                <p className="eyebrow">Main Google result</p>
                <h2>What customers see first</h2>
                <p className="adminHelpText">Edit the blue Google title, website URL, and short description. Google may rewrite it, but these fields guide Search.</p>
              </div>
            </div>
            <div className="seoEditorSplit">
              <div className="adminSeoGrid">
                <TextInput label="Google title" value={seo.title} onChange={(value) => setSeo({ ...seo, title: value })} />
                <TextInput label="Website URL" value={seo.siteUrl} onChange={(value) => setSeo({ ...seo, siteUrl: value })} />
                <TextInput label="Browser tab name" value={seo.tabTitle} onChange={(value) => setSeo({ ...seo, tabTitle: value })} />
                <TextInput label="Google description" textarea value={seo.description} onChange={(value) => setSeo({ ...seo, description: value })} />
                <TextInput label="Menu link for Google/QR" value={seo.menuUrl} onChange={(value) => setSeo({ ...seo, menuUrl: value })} />
                <TextInput label="Keywords" value={seo.keywords} onChange={(value) => setSeo({ ...seo, keywords: value })} />
              </div>
              <div className="seoPreviewPanel">
                <p className="eyebrow">Live preview</p>
                <SeoPreview siteUrl={seoSiteUrl} title={seo.title} description={seo.description} />
                <p className="adminHelpText">Keep the URL as https://httpemrakelhouse.com. Avoid old brand phrases if you do not want Google to show them.</p>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="adminPanelHead">
              <div>
                <p className="eyebrow">Business profile details</p>
                <h2>Restaurant information for Google</h2>
                <p className="adminHelpText">These fields feed structured data so Google connects the website with the restaurant profile.</p>
              </div>
            </div>
            <div className="adminSeoGrid">
              <TextInput label="Business name" value={seo.schemaName} onChange={(value) => setSeo({ ...seo, schemaName: value })} />
              <TextInput label="Business type" value={seo.schemaType} onChange={(value) => setSeo({ ...seo, schemaType: value })} />
              <TextInput label="Cuisine / services" value={seo.cuisine} onChange={(value) => setSeo({ ...seo, cuisine: value })} />
              <TextInput label="Price range" value={seo.priceRange} onChange={(value) => setSeo({ ...seo, priceRange: value })} />
              <TextInput label="Business description" textarea value={seo.schemaDescription} onChange={(value) => setSeo({ ...seo, schemaDescription: value })} />
              <TextInput label="Social/profile URLs, one or comma separated" textarea value={seo.sameAs} onChange={(value) => setSeo({ ...seo, sameAs: value })} />
            </div>
          </div>

          <div className="panel googleSearchEditorPanel">
            <div className="adminPanelHead">
              <div>
                <p className="eyebrow">Google sitelinks / sublinks</p>
                <h2>Pages Google can choose from</h2>
                <p className="adminHelpText">These are not separate new pages. They point to existing pages or menu filters like /menu?type=burgers. Google decides what to display.</p>
              </div>
              <button className="button buttonLine compact" type="button" onClick={addSeoSitelink}>
                Add Sitelink
              </button>
            </div>
            <div className="seoSitelinkList adminCompactRows">
              {(seo.sitelinks || []).map((link) => (
                <article className="seoSitelinkCard adminEditableRow" key={link.id}>
                  <div className="seoSitelinkTop">
                    <label className="checkRow">
                      <input
                        checked={link.enabled !== false}
                        onChange={(event) => updateSeoSitelink(link.id, { enabled: event.target.checked })}
                        type="checkbox"
                      />
                      Suggest to Google
                    </label>
                    <label className="checkRow">
                      <input
                        checked={link.noindex === true}
                        onChange={(event) => updateSeoSitelink(link.id, { noindex: event.target.checked })}
                        type="checkbox"
                      />
                      Hide from Google
                    </label>
                  </div>
                  <div className="seoSitelinkFields">
                    <TextInput label="Sublink label" value={link.label} onChange={(value) => updateSeoSitelink(link.id, { label: value })} />
                    <TextInput label="URL path" value={link.url} onChange={(value) => updateSeoSitelink(link.id, { url: value })} />
                    <TextInput label="Google title" value={link.title} onChange={(value) => updateSeoSitelink(link.id, { title: value })} />
                    <TextInput label="Google description" textarea value={link.description} onChange={(value) => updateSeoSitelink(link.id, { description: value })} />
                  </div>
                  <SeoPreview siteUrl={seoSiteUrl} path={link.url} title={link.title || link.label} description={link.description} />
                  <button className="button buttonLine compact dangerText" type="button" onClick={() => deleteSeoSitelink(link.id)}>
                    Delete Sitelink
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="adminPanelHead">
              <div>
                <p className="eyebrow">Search Console helper</p>
                <h2>Copy these URLs after saving</h2>
                <p className="adminHelpText">Use these in Google Search Console URL Inspection to request indexing after changes deploy.</p>
              </div>
            </div>
            <div className="adminSeoGrid">
              <TextInput label="Sitemap URL" value={seo.sitemapUrl || displayUrl(seoSiteUrl, "/sitemap.xml")} onChange={(value) => setSeo({ ...seo, sitemapUrl: value })} />
              <TextInput label="Robots URL" value={seo.robotsUrl || displayUrl(seoSiteUrl, "/robots.txt")} onChange={(value) => setSeo({ ...seo, robotsUrl: value })} />
              <TextInput label="Pages to request indexing" textarea value={seoSearchConsoleUrls} onChange={(value) => setSeo({ ...seo, searchConsoleUrls: value })} />
            </div>
          </div>

          <div className="panel">
            <div className="adminPanelHead">
              <div>
                <p className="eyebrow">Images and advanced options</p>
                <h2>Logo, icons, and schema switches</h2>
              </div>
            </div>
            <div className="adminSeoGrid">
              <ImageControl label="Browser tab favicon" value={seo.favicon} onChange={(value) => setSeo({ ...seo, favicon: value })} onUpload={uploadAdminImage} />
              <ImageControl label="Apple / mobile tab icon" value={seo.appleIcon} onChange={(value) => setSeo({ ...seo, appleIcon: value })} onUpload={uploadAdminImage} />
              <ImageControl label="Google preview image" value={seo.image} onChange={(value) => setSeo({ ...seo, image: value })} onUpload={uploadAdminImage} />
              <ImageControl label="Business logo" value={seo.logo} onChange={(value) => setSeo({ ...seo, logo: value })} onUpload={uploadAdminImage} />
            </div>
            <label className="checkRow">
              <input
                checked={Boolean(seo.searchActionEnabled)}
                onChange={(event) => setSeo({ ...seo, searchActionEnabled: event.target.checked })}
                type="checkbox"
              />
              Add Google sitelink search box schema
            </label>
          </div>

          <div className="seoStickySave">
            <span>{enabledSeoLinks.length} Google sublinks enabled</span>
            <button className="button buttonGold" type="submit">
              Save Google SEO
            </button>
          </div>
        </form>
      ) : null}

      {activeTab === "home" ? (
        <form className="adminForm" onSubmit={saveSettings}>
          <div className="panel">
            <h2>Brand</h2>
            <TextInput label="Name" value={brand.name} onChange={(value) => setBrand({ ...brand, name: value })} />
            <TextInput
              label="Subtitle"
              value={brand.subtitle}
              onChange={(value) => setBrand({ ...brand, subtitle: value })}
            />
            <ImageControl
              label="Header logo"
              value={brand.logoImage}
              onChange={(value) => setBrand({ ...brand, logoImage: value })}
              onUpload={uploadAdminImage}
            />
            <TextInput label="Phone" value={brand.phone} onChange={(value) => setBrand({ ...brand, phone: value })} />
            <TextInput label="Email" value={brand.email} onChange={(value) => setBrand({ ...brand, email: value })} />
            <TextInput
              label="Address"
              value={brand.address}
              onChange={(value) => setBrand({ ...brand, address: value })}
            />
            <TextInput label="Hours" value={brand.hours} onChange={(value) => setBrand({ ...brand, hours: value })} />
            <TextInput label="Support bar label" value={brand.supportLabel} onChange={(value) => setBrand({ ...brand, supportLabel: value })} />
            <TextInput
              label="Header booking button"
              value={brand.headerBookingLabel}
              onChange={(value) => setBrand({ ...brand, headerBookingLabel: value })}
            />
            <TextInput
              label="Booking dropdown eyebrow"
              value={brand.bookingDropdownEyebrow}
              onChange={(value) => setBrand({ ...brand, bookingDropdownEyebrow: value })}
            />
            <TextInput
              label="Booking call button"
              value={brand.bookingDropdownAction}
              onChange={(value) => setBrand({ ...brand, bookingDropdownAction: value })}
            />
            <TextInput
              label="Booking dropdown text"
              textarea
              value={brand.bookingDropdownText}
              onChange={(value) => setBrand({ ...brand, bookingDropdownText: value })}
            />
            <div className="adminPanelHead">
              <div>
                <p className="eyebrow">Header links</p>
                <h2>Navigation</h2>
              </div>
              <button className="button buttonLine compact" type="button" onClick={addHeaderNavLink}>
                Add Link
              </button>
            </div>
            <div className="footerSocialEditor">
              {(brand.navLinks || []).map((link) => (
                <article className="footerSocialEditorCard" key={link.id}>
                  <label className="checkRow">
                    <input
                      checked={link.enabled !== false}
                      onChange={(event) => updateHeaderNavLink(link.id, { enabled: event.target.checked })}
                      type="checkbox"
                    />
                    Show in header
                  </label>
                  <div className="footerSocialEditorFields">
                    <TextInput label="Label" value={link.label} onChange={(value) => updateHeaderNavLink(link.id, { label: value })} />
                    <TextInput label="URL" value={link.url} onChange={(value) => updateHeaderNavLink(link.id, { url: value })} />
                  </div>
                  <button className="button buttonLine compact" type="button" onClick={() => deleteHeaderNavLink(link.id)}>
                    Delete Link
                  </button>
                </article>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2>Homepage</h2>
            <TextInput
              label="Header kicker"
              value={home.headerKicker}
              onChange={(value) => setHome({ ...home, headerKicker: value })}
            />
            <TextInput
              label="Header title"
              value={home.headerTitle}
              onChange={(value) => setHome({ ...home, headerTitle: value })}
            />
            <TextInput label="Eyebrow" value={home.eyebrow} onChange={(value) => setHome({ ...home, eyebrow: value })} />
            <TextInput label="Headline" value={home.headline} onChange={(value) => setHome({ ...home, headline: value })} />
            <TextInput
              label="Description"
              textarea
              value={home.description}
              onChange={(value) => setHome({ ...home, description: value })}
            />
            <ImageControl
              label="Hero image"
              value={home.heroImage}
              onChange={(value) => setHome({ ...home, heroImage: value })}
              onUpload={uploadAdminImage}
            />
            <TextInput
              label="Primary button"
              value={home.primaryAction}
              onChange={(value) => setHome({ ...home, primaryAction: value })}
            />
            <TextInput
              label="Secondary button"
              value={home.secondaryAction}
              onChange={(value) => setHome({ ...home, secondaryAction: value })}
            />
            <TextInput
              label="Detail page back label"
              value={home.backHomeLabel}
              onChange={(value) => setHome({ ...home, backHomeLabel: value })}
            />
          </div>
          <div className="panel">
            <h2>Public Section Text</h2>
            <TextInput
              label="Menu page eyebrow"
              value={home.menuPageEyebrow}
              onChange={(value) => setHome({ ...home, menuPageEyebrow: value })}
            />
            <TextInput
              label="Menu page title"
              value={home.menuPageTitle}
              onChange={(value) => setHome({ ...home, menuPageTitle: value })}
            />
            <TextInput
              label="Menu page description"
              textarea
              value={home.menuPageDescription}
              onChange={(value) => setHome({ ...home, menuPageDescription: value })}
            />
            <ImageControl
              label="Menu page image"
              value={home.menuPageImage}
              onChange={(value) => setHome({ ...home, menuPageImage: value })}
              onUpload={uploadAdminImage}
            />
            <ImageControl
              label="Menu preview image"
              value={home.menuPreviewImage}
              onChange={(value) => setHome({ ...home, menuPreviewImage: value })}
              onUpload={uploadAdminImage}
            />
            <TextInput
              label="Menu view more label"
              value={home.menuViewMoreLabel}
              onChange={(value) => setHome({ ...home, menuViewMoreLabel: value })}
            />
            <TextInput
              label="Gallery eyebrow"
              value={home.galleryEyebrow}
              onChange={(value) => setHome({ ...home, galleryEyebrow: value })}
            />
            <TextInput
              label="Gallery headline"
              value={home.galleryHeadline}
              onChange={(value) => setHome({ ...home, galleryHeadline: value })}
            />
            <TextInput
              label="Gallery description"
              textarea
              value={home.galleryDescription}
              onChange={(value) => setHome({ ...home, galleryDescription: value })}
            />
            <ImageControl
              label="Gallery preview image"
              value={home.galleryPreviewImage}
              onChange={(value) => setHome({ ...home, galleryPreviewImage: value })}
              onUpload={uploadAdminImage}
            />
            <TextInput
              label="Gallery view more label"
              value={home.galleryViewMoreLabel}
              onChange={(value) => setHome({ ...home, galleryViewMoreLabel: value })}
            />
            <ImageControl
              label="About preview image"
              value={home.aboutPreviewImage}
              onChange={(value) => setHome({ ...home, aboutPreviewImage: value })}
              onUpload={uploadAdminImage}
            />
            <TextInput
              label="About view more label"
              value={home.aboutViewMoreLabel}
              onChange={(value) => setHome({ ...home, aboutViewMoreLabel: value })}
            />
            <ImageControl
              label="Contact preview image"
              value={home.contactPreviewImage}
              onChange={(value) => setHome({ ...home, contactPreviewImage: value })}
              onUpload={uploadAdminImage}
            />
            <TextInput
              label="Contact view more label"
              value={home.contactViewMoreLabel}
              onChange={(value) => setHome({ ...home, contactViewMoreLabel: value })}
            />
          </div>
          <div className="panel">
            <h2>Menu Board Text</h2>
            <ImageControl
              label="Menu board logo"
              value={menuBoard.logoImage}
              onChange={(value) => setMenuBoard({ ...menuBoard, logoImage: value })}
              onUpload={uploadAdminImage}
            />
            <TextInput label="Brand label" value={menuBoard.brandLabel} onChange={(value) => setMenuBoard({ ...menuBoard, brandLabel: value })} />
            <TextInput label="Subtitle" value={menuBoard.subtitle} onChange={(value) => setMenuBoard({ ...menuBoard, subtitle: value })} />
            <TextInput label="Title" value={menuBoard.title} onChange={(value) => setMenuBoard({ ...menuBoard, title: value })} />
            <TextInput label="Food tagline" value={menuBoard.foodTagline} onChange={(value) => setMenuBoard({ ...menuBoard, foodTagline: value })} />
            <TextInput label="Food brand" value={menuBoard.foodBrand} onChange={(value) => setMenuBoard({ ...menuBoard, foodBrand: value })} />
            <TextInput label="Food title" value={menuBoard.foodTitle} onChange={(value) => setMenuBoard({ ...menuBoard, foodTitle: value })} />
            <TextInput label="Price suffix" value={menuBoard.priceSuffix} onChange={(value) => setMenuBoard({ ...menuBoard, priceSuffix: value })} />
            <TextInput label="Empty food text" value={menuBoard.emptyFoodText} onChange={(value) => setMenuBoard({ ...menuBoard, emptyFoodText: value })} />
            <TextInput label="Empty drink text" value={menuBoard.emptyDrinkText} onChange={(value) => setMenuBoard({ ...menuBoard, emptyDrinkText: value })} />
            <TextInput label="Empty section text" value={menuBoard.emptySectionText} onChange={(value) => setMenuBoard({ ...menuBoard, emptySectionText: value })} />
          </div>
          <div className="panel">
            <h2>Book Table Page</h2>
            <TextInput label="Back label" value={bookingPage.backLabel} onChange={(value) => setBookingPage({ ...bookingPage, backLabel: value })} />
            <TextInput label="Eyebrow" value={bookingPage.eyebrow} onChange={(value) => setBookingPage({ ...bookingPage, eyebrow: value })} />
            <TextInput label="Headline" value={bookingPage.headline} onChange={(value) => setBookingPage({ ...bookingPage, headline: value })} />
            <TextInput label="Description" textarea value={bookingPage.description} onChange={(value) => setBookingPage({ ...bookingPage, description: value })} />
            <TextInput label="Panel title" value={bookingPage.panelTitle} onChange={(value) => setBookingPage({ ...bookingPage, panelTitle: value })} />
            <TextInput label="Panel text" textarea value={bookingPage.panelText} onChange={(value) => setBookingPage({ ...bookingPage, panelText: value })} />
            <TextInput label="Submit button" value={bookingPage.submitLabel} onChange={(value) => setBookingPage({ ...bookingPage, submitLabel: value })} />
            <TextInput label="Sending message" value={bookingPage.sendingMessage} onChange={(value) => setBookingPage({ ...bookingPage, sendingMessage: value })} />
          </div>
          <div className="panel">
            <h2>Login Page</h2>
            <TextInput label="Eyebrow" value={loginPage.eyebrow} onChange={(value) => setLoginPage({ ...loginPage, eyebrow: value })} />
            <TextInput label="Headline" value={loginPage.headline} onChange={(value) => setLoginPage({ ...loginPage, headline: value })} />
            <TextInput label="Description" textarea value={loginPage.description} onChange={(value) => setLoginPage({ ...loginPage, description: value })} />
            <TextInput label="Login panel title" value={loginPage.loginPanelTitle} onChange={(value) => setLoginPage({ ...loginPage, loginPanelTitle: value })} />
            <TextInput label="Register panel title" value={loginPage.registerPanelTitle} onChange={(value) => setLoginPage({ ...loginPage, registerPanelTitle: value })} />
            <TextInput label="Panel text" textarea value={loginPage.panelText} onChange={(value) => setLoginPage({ ...loginPage, panelText: value })} />
            <TextInput label="Login tab" value={loginPage.loginTabLabel} onChange={(value) => setLoginPage({ ...loginPage, loginTabLabel: value })} />
            <TextInput label="Register tab" value={loginPage.registerTabLabel} onChange={(value) => setLoginPage({ ...loginPage, registerTabLabel: value })} />
            <TextInput label="Login button" value={loginPage.loginButtonLabel} onChange={(value) => setLoginPage({ ...loginPage, loginButtonLabel: value })} />
            <TextInput label="Register button" value={loginPage.registerButtonLabel} onChange={(value) => setLoginPage({ ...loginPage, registerButtonLabel: value })} />
          </div>
          <div className="panel">
            <h2>Customer Page</h2>
            <TextInput label="Eyebrow" value={customerPage.eyebrow} onChange={(value) => setCustomerPage({ ...customerPage, eyebrow: value })} />
            <TextInput label="Headline" value={customerPage.headline} onChange={(value) => setCustomerPage({ ...customerPage, headline: value })} />
            <TextInput label="Description" textarea value={customerPage.description} onChange={(value) => setCustomerPage({ ...customerPage, description: value })} />
            <TextInput label="Welcome prefix" value={customerPage.welcomePrefix} onChange={(value) => setCustomerPage({ ...customerPage, welcomePrefix: value })} />
            <TextInput label="Login required title" value={customerPage.loginRequiredTitle} onChange={(value) => setCustomerPage({ ...customerPage, loginRequiredTitle: value })} />
            <TextInput label="Panel text" textarea value={customerPage.panelText} onChange={(value) => setCustomerPage({ ...customerPage, panelText: value })} />
            <TextInput label="Order button" value={customerPage.orderButtonLabel} onChange={(value) => setCustomerPage({ ...customerPage, orderButtonLabel: value })} />
            <TextInput label="Book button" value={customerPage.bookButtonLabel} onChange={(value) => setCustomerPage({ ...customerPage, bookButtonLabel: value })} />
            <TextInput label="Logout button" value={customerPage.logoutButtonLabel} onChange={(value) => setCustomerPage({ ...customerPage, logoutButtonLabel: value })} />
          </div>
          <button className="button buttonGold" type="submit">
            Save Homepage
          </button>
        </form>
      ) : null}

      {activeTab === "about" ? (
        <form className="adminForm" onSubmit={saveSettings}>
          <div className="panel">
            <h2>About Page</h2>
            <TextInput label="Eyebrow" value={about.eyebrow} onChange={(value) => setAbout({ ...about, eyebrow: value })} />
            <TextInput label="Headline" value={about.headline} onChange={(value) => setAbout({ ...about, headline: value })} />
            <TextInput
              label="Description"
              textarea
              value={about.description}
              onChange={(value) => setAbout({ ...about, description: value })}
            />
            <TextInput
              label="Story eyebrow"
              value={about.storyEyebrow}
              onChange={(value) => setAbout({ ...about, storyEyebrow: value })}
            />
            <TextInput
              label="Story headline"
              value={about.storyHeadline}
              onChange={(value) => setAbout({ ...about, storyHeadline: value })}
            />
            <TextInput
              label="Story description"
              textarea
              value={about.storyDescription}
              onChange={(value) => setAbout({ ...about, storyDescription: value })}
            />
            <TextInput
              label="Second block eyebrow"
              value={about.secondaryEyebrow}
              onChange={(value) => setAbout({ ...about, secondaryEyebrow: value })}
            />
            <TextInput
              label="Second block headline"
              value={about.secondaryHeadline}
              onChange={(value) => setAbout({ ...about, secondaryHeadline: value })}
            />
            <TextInput
              label="Second block description"
              textarea
              value={about.secondaryDescription}
              onChange={(value) => setAbout({ ...about, secondaryDescription: value })}
            />
          </div>
          <div className="panel">
            <h2>About Images</h2>
            <ImageControl
              label="Main image"
              value={about.image}
              onChange={(value) => setAbout({ ...about, image: value })}
              onUpload={uploadAdminImage}
            />
            <ImageControl
              label="Secondary image"
              value={about.secondaryImage}
              onChange={(value) => setAbout({ ...about, secondaryImage: value })}
              onUpload={uploadAdminImage}
            />
          </div>
          <button className="button buttonGold" type="submit">
            Save About Page
          </button>
        </form>
      ) : null}

      {activeTab === "contact" ? (
        <form className="adminForm" onSubmit={saveSettings}>
          <div className="panel">
            <h2>Contact Page</h2>
            <TextInput label="Eyebrow" value={contact.eyebrow} onChange={(value) => setContact({ ...contact, eyebrow: value })} />
            <TextInput
              label="Headline"
              value={contact.headline}
              onChange={(value) => setContact({ ...contact, headline: value })}
            />
            <TextInput
              label="Description"
              textarea
              value={contact.description}
              onChange={(value) => setContact({ ...contact, description: value })}
            />
            <TextInput
              label="Info eyebrow"
              value={contact.infoEyebrow}
              onChange={(value) => setContact({ ...contact, infoEyebrow: value })}
            />
            <TextInput
              label="Form eyebrow"
              value={contact.formEyebrow}
              onChange={(value) => setContact({ ...contact, formEyebrow: value })}
            />
            <TextInput
              label="Form headline"
              value={contact.formHeadline}
              onChange={(value) => setContact({ ...contact, formHeadline: value })}
            />
          </div>
          <div className="panel">
            <h2>Contact Image</h2>
            <ImageControl
              label="Contact image"
              value={contact.image}
              onChange={(value) => setContact({ ...contact, image: value })}
              onUpload={uploadAdminImage}
            />
          </div>
          <button className="button buttonGold" type="submit">
            Save Contact Page
          </button>
        </form>
      ) : null}

      {activeTab === "footer" ? (
        <form className="adminForm" onSubmit={saveSettings}>
          <div className="panel">
            <h2>Footer Content</h2>
            <ImageControl
              label="Footer logo"
              value={footer.logoImage}
              onChange={(value) => setFooter({ ...footer, logoImage: value })}
              onUpload={uploadAdminImage}
            />
            <TextInput
              label="Footer description"
              textarea
              value={footer.description}
              onChange={(value) => setFooter({ ...footer, description: value })}
            />
            <TextInput
              label="Visit heading"
              value={footer.visitHeading}
              onChange={(value) => setFooter({ ...footer, visitHeading: value })}
            />
            <TextInput
              label="Contact heading"
              value={footer.contactHeading}
              onChange={(value) => setFooter({ ...footer, contactHeading: value })}
            />
            <TextInput
              label="Quick links heading"
              value={footer.quickLinksHeading}
              onChange={(value) => setFooter({ ...footer, quickLinksHeading: value })}
            />
            <TextInput
              label="Social heading"
              value={footer.socialHeading}
              onChange={(value) => setFooter({ ...footer, socialHeading: value })}
            />
            <TextInput
              label="Book table footer link"
              value={footer.bookTableLabel}
              onChange={(value) => setFooter({ ...footer, bookTableLabel: value })}
            />
            <TextInput
              label="Copyright"
              value={footer.copyright}
              onChange={(value) => setFooter({ ...footer, copyright: value })}
            />
            <TextInput label="Credit note" value={footer.note} onChange={(value) => setFooter({ ...footer, note: value })} />
            <TextInput label="Credit link URL" value={footer.noteUrl} onChange={(value) => setFooter({ ...footer, noteUrl: value })} />
            <label className="checkRow">
              <input
                checked={footer.noteLinkEnabled !== false}
                onChange={(event) => setFooter({ ...footer, noteLinkEnabled: event.target.checked })}
                type="checkbox"
              />
              Make credit note clickable
            </label>
          </div>
          <div className="panel">
            <h2>Brand Contact</h2>
            <TextInput label="Phone" value={brand.phone} onChange={(value) => setBrand({ ...brand, phone: value })} />
            <TextInput label="Email" value={brand.email} onChange={(value) => setBrand({ ...brand, email: value })} />
            <TextInput
              label="Address"
              value={brand.address}
              onChange={(value) => setBrand({ ...brand, address: value })}
            />
            <TextInput label="Hours" value={brand.hours} onChange={(value) => setBrand({ ...brand, hours: value })} />
          </div>
          <div className="panel footerSocialEditorPanel">
            <div className="adminPanelHead">
              <div>
                <p className="eyebrow">Footer quick links</p>
                <h2>Simple footer links</h2>
              </div>
              <button className="button buttonLine compact" type="button" onClick={addFooterQuickLink}>
                Add Quick Link
              </button>
            </div>
            <div className="adminCompactRows">
              {(footer.quickLinks || []).map((link) => (
                <article className="adminEditableRow" key={link.id}>
                  <label className="checkRow">
                    <input
                      checked={link.enabled !== false}
                      onChange={(event) => updateFooterQuickLink(link.id, { enabled: event.target.checked })}
                      type="checkbox"
                    />
                    Show in footer
                  </label>
                  <div className="footerSocialEditorFields">
                    <TextInput label="Label" value={link.label} onChange={(value) => updateFooterQuickLink(link.id, { label: value })} />
                    <TextInput label="URL" value={link.url} onChange={(value) => updateFooterQuickLink(link.id, { url: value })} />
                  </div>
                  <button className="button buttonLine compact dangerText" type="button" onClick={() => deleteFooterQuickLink(link.id)}>
                    Delete Quick Link
                  </button>
                </article>
              ))}
            </div>
          </div>
          <div className="panel footerSocialEditorPanel">
            <div className="adminPanelHead">
              <div>
                <p className="eyebrow">Footer social media</p>
                <h2>Names, links, and logos</h2>
              </div>
              <button className="button buttonLine compact" type="button" onClick={addSocialLink}>
                Add Social Link
              </button>
            </div>
            <div className="adminCompactRows">
              {(footer.socialLinks || []).map((link) => (
                <article className="adminEditableRow" key={link.id}>
                  <label className="checkRow">
                    <input
                      checked={Boolean(link.enabled)}
                      onChange={(event) => updateSocialLink(link.id, { enabled: event.target.checked })}
                      type="checkbox"
                    />
                    Show in footer
                  </label>
                  <div className="footerSocialEditorFields">
                    <TextInput
                      label="Name"
                      value={link.name}
                      onChange={(value) => updateSocialLink(link.id, { name: value })}
                    />
                    <TextInput
                      label="Link"
                      value={link.url}
                      onChange={(value) => updateSocialLink(link.id, { url: value })}
                    />
                    <ImageControl
                      label="Logo image"
                      value={link.image}
                      onChange={(value) => updateSocialLink(link.id, { image: value })}
                      onUpload={uploadAdminImage}
                    />
                  </div>
                  <button className="button buttonLine compact" type="button" onClick={() => deleteSocialLink(link.id)}>
                    Delete Social Link
                  </button>
                </article>
              ))}
            </div>
          </div>
          <button className="button buttonGold" type="submit">
            Save Footer
          </button>
        </form>
      ) : null}

      {activeTab === "jazz" ? (
        <form className="adminForm" onSubmit={saveSettings}>
          <div className="panel">
            <h2>Jazz Section</h2>
            <label className="checkRow">
              <input
                checked={Boolean(jazz.enabled)}
                onChange={(event) => setJazz({ ...jazz, enabled: event.target.checked })}
                type="checkbox"
              />
              Show section on home page
            </label>
            <TextInput label="Eyebrow" value={jazz.eyebrow} onChange={(value) => setJazz({ ...jazz, eyebrow: value })} />
            <TextInput label="Section name" value={jazz.title} onChange={(value) => setJazz({ ...jazz, title: value })} />
            <TextInput
              label="Description"
              textarea
              value={jazz.description}
              onChange={(value) => setJazz({ ...jazz, description: value })}
            />
          </div>
          <div className="panel">
            <h2>Date and Image</h2>
            <TextInput label="Date" value={jazz.date} onChange={(value) => setJazz({ ...jazz, date: value })} />
            <TextInput label="Time" value={jazz.time} onChange={(value) => setJazz({ ...jazz, time: value })} />
            <TextInput
              label="Action label"
              value={jazz.actionLabel}
              onChange={(value) => setJazz({ ...jazz, actionLabel: value })}
            />
            <ImageControl
              label="Jazz image"
              value={jazz.image}
              onChange={(value) => setJazz({ ...jazz, image: value })}
              onUpload={uploadAdminImage}
            />
          </div>
          <button className="button buttonGold" type="submit">
            Save Jazz Section
          </button>
        </form>
      ) : null}

      {activeTab === "menu" ? (
        <div className="adminStack menuCatalogueWorkspace">
          {!selectedMenuSectionData ? (
            <>
              <section className="panel menuCatalogueHeader">
                <div>
                  <p className="eyebrow">Menu catalogue</p>
                  <h2>Food and drink sections</h2>
                  <p className="contactText">Open a section to manage its products, prices, photos, and visibility.</p>
                </div>
                <div className="menuCatalogueActions">
                  <div className="menuSideSwitch" aria-label="Menu side">
                    <button className={selectedMenuSide === "food" ? "active" : ""} onClick={() => setSelectedMenuSide("food")} type="button">Food</button>
                    <button className={selectedMenuSide === "drinks" ? "active" : ""} onClick={() => setSelectedMenuSide("drinks")} type="button">Drinks</button>
                  </div>
                  <button className="button buttonDark compact" type="button" onClick={() => openSectionModal()}>
                    <Plus aria-hidden="true" size={17} /> Add Section
                  </button>
                </div>
                <label className="menuCatalogueSearch">
                  Search sections
                  <input value={sectionSearch} onChange={(event) => setSectionSearch(event.target.value)} placeholder="Search by section or product" />
                </label>
              </section>

              <section className="menuCatalogueGrid">
                {filteredSimpleMenuSections.length ? filteredSimpleMenuSections.map((section) => {
                  const sectionItems = getCategoryItems(section.id);
                  const activeItems = sectionItems.filter((item) => item.isActive !== false).length;
                  return (
                    <article className="menuCatalogueCard" key={section.id}>
                      <img src={section.image || brandImage} alt="" />
                      <div className="menuCatalogueCardBody">
                        <div className="menuCatalogueCardTitle">
                          <div>
                            <h3>{section.name}</h3>
                            <p>{section.description || "Restaurant menu section"}</p>
                          </div>
                          <span className={section.isActive === false ? "hidden" : ""}>{section.isActive === false ? "Hidden" : "Active"}</span>
                        </div>
                        <div className="menuCatalogueStats">
                          <span>Total products <strong>{sectionItems.length}</strong></span>
                          <span>Visible <strong>{activeItems}</strong></span>
                        </div>
                        <button className="menuSeeMoreButton" type="button" onClick={() => {
                          setSelectedMenuSection(section.id);
                          setItemSearch("");
                        }}>
                          See More
                        </button>
                        <div className="menuCatalogueCardTools">
                          <button type="button" onClick={() => openSectionModal(section)} aria-label={`Edit ${section.name}`}>
                            <Pencil aria-hidden="true" size={17} />
                          </button>
                          <button className="danger" type="button" onClick={() => removeSection(section)} aria-label={`Delete ${section.name}`}>
                            <Trash2 aria-hidden="true" size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="panel emptyAdminState">
                    <p className="eyebrow">No sections</p>
                    <h2>Add a {selectedMenuSide === "drinks" ? "drink" : "food"} section to begin.</h2>
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="panel menuProductPanel">
              <div className="menuProductHeader">
                <button className="menuBackButton" type="button" onClick={() => setSelectedMenuSection("")}>
                  <ChevronLeft aria-hidden="true" size={18} /> All sections
                </button>
                <div>
                  <p className="eyebrow">Product list</p>
                  <h2>{selectedMenuSectionData.name}</h2>
                  <p>{selectedMenuSectionData.description}</p>
                </div>
                <div className="menuProductHeaderActions">
                  <button className="button buttonLine compact" type="button" onClick={() => openSectionModal(selectedMenuSectionData)}>
                    <Pencil aria-hidden="true" size={16} /> Edit Section
                  </button>
                  <button className="button buttonDark compact" type="button" onClick={() => openProductModal(selectedMenuSectionData.id)}>
                    <Plus aria-hidden="true" size={17} /> Add Product
                  </button>
                </div>
              </div>
              <div className="menuProductToolbar">
                <label>
                  Search products
                  <input value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search name, description, or price" />
                </label>
                <span>{selectedMenuProducts.length} products</span>
              </div>
              <div className="menuProductTableWrap">
                <table className="menuProductTable">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMenuProducts.length ? selectedMenuProducts.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="menuProductIdentity">
                            <img src={item.image || selectedMenuSectionData.image || brandImage} alt="" />
                            <span><strong>{item.name}</strong><small>{item.description || "No description"}</small></span>
                          </div>
                        </td>
                        <td><strong>{Number(item.price || 0).toLocaleString()} ETB</strong></td>
                        <td>
                          <button className={`menuStatusPill ${item.isActive === false ? "hidden" : ""}`} type="button" onClick={() => toggleProduct(item)}>
                            {item.isActive === false ? "Hidden" : "Active"}
                          </button>
                        </td>
                        <td>
                          <div className="menuRowActions">
                            <button type="button" onClick={() => openProductModal(selectedMenuSectionData.id, item)} aria-label={`Edit ${item.name}`}>
                              <Pencil aria-hidden="true" size={17} />
                            </button>
                            <button className="danger" type="button" onClick={() => removeProduct(item)} aria-label={`Delete ${item.name}`}>
                              <Trash2 aria-hidden="true" size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="emptyFinanceTable">No products are in this section yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {menuProductModal ? (
            <div className="adminModalBackdrop" role="presentation" onMouseDown={() => setMenuProductModal(null)}>
              <form className="adminModalCard" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitProductModal}>
                <div className="adminModalHeading">
                  <div><p className="eyebrow">{menuProductModal.mode === "edit" ? "Edit product" : "New product"}</p><h2>{menuProductModal.mode === "edit" ? menuProductModal.name : `Add to ${selectedMenuSectionData?.name || "section"}`}</h2></div>
                  <button type="button" onClick={() => setMenuProductModal(null)} aria-label="Close">×</button>
                </div>
                <div className="adminModalFields">
                  <label>Product name<input autoFocus required value={menuProductModal.name} onChange={(event) => setMenuProductModal((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label>Price (ETB)<input min="0" step="0.01" required type="number" value={menuProductModal.price} onChange={(event) => setMenuProductModal((current) => ({ ...current, price: event.target.value }))} /></label>
                  <label className="wideField">Description<textarea value={menuProductModal.description} onChange={(event) => setMenuProductModal((current) => ({ ...current, description: event.target.value }))} /></label>
                  <div className="wideField">
                    <ImageControl label="Product image" value={menuProductModal.image} onChange={(value) => setMenuProductModal((current) => ({ ...current, image: value }))} onUpload={uploadAdminImage} />
                  </div>
                </div>
                <div className="adminModalActions">
                  <button className="button buttonLine" type="button" onClick={() => setMenuProductModal(null)}>Cancel</button>
                  <button className="button buttonDark" type="submit">{menuProductModal.mode === "edit" ? "Save Product" : "Add Product"}</button>
                </div>
              </form>
            </div>
          ) : null}

          {menuSectionModal ? (
            <div className="adminModalBackdrop" role="presentation" onMouseDown={() => setMenuSectionModal(null)}>
              <form className="adminModalCard" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitSectionModal}>
                <div className="adminModalHeading">
                  <div><p className="eyebrow">{menuSectionModal.mode === "edit" ? "Edit section" : "New section"}</p><h2>{menuSectionModal.mode === "edit" ? menuSectionModal.name : "Add menu section"}</h2></div>
                  <button type="button" onClick={() => setMenuSectionModal(null)} aria-label="Close">×</button>
                </div>
                <div className="adminModalFields">
                  <label>Section name<input autoFocus required value={menuSectionModal.name} onChange={(event) => setMenuSectionModal((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label>Menu side<select value={menuSectionModal.menuSide} onChange={(event) => setMenuSectionModal((current) => ({ ...current, menuSide: event.target.value }))}><option value="food">Food</option><option value="drinks">Drinks</option></select></label>
                  <label className="wideField">Description<textarea value={menuSectionModal.description} onChange={(event) => setMenuSectionModal((current) => ({ ...current, description: event.target.value }))} /></label>
                  <div className="wideField">
                    <ImageControl label="Section image" value={menuSectionModal.image} onChange={(value) => setMenuSectionModal((current) => ({ ...current, image: value }))} onUpload={uploadAdminImage} />
                  </div>
                </div>
                <div className="adminModalActions">
                  <button className="button buttonLine" type="button" onClick={() => setMenuSectionModal(null)}>Cancel</button>
                  <button className="button buttonDark" type="submit">{menuSectionModal.mode === "edit" ? "Save Section" : "Add Section"}</button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "gallery" ? (
        <form className="adminStack" onSubmit={saveGallery}>
          <div className="cardGrid">
            {gallery.map((image, index) => (
              <div className="panel" key={image.id}>
                <img className="adminPanelImage" src={image.image || brandImage} alt="" />
                <TextInput
                  label="Title"
                  value={image.title}
                  onChange={(value) =>
                    setGallery((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? { ...item, title: value } : item))
                    )
                  }
                />
                <ImageControl
                  label="Gallery image"
                  value={image.image}
                  onChange={(value) =>
                    setGallery((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? { ...item, image: value } : item))
                    )
                  }
                  onUpload={uploadAdminImage}
                />
                <button className="button buttonLine compact" type="button" onClick={() => deleteGalleryImage(image.id)}>
                  Delete Image
                </button>
              </div>
            ))}
          </div>
          <div className="actions">
            <button className="button buttonLine" type="button" onClick={addGalleryImage}>
              Add Image
            </button>
            <button className="button buttonGold" type="submit">
              Save Gallery
            </button>
          </div>
        </form>
      ) : null}

      {activeTab === "feedback" ? (
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Contact</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>
                    <p>{item.phone || "-"}</p>
                    <p>{item.email || "-"}</p>
                  </td>
                  <td>{item.subject || "Website feedback"}</td>
                  <td>{item.message}</td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</td>
                  <td>
                    <select value={item.status} onChange={(event) => updateFeedback(item.id, event.target.value)}>
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeTab === "finance" ? <FinancePanel /> : null}
      {activeTab === "reports" ? <FinancePanel reportOnly /> : null}
      {activeTab === "orders" ? (
        <div className="adminStack adminOrdersWorkspace">
          <section className="panel adminOrdersHeader">
            <div>
              <p className="eyebrow">Restaurant service</p>
              <h2>Waiter orders</h2>
              <p>Orders remain pending until they are finished and recorded as income, or cancelled with a reason.</p>
            </div>
            <span>{orders.length} total orders</span>
          </section>
          <div className="adminOrderStatusTabs" aria-label="Order status">
            {[
              ["all", "All Orders"],
              ["pending", "Pending"],
              ["finished", "Finished"],
              ["cancelled", "Cancelled"]
            ].map(([id, label]) => (
              <button className={adminOrderFilter === id ? "active" : ""} key={id} onClick={() => setAdminOrderFilter(id)} type="button">
                {label}
                <small>{id === "all" ? orders.length : orders.filter((order) => order.status === id).length}</small>
              </button>
            ))}
          </div>
          <div className="adminTableWrap adminOrderTableWrap">
            <table className="adminTable adminOrderTable">
              <thead>
                <tr>
                  <th>Order / Time</th>
                  <th>Table</th>
                  <th>Items</th>
                  <th>Qty</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders
                  .filter((order) => adminOrderFilter === "all" || order.status === adminOrderFilter)
                  .map((order) => {
                    const lines = order.items || order.order_items || [];
                    const quantity = lines.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                    return (
                      <tr key={order.id}>
                        <td>
                          <strong>#{String(order.id).slice(-6).toUpperCase()}</strong>
                          <small>{order.created_at ? new Date(order.created_at).toLocaleString() : "-"}</small>
                        </td>
                        <td>{order.table_number ? `Table ${order.table_number}` : order.customer_name || "-"}</td>
                        <td><div className="adminOrderItems">{lines.map((item) => <span key={item.id || `${item.name}-${item.quantity}`}>{item.name} <b>×{item.quantity}</b></span>)}</div></td>
                        <td>{quantity}</td>
                        <td className="capitalize">{order.payment_method || "cash"}</td>
                        <td><strong>{Number(order.total_amount || 0).toLocaleString()} ETB</strong></td>
                        <td>
                          <span className={`adminOrderBadge ${order.status}`}>{order.status}</span>
                          {order.status === "cancelled" && order.cancel_reason ? <small>{order.cancel_reason}</small> : null}
                        </td>
                        <td>
                          {order.status === "pending" ? (
                            <div className="adminOrderActions">
                              <button className="finish" type="button" onClick={() => updateOrder(order.id, "finished", { paymentMethod: order.payment_method || "cash" })}>Finish</button>
                              <button className="cancel" type="button" onClick={() => {
                                setAdminCancelOrder(order);
                                setAdminCancelReason("");
                              }}>Cancel</button>
                            </div>
                          ) : <span className="adminLockedOrder">Locked</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {adminCancelOrder ? (
            <div className="adminModalBackdrop" role="presentation" onMouseDown={() => setAdminCancelOrder(null)}>
              <form
                className="adminModalCard"
                onMouseDown={(event) => event.stopPropagation()}
                onSubmit={(event) => {
                  event.preventDefault();
                  updateOrder(adminCancelOrder.id, "cancelled", {
                    cancelReason: adminCancelReason.trim(),
                    paymentMethod: adminCancelOrder.payment_method || "cash"
                  });
                }}
              >
                <div className="adminModalHeading">
                  <div><p className="eyebrow">Cancel order</p><h2>Record the reason</h2></div>
                  <button type="button" onClick={() => setAdminCancelOrder(null)} aria-label="Close">×</button>
                </div>
                <label>
                  Cancellation reason
                  <textarea autoFocus required value={adminCancelReason} onChange={(event) => setAdminCancelReason(event.target.value)} placeholder="Why was this order cancelled?" />
                </label>
                <div className="adminModalActions">
                  <button className="button buttonLine" type="button" onClick={() => setAdminCancelOrder(null)}>Keep order</button>
                  <button className="button buttonDark" disabled={!adminCancelReason.trim()} type="submit">Confirm cancellation</button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
    </section>
  );
}




