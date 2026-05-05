import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";
import {
  FaLayerGroup,
  FaPlus,
  FaEdit,
  FaTrash,
  FaImage,
  FaSyncAlt,
  FaLink,
  FaInfoCircle,
} from "react-icons/fa";

const SECTION_OPTIONS = [
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
  { label: "Both", value: "both" },
  { label: "Other", value: "other" },
];

const CategoryManager = ({ token }) => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [section, setSection] = useState("other");
  const [matchWith, setMatchWith] = useState([]);
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);
  const [oldImage, setOldImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      token,
    },
  };

  const panelBg =
    "bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
  const softPanelBg = "bg-[#FAFAF8] border border-black/10";
  const inputClass =
    "w-full rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm text-[#0A0D17] outline-none transition focus:border-black";
  const labelClass =
    "text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";
  const buttonDark =
    "inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937] disabled:opacity-50";
  const buttonLight =
    "inline-flex items-center justify-center gap-2 rounded-[5px] border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#0A0D17] transition hover:bg-[#FAFAF8] disabled:opacity-50";

  const activeMatchOptions = useMemo(() => {
    return categories.filter((cat) => cat.name !== name.trim());
  }, [categories, name]);

  const categoryStats = useMemo(() => {
    return {
      total: categories.length,
      top: categories.filter((cat) => cat.section === "top").length,
      bottom: categories.filter((cat) => cat.section === "bottom").length,
      both: categories.filter((cat) => cat.section === "both").length,
      other: categories.filter((cat) => cat.section === "other").length,
      withImage: categories.filter((cat) => cat.image).length,
    };
  }, [categories]);

  const fetchCategories = async () => {
    setRefreshing(true);

    try {
      const res = await axios.get(`${backendUrl}/api/category/list`);

      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load categories");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setName("");
    setSection("other");
    setMatchWith([]);
    setImage(null);
    setEditId(null);
    setOldImage("");
  };

  const toggleMatch = (catName) => {
    setMatchWith((prev) =>
      prev.includes(catName)
        ? prev.filter((item) => item !== catName)
        : [...prev, catName]
    );
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!name.trim()) return toast.error("Category name is required");

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("section", section);
      formData.append("matchWith", JSON.stringify(matchWith));

      if (image instanceof File) {
        formData.append("image", image);
      }

      const res = editId
        ? await axios.put(
            `${backendUrl}/api/category/update/${editId}`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                token,
                "Content-Type": "multipart/form-data",
              },
            }
          )
        : await axios.post(`${backendUrl}/api/category/add`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              token,
              "Content-Type": "multipart/form-data",
            },
          });

      if (res.data.success) {
        toast.success(res.data.message || "Category saved");
        resetForm();
        fetchCategories();
      } else {
        toast.error(res.data.message || "Failed to save category");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  const editCategory = (cat) => {
    setEditId(cat._id);
    setName(cat.name || "");
    setSection(cat.section || "other");
    setMatchWith(Array.isArray(cat.matchWith) ? cat.matchWith : []);
    setOldImage(cat.image || "");
    setImage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeCategory = async (id) => {
    if (!window.confirm("Remove this category?")) return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/category/delete`,
        { id },
        axiosConfig
      );

      if (res.data.success) {
        toast.success("Category removed");
        fetchCategories();
      } else {
        toast.error(res.data.message || "Failed to remove category");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove category");
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-2.5 sm:px-3 pt-20 sm:pt-24 pb-4 font-['Montserrat']">
      <div className="max-w-[1500px] mx-auto">
        <div className="rounded-[5px] bg-[#0A0D17] p-5 sm:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] mb-4 text-white border border-black/10 overflow-hidden relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/50 mb-2">
                Saint Clothing Admin
              </p>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[5px] bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <FaLayerGroup className="text-sm" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
                    Category Manager
                  </h1>
                  <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                    Manage category images, sections, and recommendation matching rules.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchCategories}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm disabled:opacity-50"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              Refresh Categories
            </button>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17]">
                Category Overview
              </h3>
              <p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">
                Summary of active category sections and image readiness.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Categories", value: categoryStats.total },
              { label: "Top", value: categoryStats.top },
              { label: "Bottom", value: categoryStats.bottom },
              { label: "Both", value: categoryStats.both },
              { label: "Other", value: categoryStats.other },
              { label: "With Image", value: categoryStats.withImage },
            ].map((item) => (
              <div
                key={item.label}
                className={`${softPanelBg} rounded-[5px] p-4 min-w-0 overflow-hidden transition hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="text-xs font-medium text-[#6b7280]">
                    {item.label}
                  </span>
                  <div className="w-9 h-9 rounded-[5px] bg-[#111111]/8 flex items-center justify-center text-[#111111] shrink-0">
                    <FaLayerGroup />
                  </div>
                </div>

                <h2 className="text-[24px] sm:text-[28px] font-black leading-none tracking-[-0.03em] text-[#0A0D17]">
                  {item.value}
                </h2>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={submitHandler}
          className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
            <div>
              <p className={labelClass}>Category Form</p>
              <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                {editId ? "Edit Category" : "Add Category"}
              </h3>
              <p className="text-sm text-[#6b7280] mt-1">
                Add model images and match rules for category recommendation logic.
              </p>
            </div>

            {editId && (
              <button type="button" onClick={resetForm} className={buttonLight}>
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            <label className={`${softPanelBg} rounded-[5px] p-4 cursor-pointer`}>
              <div className="flex items-center gap-2 mb-3">
                <FaImage className="text-[#0A0D17]/45" />
                <p className={labelClass}>Category Image</p>
              </div>

              <img
                src={
                  image
                    ? URL.createObjectURL(image)
                    : oldImage
                      ? oldImage
                      : assets.upload_area
                }
                alt=""
                className="w-full h-[330px] object-cover rounded-[5px] border border-black/10 bg-white"
              />

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />

              <p className="text-xs text-[#6b7280] mt-2">
                Recommended: portrait model image.
              </p>
            </label>

            <div className="space-y-3">
              <div className={`${softPanelBg} rounded-[5px] p-4`}>
                <p className={labelClass}>Basic Information</p>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Category name ex. Tshirt"
                  className={`${inputClass} mt-3`}
                />
              </div>

              <div className={`${softPanelBg} rounded-[5px] p-4`}>
                <p className={labelClass}>Category Section</p>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SECTION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSection(option.value)}
                      className={`rounded-[5px] border px-4 py-3 text-xs font-black uppercase tracking-widest transition ${
                        section === option.value
                          ? "bg-[#0A0D17] text-white border-[#0A0D17]"
                          : "bg-white text-[#6b7280] border-black/10 hover:bg-[#FAFAF8]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${softPanelBg} rounded-[5px] p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <FaLink className="text-[#0A0D17]/45" />
                  <p className={labelClass}>Match With Categories</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeMatchOptions.map((cat) => (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => toggleMatch(cat.name)}
                      className={`rounded-[5px] border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition ${
                        matchWith.includes(cat.name)
                          ? "bg-[#0A0D17] text-white border-[#0A0D17]"
                          : "bg-white text-[#6b7280] border-black/10 hover:bg-[#FAFAF8]"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}

                  {activeMatchOptions.length === 0 && (
                    <p className="text-sm text-[#6b7280]">
                      Add more categories to select match partners.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[5px] bg-blue-50 border border-blue-100 p-4">
                <div className="flex items-start gap-2">
                  <FaInfoCircle className="mt-0.5 text-blue-700 shrink-0" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                      Recommendation Rule
                    </p>
                    <p className="mt-2 text-sm text-blue-700/80 leading-6">
                      Example: if this category is a top, choose bottom categories in
                      Match With. Product and cart recommendations will use this
                      automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button disabled={loading} className={buttonDark}>
                  <FaPlus />
                  {loading
                    ? "Saving..."
                    : editId
                      ? "Update Category"
                      : "Add Category"}
                </button>

                {editId && (
                  <button type="button" onClick={resetForm} className={buttonLight}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className={`${panelBg} rounded-[5px] overflow-hidden`}>
          <div className="px-4 sm:px-5 py-5 border-b border-black/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className={labelClass}>Category List</p>
                <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                  Active Categories
                </h3>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">
                {categories.length} items
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-[#FAFAF8]">
            {categories.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-[5px] border border-black/10">
                <p className="font-black text-[#0A0D17]">No categories yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="rounded-[5px] bg-white border border-black/10 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
                  >
                    <img
                      src={cat.image || assets.upload_area}
                      alt={cat.name}
                      className="w-full h-[330px] object-cover bg-gray-100"
                    />

                    <div className="p-4">
                      <h3 className="text-lg font-black uppercase text-[#0A0D17]">
                        {cat.name}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-[5px] bg-[#0A0D17] text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                          {cat.section || "other"}
                        </span>

                        <span className="rounded-[5px] bg-gray-100 text-gray-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                          {(cat.matchWith || []).length} matches
                        </span>
                      </div>

                      {Array.isArray(cat.matchWith) && cat.matchWith.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {cat.matchWith.map((matchName) => (
                            <span
                              key={matchName}
                              className="rounded-[5px] bg-[#FAFAF8] border border-black/5 px-2 py-1 text-[10px] font-bold text-gray-500"
                            >
                              {matchName}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => editCategory(cat)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0A0D17] text-white rounded-[5px] text-xs font-black hover:bg-[#1d2433] transition"
                        >
                          <FaEdit />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => removeCategory(cat._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-[5px] text-xs font-black hover:bg-red-500 hover:text-white transition"
                        >
                          <FaTrash />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;