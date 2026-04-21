import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../App";

const emptySlide = {
  title: "",
  subtitle: "",
  description: "",
  cta: "",
  action: "collection",
  image: "",
  file: null,
};

const resolveImage = (img) => {
  if (!img) return "";
  const value = String(img).trim();

  if (value.startsWith("blob:")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/uploads/")) return `${backendUrl}${value}`;

  return `${backendUrl}/uploads/${value.replace(/^\/+/, "")}`;
};

const HeroManager = ({ token }) => {
  const [loading, setLoading] = useState(false);
  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [tickerText, setTickerText] = useState(
    "Welcome back, {name}! Ready to explore the latest from Saint Clothing?"
  );
  const [slides, setSlides] = useState([
    { ...emptySlide },
    { ...emptySlide },
    { ...emptySlide },
  ]);

  const fetchHero = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/hero`);

      if (data.success && data.hero) {
        setTickerEnabled(Boolean(data.hero.tickerEnabled));
        setTickerText(
          data.hero.tickerText ||
            "Welcome back, {name}! Ready to explore the latest from Saint Clothing?"
        );

        const incomingSlides = Array.isArray(data.hero.slides)
          ? data.hero.slides
          : [];

        const normalizedSlides = [0, 1, 2].map((index) => ({
          ...emptySlide,
          ...(incomingSlides[index] || {}),
          image: incomingSlides[index]?.image || "",
          file: null,
        }));

        setSlides(normalizedSlides);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to load hero");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHero();
  }, []);

  const handleSlideChange = (index, field, value) => {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === index ? { ...slide, [field]: value } : slide
      )
    );
  };

  const handleFileChange = (index, file) => {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === index
          ? {
              ...slide,
              file,
              image: file ? URL.createObjectURL(file) : slide.image,
            }
          : slide
      )
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("tickerEnabled", String(tickerEnabled));
      formData.append("tickerText", tickerText);

      const slidePayload = slides.map((slide) => ({
        title: slide.title || "",
        subtitle: slide.subtitle || "",
        description: slide.description || "",
        cta: slide.cta || "",
        action: slide.action || "collection",
        image:
          slide.image &&
          !slide.image.startsWith("blob:") &&
          !slide.image.startsWith("http://") &&
          !slide.image.startsWith("https://")
            ? slide.image.startsWith("/uploads/")
              ? slide.image
              : `/uploads/${String(slide.image).replace(/^\/+/, "")}`
            : slide.image &&
              !slide.image.startsWith("blob:")
            ? slide.image
            : "",
      }));

      formData.append("slides", JSON.stringify(slidePayload));

      slides.forEach((slide, index) => {
        if (slide.file) {
          formData.append(`image${index + 1}`, slide.file);
        }
      });

      const { data } = await axios.put(`${backendUrl}/api/hero`, formData, {
        headers: {
          token,
          "Content-Type": "multipart/form-data",
        },
      });

      if (data.success) {
        toast.success("Hero updated successfully");

        localStorage.setItem("hero_updated", Date.now().toString());
        window.dispatchEvent(new Event("hero-refresh"));

        fetchHero();
      } else {
        toast.error(data.message || "Failed to save hero");
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to save hero");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 pt-[90px]">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-gray-400">
          Homepage Control
        </p>
        <h1 className="mt-2 text-3xl font-black text-[#0A0D17]">
          Hero Manager
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Upload hero images and change every hero content shown on the frontend.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_15px_40px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-black text-[#0A0D17]">
                  Welcome Ticker
                </p>
                <p className="text-xs text-gray-500">
                  Use <span className="font-bold">{"{name}"}</span> to show the
                  user name.
                </p>
              </div>

              <label className="inline-flex items-center gap-3 rounded-full border border-black/10 px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                  Enable
                </span>
                <input
                  type="checkbox"
                  checked={tickerEnabled}
                  onChange={(e) => setTickerEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>

            <textarea
              value={tickerText}
              onChange={(e) => setTickerText(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              placeholder="Welcome back, {name}! Ready to explore the latest from Saint Clothing?"
            />
          </div>
        </div>

        {slides.map((slide, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_15px_40px_rgba(0,0,0,0.05)]"
          >
            <div className="mb-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-gray-400">
                Slide {index + 1}
              </p>
              <h2 className="mt-1 text-xl font-black text-[#0A0D17]">
                Hero Content
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <input
                type="text"
                value={slide.title}
                onChange={(e) =>
                  handleSlideChange(index, "title", e.target.value)
                }
                placeholder="Title"
                className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              />

              <input
                type="text"
                value={slide.subtitle}
                onChange={(e) =>
                  handleSlideChange(index, "subtitle", e.target.value)
                }
                placeholder="Subtitle"
                className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              />

              <input
                type="text"
                value={slide.cta}
                onChange={(e) =>
                  handleSlideChange(index, "cta", e.target.value)
                }
                placeholder="CTA Button Text"
                className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              />

              <select
                value={slide.action}
                onChange={(e) =>
                  handleSlideChange(index, "action", e.target.value)
                }
                className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              >
                <option value="collection">Collection</option>
                <option value="bestseller">Best Seller</option>
                <option value="latest">Latest</option>
              </select>

              <div className="lg:col-span-2">
                <textarea
                  value={slide.description}
                  onChange={(e) =>
                    handleSlideChange(index, "description", e.target.value)
                  }
                  rows={4}
                  placeholder="Description"
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                  Upload Hero Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFileChange(index, e.target.files?.[0] || null)
                  }
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none"
                />
              </div>

              {slide.image ? (
                <div className="lg:col-span-2 overflow-hidden rounded-[22px] border border-black/10 bg-[#fafaf8]">
                  <img
                    src={resolveImage(slide.image)}
                    alt={`Slide ${index + 1}`}
                    className="h-[260px] w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-[#0A0D17] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Hero"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HeroManager;