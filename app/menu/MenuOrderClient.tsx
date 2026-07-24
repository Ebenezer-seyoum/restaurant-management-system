// @ts-nocheck
"use client";

import { menuBoardSettings } from "@/lib/data";
import { useSearchParams } from "next/navigation";

export default function MenuOrderClient({ categories, defaultSectionImage = "", items, previewLimitItems = 0, menuBoard = menuBoardSettings }) {
  const searchParams = useSearchParams();
  const selectedType = (searchParams.get("type") || "").toLowerCase();
  const topCategories = categories.filter((category) => !category.parentId);
  const childCategories = (parentId) => categories.filter((category) => category.parentId === parentId);
  const categoryItems = (categoryId) => items.filter((item) => item.category === categoryId);
  const boardSections = topCategories
    .flatMap((category) => {
      const children = childCategories(category.id);
      return children.length ? children : [category];
    })
    .map((section) => ({
      ...section,
      items: categoryItems(section.id)
    }));
  const boardColumns = {
    food: boardSections.filter((section) => section.menuSide !== "drinks"),
    drinks: boardSections.filter((section) => section.menuSide === "drinks")
  };
  const selectedSection = boardSections.find((section) => section.id.toLowerCase() === selectedType);
  const visibleColumns = selectedSection
    ? {
        food: selectedSection.menuSide === "drinks" ? [] : [selectedSection],
        drinks: selectedSection.menuSide === "drinks" ? [selectedSection] : []
      }
    : selectedType === "drinks"
      ? { food: [], drinks: boardColumns.drinks }
      : selectedType === "food"
        ? { food: boardColumns.food, drinks: [] }
        : boardColumns;
  const renderSection = (section) => {
    const sectionImage = section.image || defaultSectionImage;

    return (
      <article className="menuBoardSection" key={section.id}>
        {sectionImage ? <img className="menuBoardSectionImage" src={sectionImage} alt="" /> : null}
        <div>
          <h3>{section.name}</h3>
          {section.items.length ? (
            section.items.slice(0, previewLimitItems || 10).map((item) => (
              <p key={item.id}>
                <span>{item.name}</span>
                <i />
                <strong>{item.price} {menuBoard.priceSuffix || "birr"}</strong>
              </p>
            ))
          ) : (
            <p className="menuBoardSectionEmpty">{menuBoard.emptySectionText || "Items coming soon."}</p>
          )}
        </div>
      </article>
    );
  };

  return (
      <section className="menuBoardShowcase scanMenuPage">
        <div className="menuBoardDynamic">
          <div className="menuBoardTitle">
            <img src={menuBoard.logoImage || "/logo.png"} alt="" />
            <p>{menuBoard.brandLabel || "EMRAKEL"}</p>
            <span>{menuBoard.subtitle || "Burger, Pizza & Cocktail House"}</span>
            <h2>{menuBoard.title || "Menu"}</h2>
          </div>
          <div className="menuBoardColumns">
            <div className="menuBoardColumn foodColumn">
              <div className="foodPosterTitle">
                <span>{menuBoard.foodTagline || "Good Food, Great Moments"}</span>
                <strong>{menuBoard.foodBrand || "EMRAKEL"}</strong>
                <em>{menuBoard.foodTitle || "MENU"}</em>
              </div>
              {visibleColumns.food.length ? visibleColumns.food.map((section) => renderSection(section)) : (
                <p className="menuBoardEmpty">{menuBoard.emptyFoodText || "Food menu coming soon."}</p>
              )}
            </div>
            <div className="menuBoardColumn drinkColumn">
              {visibleColumns.drinks.length ? visibleColumns.drinks.map((section) => renderSection(section)) : (
                <p className="menuBoardEmpty">{menuBoard.emptyDrinkText || "Drink menu coming soon."}</p>
              )}
            </div>
          </div>
        </div>
      </section>
  );
}

