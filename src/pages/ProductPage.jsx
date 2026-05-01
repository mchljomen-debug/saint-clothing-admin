import React, { useEffect, useMemo, useState } from "react";
import { assets } from "../assets/assets";
import axios from "axios";
import { backendUrl, currency } from "../App";
import { toast } from "react-toastify";

const getMediaUrl = (value, backendUrl) => {
  if (!value) return "";
  const stringValue = String(value).trim();

  if (
    stringValue.startsWith("http://") ||
    stringValue.startsWith("https://") ||
    stringValue.startsWith("data:")
  ) {
    return stringValue;
  }

  return `${backendUrl}/uploads/${stringValue.replace(/^\/+/, "")}`;
};

const ProductPage = ({ token }) => {
  const role = localStorage.getItem("role") || "";
  const userBranch = localStorage.getItem("branch") || "branch1";

  const [list, setList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [images, setImages] = useState([null, null, null, null]);
  const [oldImages, setOldImages] = useState([]);
  const [model3d, setModel3d] = useState(null);
  const [oldModel3d, setOldModel3d] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [colorHex, setColorHex] = useState("#000000");

  const [category, setCategory] = useState("Tshirt");
  const [branch, setBranch] = useState("");

  const [bestseller, setBestseller] = useState(false);
  const [newArrival, setNewArrival] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [salePercent, setSalePercent] = useState("");

  const [sizes, setSizes] = useState([]);
  const SIZE_OPTIONS = ["S", "M", "L", "XL", "2XL", "3XL"];

  const [stock, setStock] = useState({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    "2XL": 0,
    "3XL": 0,
  });

  const [sizeChartImage, setSizeChartImage] = useState(null);
  const [oldSizeChartImage, setOldSizeChartImage] = useState("");

  const [colors, setColors] = useState([]);
  const [colorInput, setColorInput] = useState("");

  const [fitType, setFitType] = useState("Regular");
  const [styleVibe, setStyleVibe] = useState("Streetwear");
  const [recommendationSection, setRecommendationSection] = useState("none");
  const [styleTags, setStyleTags] = useState([]);
  const [styleTagInput, setStyleTagInput] = useState("");
  const [matchWith, setMatchWith] = useState([]);

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      token,
    },
  };

  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [categoriesData, setCategoriesData] = useState([]);

  const CATEGORY_OPTIONS = useMemo(() => {
    const fromBackend = categoriesData.map((item) => item.name).filter(Boolean);

    const fromProducts = Array.isArray(list)
      ? list.map((item) => item.category).filter(Boolean)
      : [];

    return Array.from(new Set([...fromBackend, ...fromProducts]));
  }, [categoriesData, list]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/category/list`);

      if (res.data.success) {
        setCategoriesData(res.data.categories || []);

        if (!category && res.data.categories?.length > 0) {
          setCategory(res.data.categories[0].name);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load categories");
    }
  };

  const addCustomCategory = async () => {
    const trimmed = customCategoryInput.trim();

    if (!trimmed) return toast.error("Enter category name");

    try {
      const res = await axios.post(
        `${backendUrl}/api/category/add`,
        { name: trimmed },
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Category added");
        setCustomCategoryInput("");
        setCategory(trimmed);
        await fetchCategories();
      } else {
        toast.error(res.data.message || "Failed to add category");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add category");
    }
  };

  const removeCustomCategory = async (id, name) => {
    if (!window.confirm(`Remove category "${name}"?`)) return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/category/delete`,
        { id },
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Category removed");

        if (category === name) setCategory("Tshirt");
        if (categoryFilter === name) setCategoryFilter("all");

        await fetchCategories();
      } else {
        toast.error(res.data.message || "Failed to remove category");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove category");
    }
  };

  const predefinedColors = [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#ffffff" },
    { name: "Red", hex: "#ff0000" },
    { name: "Green", hex: "#008000" },
    { name: "Blue", hex: "#0000ff" },
    { name: "Yellow", hex: "#ffff00" },
    { name: "Orange", hex: "#ffa500" },
    { name: "Purple", hex: "#800080" },
    { name: "Pink", hex: "#ffc0cb" },
    { name: "Brown", hex: "#8b4513" },
    { name: "Gray", hex: "#808080" },
    { name: "Grey", hex: "#808080" },
    { name: "Navy", hex: "#000080" },
    { name: "Maroon", hex: "#800000" },
    { name: "Olive", hex: "#808000" },
    { name: "Teal", hex: "#008080" },
    { name: "Silver", hex: "#c0c0c0" },
    { name: "Beige", hex: "#f5f5dc" },
    { name: "Cream", hex: "#fffdd0" },
    { name: "Khaki", hex: "#c3b091" },
  ];

  const hexToRgb = (hex) => {
    const safeHex = (hex || "").replace("#", "").trim();
    if (!/^[0-9A-Fa-f]{6}$/.test(safeHex)) return null;

    return {
      r: parseInt(safeHex.slice(0, 2), 16),
      g: parseInt(safeHex.slice(2, 4), 16),
      b: parseInt(safeHex.slice(4, 6), 16),
    };
  };

  const getColorNameFromHex = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return "Unknown";

    let closestName = "Unknown";
    let closestDistance = Infinity;

    for (const item of predefinedColors) {
      const itemRgb = hexToRgb(item.hex);
      if (!itemRgb) continue;

      const distance =
        Math.pow(rgb.r - itemRgb.r, 2) +
        Math.pow(rgb.g - itemRgb.g, 2) +
        Math.pow(rgb.b - itemRgb.b, 2);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestName = item.name;
      }
    }

    return closestName;
  };

  const autoColorName = useMemo(
    () => getColorNameFromHex(colorHex),
    [colorHex]
  );

  const activeBranches = useMemo(
    () => branches.filter((b) => b.isActive),
    [branches]
  );

  useEffect(() => {
    if (role === "admin") {
      if (!branch && activeBranches.length > 0) {
        setBranch(activeBranches[0].code);
      }
    } else {
      setBranch(userBranch);
    }
  }, [role, userBranch, activeBranches, branch]);

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/branch/list`, axiosConfig);
      if (res.data.success) {
        setBranches(res.data.branches || []);
      } else {
        setBranches([]);
      }
    } catch {
      setBranches([]);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${backendUrl}/api/product/admin-list`,
        axiosConfig
      );

      if (res.data.success) {
        const products = Array.isArray(res.data.products)
          ? res.data.products
          : Array.isArray(res.data.product)
          ? res.data.product
          : [];

        setList([...products].reverse());
      } else {
        toast.error(res.data.message);
        setList([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProduct = async (id) => {
    try {
      const res = await axios.get(`${backendUrl}/api/product/single/${id}`);

      if (res.data.success) {
        const p = res.data.product;

        setEditId(p._id);
        setName(p.name || "");
        setDescription(p.description || "");
        setPrice(p.price || "");
        setSku(p.sku || "");
        setGroupCode(p.groupCode || "");
        setColorHex(p.colorHex || "#000000");
        setCategory(p.category || "Tshirt");
        setBranch(
          p.branch ||
            (role === "admin" ? activeBranches[0]?.code || "" : userBranch)
        );
        setBestseller(!!p.bestseller);
        setNewArrival(!!p.newArrival);
        setOnSale(!!p.onSale);
        setSalePercent(
          p.salePercent !== undefined && p.salePercent !== null
            ? String(p.salePercent)
            : ""
        );

        setSizes(Array.isArray(p.sizes) ? p.sizes : []);
        setStock({
          S: Number(p.stock?.S ?? 0),
          M: Number(p.stock?.M ?? 0),
          L: Number(p.stock?.L ?? 0),
          XL: Number(p.stock?.XL ?? 0),
          "2XL": Number(p.stock?.["2XL"] ?? 0),
          "3XL": Number(p.stock?.["3XL"] ?? 0),
        });

        setOldSizeChartImage(p.sizeChartImage || "");
        setSizeChartImage(null);

        let safeColors = [];
        try {
          const raw = p.colors;
          if (Array.isArray(raw)) {
            safeColors = raw;
          } else if (typeof raw === "string") {
            const parsed = JSON.parse(raw);
            safeColors = Array.isArray(parsed)
              ? parsed
              : Object.values(parsed || {});
          } else if (raw && typeof raw === "object") {
            safeColors = Object.values(raw);
          }
          safeColors = safeColors.map((c) => String(c).trim()).filter(Boolean);
        } catch {
          safeColors = [];
        }

        setColors(safeColors);

        setFitType(p.fitType || "Regular");
        setStyleVibe(p.styleVibe || "Streetwear");
        setRecommendationSection(p.recommendationSection || "none");
        setStyleTags(Array.isArray(p.styleTags) ? p.styleTags : []);
        setMatchWith(Array.isArray(p.matchWith) ? p.matchWith : []);

        setOldImages(Array.isArray(p.images) ? p.images : []);
        setImages([null, null, null, null]);

        setOldModel3d(p.model3d || "");
        setModel3d(null);

        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load product");
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!token) return toast.error("Admin not logged in!");
    if (!name.trim()) return toast.error("Product name is required");
    if (!sku.trim()) return toast.error("SKU is required");
    if (!category.trim()) return toast.error("Category is required");

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return toast.error("Please enter a valid price");
    }

    if (onSale) {
      const percent = Number(salePercent);
      if (
        !salePercent ||
        !Number.isFinite(percent) ||
        percent <= 0 ||
        percent > 100
      ) {
        return toast.error(
          "Please enter a valid sale percentage from 1 to 100"
        );
      }
    }

    const finalBranch = role === "admin" ? branch : userBranch;

    if (!finalBranch) {
      return toast.error("Please select a branch");
    }

    setSaving(true);

    try {
      const formData = new FormData();

      if (sizeChartImage) {
        formData.append("sizeChartImage", sizeChartImage);
      }

      formData.append("name", name.trim());
      formData.append("description", description || "");
      formData.append("price", numericPrice);
      formData.append("sku", sku.trim());
      formData.append("groupCode", groupCode.trim());

      formData.append("colorHex", colorHex || "#000000");
      formData.append("color", getColorNameFromHex(colorHex));

      formData.append("category", category);
      formData.append("branch", finalBranch);
      formData.append("bestseller", String(bestseller));
      formData.append("newArrival", String(newArrival));
      formData.append("onSale", String(onSale));
      formData.append("salePercent", onSale ? String(Number(salePercent)) : "0");

      formData.append("sizes", JSON.stringify(sizes));
      formData.append("stock", JSON.stringify(stock));
      formData.append("colors", JSON.stringify(colors));

      formData.append("fitType", fitType);
      formData.append("styleVibe", styleVibe);
      formData.append("recommendationSection", recommendationSection);
      formData.append("styleTags", JSON.stringify(styleTags));
      formData.append("matchWith", JSON.stringify(matchWith));

      images.forEach((img, i) => {
        if (img instanceof File) {
          formData.append(`image${i + 1}`, img);
        }
      });

      if (model3d instanceof File) {
        formData.append("model3d", model3d);
      }

      const response = editId
        ? await axios.put(
            `${backendUrl}/api/product/update/${editId}`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                token,
                "Content-Type": "multipart/form-data",
              },
            }
          )
        : await axios.post(`${backendUrl}/api/product/add`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              token,
              "Content-Type": "multipart/form-data",
            },
          });

      if (response.data.success) {
        toast.success(
          response.data.message || (editId ? "Product updated" : "Product added")
        );
        resetForm();
        setShowForm(false);
        setCurrentPage(1);
        await fetchList();
      } else {
        toast.error(response.data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("PRODUCT SUBMIT ERROR:", err);
      console.log("PRODUCT SUBMIT RESPONSE:", err?.response?.data);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save product"
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setSku("");
    setGroupCode("");
    setColorHex("#000000");
    setCategory("Tshirt");
    setBranch(role === "admin" ? activeBranches[0]?.code || "" : userBranch);
    setBestseller(false);
    setNewArrival(false);
    setOnSale(false);
    setSalePercent("");
    setSizes([]);
    setStock({
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      "2XL": 0,
      "3XL": 0,
    });
    setSizeChartImage(null);
    setOldSizeChartImage("");
    setColors([]);
    setColorInput("");
    setFitType("Regular");
    setStyleVibe("Streetwear");
    setRecommendationSection("none");
    setStyleTags([]);
    setStyleTagInput("");
    setMatchWith([]);
    setImages([null, null, null, null]);
    setOldImages([]);
    setModel3d(null);
    setOldModel3d("");
    setEditId(null);
  };

  const removeProduct = async (id) => {
    if (!window.confirm("Move this item to trash?")) return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/product/remove`,
        { id },
        axiosConfig
      );
      if (res.data.success) {
        toast.success("Item moved to trash");
        fetchList();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const getDiscountedPrice = (originalPrice, percent) => {
    const p = Number(originalPrice || 0);
    const d = Number(percent || 0);
    return (p - (p * d) / 100).toFixed(2);
  };

  const getBranchLabel = (branchCode) => {
    const normalized = String(branchCode || "").trim().toLowerCase();

    if (normalized === "all") return "All Branches";

    const match = activeBranches.find(
      (b) => String(b.code).trim().toLowerCase() === normalized
    );

    return match?.name || branchCode || "Unassigned";
  };

  const getPreviewLabel = (fileName) => {
    const value = String(fileName || "").toLowerCase();
    if (!value) return "";
    if (
      value.endsWith(".mp4") ||
      value.endsWith(".webm") ||
      value.endsWith(".ogg")
    ) {
      return "Video preview attached";
    }
    return "3D model attached";
  };

  const filteredList = useMemo(() => {
    let data = [...list];

    if (categoryFilter !== "all") {
      data = data.filter((item) => item.category === categoryFilter);
    }

    const term = search.trim().toLowerCase();
    if (!term) return data;

    return data.filter((item) => {
      return (
        String(item.name || "").toLowerCase().includes(term) ||
        String(item.sku || "").toLowerCase().includes(term) ||
        String(item.groupCode || "").toLowerCase().includes(term) ||
        String(item.category || "").toLowerCase().includes(term) ||
        String(item.branch || "").toLowerCase().includes(term)
      );
    });
  }, [list, search, categoryFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  const totalProducts = filteredList.length;
  const onSaleCount = filteredList.filter(
    (item) => item.onSale && Number(item.salePercent) > 0
  ).length;
  const newArrivalCount = filteredList.filter((item) => item.newArrival).length;
  const lowStockCount = filteredList.filter((item) => {
    const values = Object.values(item.stock || {});
    const total = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
    return total <= 5;
  }).length;

  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredList.length / pageSize);

  useEffect(() => {
    if (token) {
      fetchList();
      fetchBranches();
      fetchCategories();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#f8f7f4] flex items-center justify-center font-['Montserrat']">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-black/10 border-t-[#0A0D17] animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
            Loading Products
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f8f7f4] pt-20 px-2 sm:px-3 pb-6 overflow-hidden font-['Montserrat']">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <p className="text-[170px] md:text-[260px] font-black tracking-tighter text-black opacity-[0.03]">
          SAINT
        </p>
      </div>

      <div className="relative z-10 max-w-[1500px] mx-auto">
        <div className="rounded-[32px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.10),_transparent_34%),linear-gradient(135deg,#05070A_0%,#111827_45%,#1f2937_100%)] p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.22)] mb-4 text-white border border-white/10 overflow-hidden relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <img
                    src={assets.add_icon}
                    alt="Products"
                    className="w-5 h-5 object-contain invert opacity-95"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[28px] font-black tracking-[-0.03em] truncate">
                    Product Inventory
                  </h1>
                  <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                    {role === "admin"
                      ? "Manage products across active branches"
                      : `You are managing ${getBranchLabel(userBranch)} only`}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!showForm) resetForm();
                setShowForm((prev) => !prev);
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-white text-[#111111] px-5 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm"
            >
              {showForm ? "Close Form" : "Add Product"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <div className="rounded-[26px] border border-black/8 bg-white/75 backdrop-blur-md shadow-[0_18px_50px_rgba(0,0,0,0.06)] p-4">
            <p className="text-xs font-medium text-[#6b7280]">Total Products</p>
            <h2 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-[#0A0D17]">
              {totalProducts}
            </h2>
          </div>

          <div className="rounded-[26px] border border-black/8 bg-white/75 backdrop-blur-md shadow-[0_18px_50px_rgba(0,0,0,0.06)] p-4">
            <p className="text-xs font-medium text-[#6b7280]">On Sale</p>
            <h2 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-[#0A0D17]">
              {onSaleCount}
            </h2>
          </div>

          <div className="rounded-[26px] border border-black/8 bg-white/75 backdrop-blur-md shadow-[0_18px_50px_rgba(0,0,0,0.06)] p-4">
            <p className="text-xs font-medium text-[#6b7280]">New Arrival</p>
            <h2 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-[#0A0D17]">
              {newArrivalCount}
            </h2>
          </div>

          <div className="rounded-[26px] border border-black/8 bg-white/75 backdrop-blur-md shadow-[0_18px_50px_rgba(0,0,0,0.06)] p-4">
            <p className="text-xs font-medium text-[#6b7280]">Low Stock</p>
            <h2 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-red-500">
              {lowStockCount}
            </h2>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={onSubmitHandler}
            className="rounded-[30px] border border-black/8 bg-white/75 backdrop-blur-md shadow-[0_18px_50px_rgba(0,0,0,0.06)] p-5 sm:p-6 mb-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h3 className="text-[22px] font-black tracking-tight text-[#0A0D17]">
                  {editId ? "Edit Product" : "Add New Product"}
                </h3>
                <p className="text-sm text-[#6b7280] mt-1">
                  Fill in product information, inventory, sale status, and style
                  recommendation setup.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <div className="rounded-[24px] border border-black/[0.06] bg-white/60 p-4">
                  <p className="text-sm font-black text-[#6b7280] uppercase tracking-[0.18em] mb-3">
                    Upload Product Images
                  </p>

                  <div className="flex gap-3 flex-wrap">
                    {images.map((img, i) => {
                      const hasImage = img || oldImages[i];

                      return (
                        <label key={i} className="cursor-pointer">
                          <img
                            className={`w-24 h-28 border border-black/10 rounded-2xl bg-white ${
                              hasImage
                                ? "object-cover"
                                : "object-contain p-2 opacity-50"
                            }`}
                            src={
                              img
                                ? URL.createObjectURL(img)
                                : oldImages[i]
                                ? getMediaUrl(oldImages[i], backendUrl)
                                : assets.upload_area
                            }
                            alt=""
                          />
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setImages((prev) => {
                                const copy = [...prev];
                                copy[i] = file;
                                return copy;
                              });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/[0.06] bg-white/60 p-4">
                  <p className="text-sm font-black text-[#6b7280] uppercase tracking-[0.18em] mb-3">
                    Upload Size Chart Image
                  </p>

                  <label className="cursor-pointer inline-block">
                    <img
                      className={`w-40 h-40 border border-black/10 rounded-2xl bg-white ${
                        sizeChartImage || oldSizeChartImage
                          ? "object-cover"
                          : "object-contain p-3 opacity-50"
                      }`}
                      src={
                        sizeChartImage
                          ? URL.createObjectURL(sizeChartImage)
                          : oldSizeChartImage
                          ? getMediaUrl(oldSizeChartImage, backendUrl)
                          : assets.upload_area
                      }
                      alt="Size chart"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) =>
                        setSizeChartImage(e.target.files?.[0] || null)
                      }
                    />
                  </label>

                  <p className="text-xs text-[#6b7280] mt-2">
                    Upload your standard size guide image for this product.
                  </p>
                </div>

                <div className="rounded-[24px] border border-black/[0.06] bg-white/60 p-4">
                  <p className="text-sm font-black text-[#6b7280] mb-2 uppercase tracking-[0.18em]">
                    Upload 3D Model / Video Preview
                  </p>
                  <input
                    type="file"
                    accept=".glb,.gltf,.obj,.fbx,.mp4,.webm,.ogg"
                    onChange={(e) => setModel3d(e.target.files?.[0] || null)}
                    className="w-full border border-black/10 rounded-2xl px-3 py-2.5 bg-white"
                  />
                  <p className="text-xs text-[#6b7280] mt-2">
                    Supported: GLB, GLTF, OBJ, FBX, MP4, WEBM, OGG
                  </p>
                  {oldModel3d && !model3d && (
                    <p className="text-xs text-green-600 mt-2">
                      Current file: {oldModel3d}
                    </p>
                  )}
                  {model3d && (
                    <p className="text-xs text-blue-600 mt-2">
                      New file selected: {model3d.name}
                    </p>
                  )}
                </div>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Product Name"
                  className="px-4 py-3 border border-black/10 rounded-2xl bg-white"
                  required
                />

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  className="px-4 py-3 border border-black/10 rounded-2xl h-24 bg-white"
                />

                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU Code (e.g. SKU-001)"
                  className="px-4 py-3 border border-black/10 rounded-2xl bg-white"
                  required
                />

                <input
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  placeholder="Group Code (example: SHIRT-001)"
                  className="px-4 py-3 border border-black/10 rounded-2xl bg-white"
                />

                <div className="rounded-[24px] border border-black/[0.06] bg-white/60 p-4">
                  <p className="text-sm font-black text-[#6b7280] mb-2 uppercase tracking-[0.18em]">
                    Pick Color Hex
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-14 h-10 border border-black/10 rounded-xl cursor-pointer bg-white"
                    />
                    <input
                      value={colorHex}
                      readOnly
                      className="px-4 py-2 border border-black/10 rounded-xl flex-1 bg-white"
                    />
                  </div>
                  <p className="text-xs text-[#6b7280] mt-2">
                    Auto color name:{" "}
                    <span className="font-black">{autoColorName}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-white/60 border border-black/[0.06] rounded-[24px] p-4">
                  <p className="text-sm font-black text-[#6b7280] mb-3 uppercase tracking-[0.18em]">
                    Category Manager
                  </p>

                  <div className="flex gap-2">
                    <input
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Add new category"
                      className="border border-black/10 p-2.5 rounded-xl w-full bg-white"
                    />

                    <button
                      type="button"
                      onClick={addCustomCategory}
                      className="bg-black text-white px-4 rounded-xl font-bold"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {categoriesData.map((cat) => (
                      <div
                        key={cat._id}
                        className="flex items-center gap-1 bg-[#f2f2ef] px-2 py-1 rounded-lg text-xs"
                      >
                        <span>{cat.name}</span>

                        <button
                          type="button"
                          onClick={() => removeCustomCategory(cat._id, cat.name)}
                          className="text-red-600 font-bold hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="p-3 border border-black/10 rounded-2xl bg-white"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {role === "admin" ? (
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="p-3 border border-black/10 rounded-2xl bg-white"
                    required
                  >
                    <option value="">Select Branch</option>
                    <option value="all">All Branches</option>
                    {activeBranches.length > 0 ? (
                      activeBranches.map((b) => (
                        <option key={b._id || b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No active branches found</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={getBranchLabel(userBranch)}
                    disabled
                    className="p-3 border border-black/10 rounded-2xl bg-gray-100 text-gray-500"
                  />
                )}

                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  className="px-4 py-3 border border-black/10 rounded-2xl w-full bg-white"
                  required
                />

                <div className="border border-black/[0.06] rounded-[24px] p-4 bg-white/60 backdrop-blur-sm">
                  <label className="flex items-center gap-2 mb-3 font-semibold text-[#0A0D17]">
                    <input
                      type="checkbox"
                      checked={onSale}
                      onChange={() => {
                        setOnSale((prev) => !prev);
                        if (onSale) setSalePercent("");
                      }}
                    />
                    Put this product on sale
                  </label>

                  {onSale && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={salePercent}
                        onChange={(e) => setSalePercent(e.target.value)}
                        placeholder="Discount %"
                        className="px-4 py-2.5 border border-black/10 rounded-xl w-36 bg-white"
                      />
                      <span className="font-black text-[#6b7280]">%</span>
                    </div>
                  )}
                </div>

                <div className="bg-white/60 border border-black/[0.06] rounded-[24px] p-4">
                  <p className="text-sm font-black text-[#6b7280] mb-3 uppercase tracking-[0.18em]">
                    Sizes
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {SIZE_OPTIONS.map((size) => (
                      <span
                        key={size}
                        onClick={() =>
                          setSizes((prev) =>
                            prev.includes(size)
                              ? prev.filter((s) => s !== size)
                              : [...prev, size]
                          )
                        }
                        className={`px-3 py-2 border rounded-xl cursor-pointer text-sm font-semibold ${
                          sizes.includes(size)
                            ? "bg-black text-white border-black"
                            : "bg-white border-black/10"
                        }`}
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white/60 border border-black/[0.06] rounded-[24px] p-4">
                  <p className="text-sm font-black text-[#6b7280] mb-3 uppercase tracking-[0.18em]">
                    Stock Per Size
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {SIZE_OPTIONS.map((size) => (
                      <div key={size} className="flex flex-col">
                        <span className="text-[10px] font-black text-[#6b7280] mb-1">
                          {size}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={stock[size] === 0 ? "" : stock[size]}
                          onChange={(e) =>
                            setStock((prev) => ({
                              ...prev,
                              [size]:
                                e.target.value === ""
                                  ? 0
                                  : Math.max(0, Number(e.target.value)),
                            }))
                          }
                          className="w-full text-center border border-black/10 rounded-xl outline-none bg-white py-2.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/60 border border-black/[0.06] rounded-[24px] p-4">
                  <p className="text-sm font-black mb-2 text-[#0A0D17]">
                    Other Available Colors
                  </p>

                  <div className="flex gap-2">
                    <input
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      className="border border-black/10 p-2.5 rounded-xl w-full bg-white"
                      placeholder="Enter color"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = colorInput.trim();
                        if (!trimmed) return;

                        const exists = colors.some(
                          (c) => c.toLowerCase() === trimmed.toLowerCase()
                        );
                        if (exists) {
                          toast.error("Color already added");
                          return;
                        }

                        setColors((prev) => [...prev, trimmed]);
                        setColorInput("");
                      }}
                      className="bg-black text-white px-4 rounded-xl font-bold"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {colors.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 bg-[#f2f2ef] px-2 py-1 rounded-lg text-xs"
                      >
                        <span>{c}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setColors((prev) => prev.filter((_, x) => x !== i))
                          }
                          className="text-red-600 font-bold hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-black/[0.06] rounded-[24px] p-4 bg-white/60 backdrop-blur-sm">
                  <p className="text-sm font-black mb-3 text-[#0A0D17]">
                    Style Recommendation Setup
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs font-black text-[#6b7280] mb-1">
                        Fit Type
                      </p>
                      <select
                        value={fitType}
                        onChange={(e) => setFitType(e.target.value)}
                        className="w-full p-2.5 border border-black/10 rounded-xl bg-white"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Oversized">Oversized</option>
                        <option value="Boxy">Boxy</option>
                        <option value="Slim">Slim</option>
                      </select>
                    </div>

                    <div>
                      <p className="text-xs font-black text-[#6b7280] mb-1">
                        Style Vibe
                      </p>
                      <select
                        value={styleVibe}
                        onChange={(e) => setStyleVibe(e.target.value)}
                        className="w-full p-2.5 border border-black/10 rounded-xl bg-white"
                      >
                        <option value="Streetwear">Streetwear</option>
                        <option value="Minimal">Minimal</option>
                        <option value="Sporty">Sporty</option>
                        <option value="Clean">Clean</option>
                        <option value="Graphic">Graphic</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-black text-[#6b7280] mb-2">
                      Recommendation Position
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      {["top", "bottom", "both", "none"].map((pos) => (
                        <span
                          key={pos}
                          onClick={() => setRecommendationSection(pos)}
                          className={`px-3 py-1.5 border rounded-xl cursor-pointer text-xs font-semibold ${
                            recommendationSection === pos
                              ? "bg-black text-white border-black"
                              : "bg-white border-black/10"
                          }`}
                        >
                          {pos.toUpperCase()}
                        </span>
                      ))}
                    </div>

                    <p className="text-[10px] text-[#6b7280] mt-2 leading-5">
                      TOP = upper wear. BOTTOM = lower wear. BOTH = can appear
                      in both recommendation areas.
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-black text-[#6b7280] mb-2">
                      Style Tags
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={styleTagInput}
                        onChange={(e) => setStyleTagInput(e.target.value)}
                        className="border border-black/10 p-2.5 rounded-xl w-full bg-white"
                        placeholder="Add tag (example: minimal)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = styleTagInput.trim();
                          if (!trimmed) return;

                          const exists = styleTags.some(
                            (tag) => tag.toLowerCase() === trimmed.toLowerCase()
                          );
                          if (exists) {
                            toast.error("Style tag already added");
                            return;
                          }

                          setStyleTags((prev) => [...prev, trimmed]);
                          setStyleTagInput("");
                        }}
                        className="bg-black text-white px-4 rounded-xl font-bold"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex gap-2 mt-2 flex-wrap">
                      {styleTags.map((tag, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 bg-[#f2f2ef] px-2 py-1 rounded-lg text-xs"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setStyleTags((prev) =>
                                prev.filter((_, x) => x !== i)
                              )
                            }
                            className="text-red-600 font-bold hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black text-[#6b7280] mb-2">
                      Match With
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {CATEGORY_OPTIONS.map((item) => (
                        <span
                          key={item}
                          onClick={() =>
                            setMatchWith((prev) =>
                              prev.includes(item)
                                ? prev.filter((x) => x !== item)
                                : [...prev, item]
                            )
                          }
                          className={`px-3 py-1.5 border rounded-xl cursor-pointer text-xs font-semibold ${
                            matchWith.includes(item)
                              ? "bg-black text-white border-black"
                              : "bg-white border-black/10"
                          }`}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 font-semibold text-[#0A0D17]">
                  <input
                    type="checkbox"
                    checked={bestseller}
                    onChange={() => setBestseller(!bestseller)}
                  />
                  Bestseller
                </label>

                <label className="flex items-center gap-2 font-semibold text-[#0A0D17]">
                  <input
                    type="checkbox"
                    checked={newArrival}
                    onChange={() => setNewArrival(!newArrival)}
                  />
                  New Arrival
                </label>
              </div>
            </div>

            <button
              disabled={saving}
              className={`mt-6 px-6 py-3 text-white font-black rounded-2xl transition ${
                saving
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-black hover:bg-gray-800"
              }`}
            >
              {saving
                ? editId
                  ? "Updating..."
                  : "Adding..."
                : editId
                ? "Update Product"
                : "Add Product"}
            </button>
          </form>
        )}

        <div className="rounded-[30px] border border-black/8 bg-white/75 backdrop-blur-md shadow-[0_18px_50px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-5 border-b border-black/8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#6b7280]">
                  Inventory Table
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-[#0A0D17]">
                  Product List
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, SKU, group code, category"
                  className="px-4 py-3 rounded-2xl border border-black/10 bg-white text-sm min-w-[260px]"
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-3 rounded-2xl border border-black/10 bg-white text-sm"
                >
                  <option value="all">All Categories</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-[0.75fr_2.3fr_1fr_1fr_1fr_1fr] bg-[#0A0D17] text-white px-5 py-4 font-black text-[11px] uppercase tracking-[0.18em]">
            <span>Image</span>
            <span>Product</span>
            <span>Category</span>
            <span>Branch</span>
            <span>Price</span>
            <span>Actions</span>
          </div>

          {currentItems.length > 0 ? (
            currentItems.map((item, index) => (
              <div
                key={item._id}
                className={`grid grid-cols-1 md:grid-cols-[0.75fr_2.3fr_1fr_1fr_1fr_1fr] items-center border-b border-[#ecece6] px-5 py-4 gap-3 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                }`}
              >
                <img
                  src={
                    item.images?.[0]
                      ? getMediaUrl(item.images[0], backendUrl)
                      : assets.upload_area
                  }
                  className="w-16 h-20 object-cover rounded-2xl bg-white border border-black/10"
                  alt={item.name}
                />

                <div className="min-w-0">
                  <p className="font-black text-[#0A0D17] truncate">
                    {item.name}
                  </p>

                  {item.groupCode && (
                    <p className="text-[10px] text-[#6b7280] uppercase mt-1 font-semibold">
                      Group: {item.groupCode}
                    </p>
                  )}

                  {item.sku && (
                    <p className="text-[10px] text-[#6b7280] uppercase mt-1 font-semibold">
                      SKU: {item.sku}
                    </p>
                  )}

                  {(item.color || item.colorHex) && (
                    <div className="flex items-center gap-2 mt-1">
                      {item.colorHex && (
                        <span
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: item.colorHex }}
                        ></span>
                      )}
                      <p className="text-[10px] text-[#6b7280] uppercase font-semibold">
                        {item.color || getColorNameFromHex(item.colorHex)}{" "}
                        {item.colorHex ? `(${item.colorHex})` : ""}
                      </p>
                    </div>
                  )}

                  {item.fitType && (
                    <p className="text-[10px] text-[#6b7280] uppercase mt-1 font-semibold">
                      Fit: {item.fitType}
                    </p>
                  )}

                  {item.styleVibe && (
                    <p className="text-[10px] text-[#6b7280] uppercase font-semibold">
                      Vibe: {item.styleVibe}
                    </p>
                  )}

                  {item.recommendationSection &&
                    item.recommendationSection !== "none" && (
                      <p className="text-[10px] text-[#6b7280] uppercase font-semibold">
                        Position: {item.recommendationSection}
                      </p>
                    )}

                  {Array.isArray(item.styleTags) &&
                    item.styleTags.length > 0 && (
                      <p className="text-[10px] text-[#6b7280] uppercase font-semibold">
                        Tags: {item.styleTags.join(", ")}
                      </p>
                    )}

                  {item.onSale && Number(item.salePercent) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-600">
                        {item.salePercent}% OFF
                      </span>
                    </div>
                  )}

                  {item.model3d && (
                    <p className="text-xs text-blue-600 mt-2 font-semibold">
                      {getPreviewLabel(item.model3d)}
                    </p>
                  )}
                </div>

                <p className="text-[11px] uppercase text-[#6b7280] font-black">
                  {item.category}
                </p>

                <p className="text-[11px] uppercase font-black text-blue-600">
                  {getBranchLabel(item.branch)}
                </p>

                <div>
                  <p className="font-black text-[#0A0D17]">
                    {currency}
                    {Number(item.price).toFixed(2)}
                  </p>
                  {item.onSale && Number(item.salePercent) > 0 && (
                    <p className="text-xs text-red-500 font-bold mt-1">
                      {currency}
                      {getDiscountedPrice(item.price, item.salePercent)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 justify-center md:justify-start flex-wrap">
                  <button
                    onClick={() => fetchProduct(item._id)}
                    className="px-4 py-2 bg-[#0A0D17] text-white rounded-2xl text-sm font-black hover:bg-[#1d2433] transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeProduct(item._id)}
                    className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 rounded-2xl text-sm font-black hover:bg-red-500 hover:text-white transition"
                  >
                    Trash
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-[#6b7280] font-semibold">
              No products found
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2 flex-wrap">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3.5 py-1.5 border rounded-xl font-black ${
                  currentPage === i + 1
                    ? "bg-black text-white border-black"
                    : "bg-white/70 text-gray-900 border-[#d7d7d2]"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;