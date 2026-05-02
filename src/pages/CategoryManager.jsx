import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";

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

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      token,
    },
  };

  const activeMatchOptions = useMemo(() => {
    return categories.filter((cat) => cat.name !== name.trim());
  }, [categories, name]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/category/list`);

      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load categories");
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
    <div className="min-h-screen bg-[#f8f7f4] pt-20 px-3 pb-8 font-['Montserrat']">
      <div className="max-w-[1300px] mx-auto">
        <div className="rounded-[32px] bg-black text-white p-6 mb-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            Mobile Home
          </p>
          <h1 className="text-2xl font-black mt-2">Category Model Manager</h1>
          <p className="text-sm text-white/60 mt-1">
            Add/edit category model images and recommendation matching rules.
          </p>
        </div>

        <form
          onSubmit={submitHandler}
          className="rounded-[28px] bg-white border border-black/10 p-5 mb-6"
        >
          <h2 className="text-xl font-black mb-4">
            {editId ? "Edit Category" : "Add Category"}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
            <label className="cursor-pointer">
              <img
                src={
                  image
                    ? URL.createObjectURL(image)
                    : oldImage
                    ? oldImage
                    : assets.upload_area
                }
                alt=""
                className="w-full h-[330px] object-cover rounded-[24px] border border-black/10 bg-gray-100"
              />

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />

              <p className="text-xs text-gray-500 mt-2">
                Recommended: portrait model image
              </p>
            </label>

            <div className="flex flex-col gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name ex. Tshirt"
                className="border border-black/10 rounded-2xl px-4 py-3 bg-white"
              />

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
                  Category Section
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SECTION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSection(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest ${
                        section === option.value
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-500 border-black/10"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
                  Match With Categories
                </p>

                <div className="flex flex-wrap gap-2">
                  {activeMatchOptions.map((cat) => (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => toggleMatch(cat.name)}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest ${
                        matchWith.includes(cat.name)
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-500 border-black/10"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}

                  {activeMatchOptions.length === 0 && (
                    <p className="text-sm text-gray-400">
                      Add more categories to select match partners.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 border border-black/5 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
                  How this affects recommendations
                </p>
                <p className="mt-2 text-sm text-gray-500 leading-6">
                  Example: if this category is a top, choose bottom categories in
                  Match With. Product and cart recommendations will use this
                  automatically.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={loading}
                  className="bg-black text-white px-6 py-3 rounded-2xl font-black disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editId
                    ? "Update Category"
                    : "Add Category"}
                </button>

                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="border border-black/10 px-6 py-3 rounded-2xl font-black"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="rounded-[26px] bg-white border border-black/10 overflow-hidden"
            >
              <img
                src={cat.image || assets.upload_area}
                alt={cat.name}
                className="w-full h-[360px] object-cover bg-gray-100"
              />

              <div className="p-4">
                <h3 className="text-lg font-black">{cat.name}</h3>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    {cat.section || "other"}
                  </span>

                  <span className="rounded-full bg-gray-100 text-gray-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    {(cat.matchWith || []).length} matches
                  </span>
                </div>

                {Array.isArray(cat.matchWith) && cat.matchWith.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cat.matchWith.map((name) => (
                      <span
                        key={name}
                        className="rounded-lg bg-gray-50 border border-black/5 px-2 py-1 text-[10px] font-bold text-gray-500"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => editCategory(cat)}
                    className="bg-black text-white px-4 py-2 rounded-xl font-black text-sm"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => removeCategory(cat._id)}
                    className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-black text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-full p-10 text-center bg-white rounded-[26px] border border-black/10">
              <p className="font-black">No categories yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;