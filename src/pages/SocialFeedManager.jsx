import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../App";

const SocialFeedManager = ({ token }) => {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState("Latest From Saint Social");
  const [subtitle, setSubtitle] = useState(
    "Follow the latest drops, outfits, and AR try-on updates from Saint Clothing."
  );
  const [embedCode, setEmbedCode] = useState("");

  const fetchSocialFeed = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(`${backendUrl}/api/social-feed`);

      if (data.success && data.feed) {
        setEnabled(Boolean(data.feed.enabled));
        setTitle(data.feed.title || "Latest From Saint Social");
        setSubtitle(
          data.feed.subtitle ||
            "Follow the latest drops, outfits, and AR try-on updates from Saint Clothing."
        );
        setEmbedCode(data.feed.embedCode || "");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to load social feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialFeed();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data } = await axios.put(
        `${backendUrl}/api/social-feed`,
        {
          enabled,
          title,
          subtitle,
          embedCode,
        },
        {
          headers: { token },
        }
      );

      if (data.success) {
        toast.success("Social feed updated successfully");
        window.dispatchEvent(new Event("social-feed-refresh"));
      } else {
        toast.error(data.message || "Failed to update social feed");
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to save social feed");
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
          Social Feed Manager
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Connect Saint Clothing social media posts to your website using an
          Instagram, Facebook, TikTok, or social feed widget embed code.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_15px_40px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-black text-[#0A0D17]">
                Social Feed Status
              </p>
              <p className="text-xs text-gray-500">
                Turn this on to display latest Saint Clothing social posts on
                the homepage.
              </p>
            </div>

            <label className="inline-flex items-center gap-3 rounded-full border border-black/10 px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                Enable
              </span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_15px_40px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                Section Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Latest From Saint Social"
                className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                Section Subtitle
              </label>
              <textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                rows={3}
                placeholder="Follow the latest drops..."
                className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                Widget Embed Code
              </label>

              <textarea
                value={embedCode}
                onChange={(e) => setEmbedCode(e.target.value)}
                rows={10}
                placeholder={`Paste widget code here. Example:\n<script src="https://static.elfsight.com/platform/platform.js" async></script>\n<div class="elfsight-app-your-widget-id"></div>`}
                className="w-full rounded-2xl border border-black/10 px-4 py-3 font-mono text-xs outline-none focus:border-black"
              />

              <p className="mt-3 text-xs text-gray-500">
                Use trusted widget providers only, like Elfsight, LightWidget,
                or SnapWidget.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-[#0A0D17] p-6 text-white shadow-[0_15px_40px_rgba(0,0,0,0.12)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/50">
            How to use
          </p>

          <div className="mt-4 space-y-2 text-sm text-white/80">
            <p>1. Create your social feed widget from Elfsight or similar.</p>
            <p>2. Connect Saint Clothing Instagram/Facebook/TikTok.</p>
            <p>3. Copy the embed code.</p>
            <p>4. Paste it here and click Save.</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-[#0A0D17] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Social Feed"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SocialFeedManager;