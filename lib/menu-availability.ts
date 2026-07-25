export const menuAvailabilityValues = ["available", "coming_soon", "hidden"] as const;

export type MenuAvailability = (typeof menuAvailabilityValues)[number];

type MenuAvailabilityEntry = {
  availabilityStatus?: string;
  availability_status?: string;
  isActive?: boolean;
};

export function menuAvailabilityStatus(
  entry: MenuAvailabilityEntry | null | undefined
): MenuAvailability {
  if (entry?.isActive === false) return "hidden";

  const value = String(
    entry?.availabilityStatus || entry?.availability_status || ""
  ).toLowerCase();

  return menuAvailabilityValues.includes(value as MenuAvailability)
    ? (value as MenuAvailability)
    : "available";
}

export function effectiveSectionAvailability(
  section: (MenuAvailabilityEntry & { parentId?: string }) | null | undefined,
  categories: Array<MenuAvailabilityEntry & { id?: string }> = []
): MenuAvailability {
  const sectionStatus = menuAvailabilityStatus(section);
  if (sectionStatus === "hidden") return "hidden";

  const parent = section?.parentId
    ? categories.find((category) => category.id === section.parentId)
    : null;
  const parentStatus = parent ? menuAvailabilityStatus(parent) : "available";

  if (parentStatus === "hidden") return "hidden";
  if (sectionStatus === "coming_soon" || parentStatus === "coming_soon") {
    return "coming_soon";
  }
  return "available";
}

export function effectiveProductAvailability(
  item: MenuAvailabilityEntry | null | undefined,
  section: (MenuAvailabilityEntry & { parentId?: string }) | null | undefined,
  categories: Array<MenuAvailabilityEntry & { id?: string }> = []
): MenuAvailability {
  const itemStatus = menuAvailabilityStatus(item);
  const sectionStatus = effectiveSectionAvailability(section, categories);

  if (itemStatus === "hidden" || sectionStatus === "hidden") return "hidden";
  if (itemStatus === "coming_soon" || sectionStatus === "coming_soon") {
    return "coming_soon";
  }
  return "available";
}

export function menuAvailabilityLabel(status: MenuAvailability) {
  if (status === "coming_soon") return "Coming Soon";
  if (status === "hidden") return "Hidden";
  return "Available";
}
