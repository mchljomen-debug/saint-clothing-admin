import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";

const CategoryManager = ({ token }) => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
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
    setImage(null);
    setEditId(null);
    setOldImage("");
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!name.trim()) return toast.error("Category name is required");

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());

      if (image instanceof File) {
        formData.append("image", image);
      }

      const res = editId
        ? await axios.put(`${backendUrl}/api/category/update/${editId}`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              token,
              "Content-Type": "multipart/form-data",
            },
          })
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
            Add/edit category model images used in the mobile HomeScreen.
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

              <div className="flex gap-2">
                <button
                  disabled={loading}
                  className="bg-black text-white px-6 py-3 rounded-2xl font-black disabled:opacity-50"
                >
                  {loading ? "Saving..." : editId ? "Update Category" : "Add Category"}
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