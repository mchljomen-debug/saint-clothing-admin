import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import {
  FaImage,
  FaSave,
  FaSyncAlt,
  FaBullhorn,
  FaMobileAlt,
  FaLayerGroup,
} from "react-icons/fa";

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
    "{greeting}, {name}! Try our mobile AR fitting experience and explore the latest from Saint Clothing."
  );

  const [slides, setSlides] = useState([
    {
      ...emptySlide,
      title: "Saint Clothing",
      subtitle: "Modern Streetwear Essentials",
      description:
        "Clean silhouettes, premium everyday wear, and a monochrome identity built for a modern streetwear brand.",
      cta: "Shop Collection",
      action: "collection",
    },
    {
      ...emptySlide,
      title: "Virtual Try-On",
      subtitle: "AR Fitting Experience On Mobile",
      description:
        "Preview selected Saint Clothing pieces through your phone using our mobile AR try-on feature.",
      cta: "Try AR On Mobile",
      action: "ar",
    },
    {
      ...emptySlide,
      title: "Core Uniform",
      subtitle: "Minimal Pieces. Strong Identity.",
      description:
        "Everyday essentials refined for a sharper streetwear identity.",
      cta: "View Best Sellers",
      action: "bestseller",
    },
    {
      ...emptySlide,
      title: "New Drop",
      subtitle: "Refined Fits For Everyday Wear",
      description:
        "Fresh silhouettes and elevated staples for the latest Saint release.",
      cta: "View Latest Collection",
      action: "latest",
    },
  ]);

  const panelBg =
    "bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
  const softPanelBg = "bg-[#FAFAF8] border border-black/10";

  const inputClass =
    "w-full rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm text-[#0A0D17] outline-none transition focus:border-black";

  const labelClass =
    "text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";

  const buttonDark =
    "inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937] disabled:opacity-50";

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
            "{greeting}, {name}! Try our mobile AR fitting experience and explore the latest from Saint Clothing."
        );

        const incomingSlides = Array.isArray(data.hero.slides)
          ? data.hero.slides
          : [];

        const normalizedSlides = [0, 1, 2, 3].map((index) => ({
          ...emptySlide,
          ...(incomingSlides[index] || slides[index] || {}),
          image: incomingSlides[index]?.image || "",
          previewImage: "",
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
        headers: {
          Authorization: `Bearer ${token}`,
          token,
        },
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
    <div className="min-h-screen bg-transparent px-2.5 sm:px-3 pt-20 sm:pt-24 pb-4 font-['Montserrat']">
      <div className="max-w-[1500px] mx-auto">
        <form onSubmit={handleSave}>
          <div className="rounded-[5px] bg-[#0A0D17] p-5 sm:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] mb-4 text-white border border-black/10 overflow-hidden relative">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/50 mb-2">
                  Homepage Control
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[5px] bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <FaLayerGroup className="text-sm" />
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
                      Hero Manager
                    </h1>
                    <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                      Manage homepage slides, AR promotion, welcome ticker, and
                      call-to-action sections.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={fetchHero}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-[5px] border border-white/20 bg-white/10 text-white px-4 py-2.5 text-sm font-black transition hover:bg-white/20 disabled:opacity-50"
                >
                  <FaSyncAlt className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm disabled:opacity-50"
                >
                  <FaSave />
                  {loading ? "Saving..." : "Save Hero"}
                </button>
              </div>
            </div>
          </div>

          <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
            <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className={labelClass}>Welcome Message</p>
                <h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17] mt-1">
                  User Greeting Ticker
                </h3>
                <p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">
                  Use {"{greeting}"} and {"{name}"} to personalize the homepage
                  greeting.
                </p>
              </div>

              <label className="inline-flex w-fit items-center gap-3 rounded-[5px] border border-black/10 bg-[#FAFAF8] px-4 py-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/50">
                  Enable
                </span>
                <input
                  type="checkbox"
                  checked={tickerEnabled}
                  onChange={(e) => setTickerEnabled(e.target.checked)}
                  className="h-4 w-4 accent-[#0A0D17]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className={labelClass}>New User Greeting</p>
                <input
                  value={newUserGreeting}
                  onChange={(e) => setNewUserGreeting(e.target.value)}
                  placeholder="Example: Welcome"
                  className={`${inputClass} mt-2`}
                />
              </div>

              <div>
                <p className={labelClass}>Returning User Greeting</p>
                <input
                  value={returningUserGreeting}
                  onChange={(e) => setReturningUserGreeting(e.target.value)}
                  placeholder="Example: Welcome back"
                  className={`${inputClass} mt-2`}
                />
              </div>

              <div className="md:col-span-2">
                <p className={labelClass}>Ticker Text</p>
                <textarea
                  value={tickerText}
                  onChange={(e) => setTickerText(e.target.value)}
                  rows={3}
                  placeholder="{greeting}, {name}! Try our mobile AR fitting experience."
                  className={`${inputClass} mt-2 resize-none`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {slides.map((slide, index) => {
              const displayImage = slide.previewImage || slide.image;

              return (
                <div
                  key={index}
                  className={`${panelBg} rounded-[5px] overflow-hidden`}
                >
                  <div className="px-4 sm:px-5 py-5 border-b border-black/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={labelClass}>Slide {index + 1}</p>
                        <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                          {slide.action === "ar"
                            ? "AR Promotion"
                            : "Hero Content"}
                        </h3>
                      </div>

                      <div className="w-10 h-10 rounded-[5px] bg-[#0A0D17] text-white flex items-center justify-center shrink-0">
                        {slide.action === "ar" ? (
                          <FaMobileAlt className="text-sm" />
                        ) : (
                          <FaBullhorn className="text-sm" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    <div className={`${softPanelBg} rounded-[5px] p-4`}>
                      <p className={labelClass}>Slide Details</p>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={slide.title}
                          onChange={(e) =>
                            handleSlideChange(index, "title", e.target.value)
                          }
                          placeholder="Title"
                          className={inputClass}
                        />

                        <input
                          type="text"
                          value={slide.subtitle}
                          onChange={(e) =>
                            handleSlideChange(index, "subtitle", e.target.value)
                          }
                          placeholder="Subtitle"
                          className={inputClass}
                        />

                        <input
                          type="text"
                          value={slide.cta}
                          onChange={(e) =>
                            handleSlideChange(index, "cta", e.target.value)
                          }
                          placeholder="CTA Button Text"
                          className={inputClass}
                        />

                        <select
                          value={slide.action}
                          onChange={(e) =>
                            handleSlideChange(index, "action", e.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="collection">Collection</option>
                          <option value="ar">AR Try-On Mobile</option>
                          <option value="bestseller">Best Seller</option>
                          <option value="latest">Latest</option>
                        </select>

                        <textarea
                          value={slide.description}
                          onChange={(e) =>
                            handleSlideChange(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          rows={4}
                          placeholder="Description"
                          className={`${inputClass} resize-none md:col-span-2`}
                        />
                      </div>
                    </div>

                    <div className={`${softPanelBg} rounded-[5px] p-4`}>
                      <div className="flex items-center gap-2 mb-3">
                        <FaImage className="text-[#0A0D17]/45" />
                        <p className={labelClass}>Hero Image</p>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleFileChange(index, e.target.files?.[0] || null)
                        }
                        className={inputClass}
                      />

                      <div className="mt-3 overflow-hidden rounded-[5px] border border-black/10 bg-white">
                        {displayImage ? (
                          <img
                            src={resolveImage(displayImage)}
                            alt={`Slide ${index + 1}`}
                            className="h-[230px] w-full object-cover"
                          />
                        ) : (
                          <div className="h-[230px] w-full flex items-center justify-center bg-[#f0f0ed]">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/35">
                              No Hero Image
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end mt-4">
            <button type="submit" disabled={loading} className={buttonDark}>
              <FaSave />
              {loading ? "Saving..." : "Save Hero"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HeroManager;