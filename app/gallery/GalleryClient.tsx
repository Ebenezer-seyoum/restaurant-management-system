// @ts-nocheck
"use client";

import { useState } from "react";

export default function GalleryClient({ images }) {
  const [activeImage, setActiveImage] = useState("");

  return (
    <>
      <section className="section galleryMasonry">
        {images.map((image, index) => (
          <button
            className="galleryTile"
            key={`${image}-${index}`}
            onClick={() => setActiveImage(image)}
            type="button"
          >
            <img src={image} alt="" />
          </button>
        ))}
      </section>
      {activeImage ? (
        <div className="galleryLightbox" onClick={() => setActiveImage("")} role="presentation">
          <button aria-label="Close preview" onClick={() => setActiveImage("")} type="button">
            x
          </button>
          <img src={activeImage} alt="" />
        </div>
      ) : null}
    </>
  );
}

