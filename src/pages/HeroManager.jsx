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
  previewImage: "",
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
  const [newUserGreeting, setNewUserGreeting] = useState("Welcome");
  const [returningUserGreeting, setReturningUserGreeting] =
    useState("Welcome back");
  const [tickerText, setTickerText] = useState(
    "{greeting}, {name}! Ready to explore the latest from Saint Clothing?"
  );

  const [slides, setSlides] = useState([
    { ...emptySlide },
    { ...emptySlide },
    { ...emptySlide },
  ]);

  const fetchHero = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(`${backendUrl}/api/hero?ts=${Date.now()}`);

      if (data.success && data.hero) {
        setTickerEnabled(Boolean(data.hero.tickerEnabled));
        setNewUserGreeting(data.hero.newUserGreeting || "Welcome");
        setReturningUserGreeting(
          data.hero.returningUserGreeting || "Welcome back"
        );
        setTickerText(
          data.hero.tickerText ||
            "{greeting}, {name}! Ready to explore the latest from Saint Clothing?"
        );

        const incomingSlides = Array.isArray(data.hero.slides)
          ? data.hero.slides
          : [];

        setSlides(
          [0, 1, 2].map((index) => ({
            ...emptySlide,
            ...(incomingSlides[index] || {}),
            image: incomingSlides[index]?.image || "",
            previewImage: "",
            file: null,
          }))
        );
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
              previewImage: file ? URL.createObjectURL(file) : "",
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
      formData.append("newUserGreeting", newUserGreeting);
      formData.append("returningUserGreeting", returningUserGreeting);
      formData.append("tickerText", tickerText);

      const slidePayload = slides.map((slide) => ({
        title: slide.title || "",
        subtitle: slide.subtitle || "",
        description: slide.description || "",
        cta: slide.cta || "",
        action: slide.action || "collection",
        image: slide.image || "",
      }));

      formData.append("slides", JSON.stringify(slidePayload));

      slides.forEach((slide, index) => {
        if (slide.file) {
          formData.append(`image${index + 1}`, slide.file);
        }
      });

      const { data } = await axios.put(`${backendUrl}/api/hero`, formData, {
        headers: { token },
      });

      if (data.success) {
        toast.success("Hero updated successfully");
        localStorage.setItem("hero_updated", Date.now().toString());
        window.dispatchEvent(new Event("hero-refresh"));
        await fetchHero();
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
                  Use <b>{"{greeting}"}</b> and <b>{"{name}"}</b>.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={newUserGreeting}
                onChange={(e) => setNewUserGreeting(e.target.value)}
                placeholder="New user greeting"
                className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              />

              <input
                value={returningUserGreeting}
                onChange={(e) => setReturningUserGreeting(e.target.value)}
                placeholder="Returning user greeting"
                className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <textarea
              value={tickerText}
              onChange={(e) => setTickerText(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
            />
          </div>
        </div>

        {slides.map((slide, index) => {
          const displayImage = slide.previewImage || slide.image;

          return (
            <div
              key={index}
              className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_15px_40px_rgba(0,0,0,0.05)]"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-gray-400">
                Slide {index + 1}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <input
                  value={slide.title}
                  onChange={(e) =>
                    handleSlideChange(index, "title", e.target.value)
                  }
                  placeholder="Title"
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
                />

                <input
                  value={slide.subtitle}
                  onChange={(e) =>
                    handleSlideChange(index, "subtitle", e.target.value)
                  }
                  placeholder="Subtitle"
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
                />

                <input
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

                <textarea
                  value={slide.description}
                  onChange={(e) =>
                    handleSlideChange(index, "description", e.target.value)
                  }
                  rows={4}
                  placeholder="Description"
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black lg:col-span-2"
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFileChange(index, e.target.files?.[0] || null)
                  }
                  className="lg:col-span-2"
                />

                {displayImage && (
                  <img
                    src={resolveImage(displayImage)}
                    alt={`Slide ${index + 1}`}
                    className="lg:col-span-2 h-[260px] w-full rounded-xl object-cover"
                  />
                )}
              </div>
            </div>
          );
        })}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-[#0A0D17] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white"
          >
            {loading ? "Saving..." : "Save Hero"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HeroManager;