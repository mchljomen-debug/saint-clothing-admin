import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import {
  FaBoxes,
  FaSearch,
  FaSyncAlt,
  FaEdit,
  FaHistory,
  FaTrash,
  FaStore,
  FaExclamationTriangle,
  FaClipboardList,
  FaCalendarAlt,
} from "react-icons/fa";

const sizesList = ["S", "M", "L", "XL", "2XL", "3XL"];
const ITEMS_PER_PAGE = 20;
const INVENTORY_LOG_KEY = "saint_inventory_logs";

const FIXED_CATEGORIES = [
  "All",
  "Tshirt",
  "Long Sleeve",
  "Jorts",
  "Mesh Short",
  "Crop Jersey",
];

const normalizeCategory = (value = "") => {
  const clean = String(value).trim().toLowerCase();

  if (clean === "jorts") return "Jorts";
  if (clean === "crop jersey" || clean === "cropjersey") return "Crop Jersey";
  if (clean === "mesh short" || clean === "mesh shorts") return "Mesh Short";
  if (clean === "long sleeve" || clean === "longsleeve") return "Long Sleeve";
  if (clean === "tshirt" || clean === "t-shirt" || clean === "tee")
    return "Tshirt";

  return String(value).trim();
};

const extractImage = (input) => {
  if (!input) return "";

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = extractImage(item);
      if (found) return found;
    }
    return "";
  }

  if (typeof input === "object") {
    return (
      input.secure_url ||
      input.url ||
      input.image ||
      input.src ||
      input.path ||
      input.filename ||
      ""
    );
  }

  return String(input).trim();
};

const getStock = (stock, size) => {
  if (!stock) return 0;

  const key = String(size || "").toUpperCase();

  if (typeof stock.get === "function") {
    return Number(stock.get(key) || 0);
  }

  return Number(stock[key] || 0);
};

const getTotalStock = (stock) =>
  sizesList.reduce((sum, size) => sum + getStock(stock, size), 0);

const getAdminName = () =>
  localStorage.getItem("adminName") ||
  localStorage.getItem("name") ||
  localStorage.getItem("username") ||
  localStorage.getItem("email") ||
  localStorage.getItem("role") ||
  "Admin";

const formatDateInput = (dateValue) => {
  if (!dateValue) return "";

  try {
    return new Date(dateValue).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const SKU = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stockUpdates, setStockUpdates] = useState({});
  const [preorderUpdates, setPreorderUpdates] = useState({});

  const [preorderEnabled, setPreorderEnabled] = useState(true);
  const [preorderThreshold, setPreorderThreshold] = useState(5);
  const [preorderAutoGenerate, setPreorderAutoGenerate] = useState(true);
  const [preorderAutoStock, setPreorderAutoStock] = useState(20);
  const [preorderRestockDate, setPreorderRestockDate] = useState("");
  const [preorderNote, setPreorderNote] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [inventoryLogs, setInventoryLogs] = useState([]);

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
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

  const getCardImage = (product) => {
    const img = extractImage(product?.images);

    if (!img) return "";

    if (
      img.startsWith("http://") ||
      img.startsWith("https://") ||
      img.startsWith("data:")
    ) {
      return img;
    }

    if (img.startsWith("/uploads/")) return `${backendUrl}${img}`;
    if (img.startsWith("uploads/")) return `${backendUrl}/${img}`;

    return `${backendUrl}/uploads/${img}`;
  };

  const getProductPreorderThreshold = (product) =>
    Number(product?.preorderThreshold ?? 5);

  const getProductStatus = (product) => {
    const actualTotal = getTotalStock(product?.stock);
    const preorderTotal = getTotalStock(product?.preorderStock);
    const threshold = getProductPreorderThreshold(product);
    const enabled = product?.preorderEnabled !== false;

    if (actualTotal === 0 && (!enabled || preorderTotal <= 0)) return "Out";
    if (enabled && actualTotal <= threshold && preorderTotal > 0)
      return "Pre-order";
    if (actualTotal <= 5) return "Critical";
    if (actualTotal <= 10) return "Low";
    return "Healthy";
  };

  const getInventoryStatusClass = (status) => {
    if (status === "Out") return "bg-red-50 text-red-700 border-red-200";
    if (status === "Pre-order")
      return "bg-orange-50 text-orange-700 border-orange-200";
    if (status === "Critical")
      return "bg-orange-50 text-orange-700 border-orange-200";
    if (status === "Low") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const getStockBoxClass = (qty) => {
    if (qty === 0) return "bg-red-50 text-red-600 border-red-100";
    if (qty <= 5) return "bg-orange-50 text-orange-700 border-orange-100";
    if (qty <= 10) return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  };

  const getPreorderBoxClass = (qty) => {
    if (qty <= 0) return "bg-white text-[#0A0D17]/40 border-orange-100";
    return "bg-orange-50 text-orange-700 border-orange-200";
  };

  const loadInventoryLogs = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(INVENTORY_LOG_KEY) || "[]");
      setInventoryLogs(Array.isArray(saved) ? saved : []);
    } catch {
      setInventoryLogs([]);
    }
  };

  const saveInventoryLogs = (logs) => {
    const limitedLogs = logs.slice(0, 100);
    localStorage.setItem(INVENTORY_LOG_KEY, JSON.stringify(limitedLogs));
    setInventoryLogs(limitedLogs);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setRefreshing(true);

    try {
      const res = await axios.get(`${backendUrl}/api/product/list`, axiosConfig);

      if (res.data.success) {
        const allProducts = [...res.data.products].reverse();
        setProducts(allProducts);

        const initialStock = {};
        const initialPreorderStock = {};

        allProducts.forEach((product) => {
          initialStock[product._id] = {};
          initialPreorderStock[product._id] = {};

          sizesList.forEach((size) => {
            initialStock[product._id][size] = getStock(product.stock, size);
            initialPreorderStock[product._id][size] = getStock(
              product.preorderStock,
              size
            );
          });
        });

        setStockUpdates(initialStock);
        setPreorderUpdates(initialPreorderStock);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) fetchProducts();
    loadInventoryLogs();
  }, [token]);

  useEffect(() => {
    let result = [...products];

    if (categoryFilter !== "All") {
      result = result.filter(
        (product) => normalizeCategory(product.category) === categoryFilter
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase();

      result = result.filter(
        (product) =>
          product.name?.toLowerCase().includes(term) ||
          product.sku?.toLowerCase().includes(term)
      );
    }

    if (stockFilter !== "All") {
      result = result.filter((product) => {
        const status = getProductStatus(product);

        if (stockFilter === "Healthy") return status === "Healthy";
        if (stockFilter === "Low") return status === "Low";
        if (stockFilter === "Critical") return status === "Critical";
        if (stockFilter === "Pre-order") return status === "Pre-order";
        if (stockFilter === "Out") return status === "Out";

        return true;
      });
    }

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [products, categoryFilter, stockFilter, search]);

  const inventoryStats = useMemo(() => {
    const totalStock = products.reduce(
      (sum, product) => sum + getTotalStock(product.stock),
      0
    );

    const totalPreorder = products.reduce(
      (sum, product) => sum + getTotalStock(product.preorderStock),
      0
    );

    return {
      products: products.length,
      totalStock,
      totalPreorder,
      healthyStock: products.filter((p) => getProductStatus(p) === "Healthy")
        .length,
      lowStock: products.filter((p) => getProductStatus(p) === "Low").length,
      criticalStock: products.filter((p) => getProductStatus(p) === "Critical")
        .length,
      preorderStock: products.filter((p) => getProductStatus(p) === "Pre-order")
        .length,
      outStock: products.filter((p) => getProductStatus(p) === "Out").length,
    };
  }, [products]);

  const handleStockChange = (productId, size, value) => {
    const safeValue = Math.max(0, Number(value) || 0);

    setStockUpdates((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [String(size).toUpperCase()]: safeValue,
      },
    }));
  };

  const handlePreorderChange = (productId, size, value) => {
    const safeValue = Math.max(0, Number(value) || 0);

    setPreorderUpdates((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [String(size).toUpperCase()]: safeValue,
      },
    }));
  };

  const openInventoryModal = (product) => {
    const actualInitial = {};
    const preorderInitial = {};

    sizesList.forEach((size) => {
      actualInitial[size] = getStock(product.stock, size);
      preorderInitial[size] = getStock(product.preorderStock, size);
    });

    setSelectedProduct(product);

    setStockUpdates((prev) => ({
      ...prev,
      [product._id]: actualInitial,
    }));

    setPreorderUpdates((prev) => ({
      ...prev,
      [product._id]: preorderInitial,
    }));

    setPreorderEnabled(product.preorderEnabled !== false);
    setPreorderThreshold(Number(product.preorderThreshold ?? 5));
    setPreorderAutoGenerate(product.preorderAutoGenerate !== false);
    setPreorderAutoStock(Number(product.preorderAutoStock ?? 20));
    setPreorderRestockDate(formatDateInput(product.preorderRestockDate));
    setPreorderNote(product.preorderNote || "");
  };

  const createStockChangeLogs = (
    product,
    oldStock,
    newStock,
    type = "Actual"
  ) => {
    return sizesList
      .map((size) => {
        const oldQty = getStock(oldStock, size);
        const newQty = getStock(newStock, size);

        if (oldQty === newQty) return null;

        return {
          id: `${Date.now()}-${product._id}-${type}-${size}`,
          productId: product._id,
          productName: product.name,
          sku: product.sku || "N/A",
          size,
          stockType: type,
          oldQty,
          newQty,
          difference: newQty - oldQty,
          updatedBy: getAdminName(),
          updatedAt: new Date().toISOString(),
        };
      })
      .filter(Boolean);
  };

  const updateStock = async (productId) => {
    try {
      const product = products.find((item) => item._id === productId);

      if (!product) {
        toast.error("Product not found");
        return;
      }

      const normalizedStock = {};
      const normalizedPreorderStock = {};

      sizesList.forEach((size) => {
        normalizedStock[size] = Number(stockUpdates?.[productId]?.[size] ?? 0);
        normalizedPreorderStock[size] = Number(
          preorderUpdates?.[productId]?.[size] ?? 0
        );
      });

      const actualLogs = createStockChangeLogs(
        product,
        product.stock,
        normalizedStock,
        "Actual"
      );

      const preorderLogs = createStockChangeLogs(
        product,
        product.preorderStock,
        normalizedPreorderStock,
        "Pre-order"
      );

      const metaChanged =
        Boolean(product.preorderEnabled !== false) !== Boolean(preorderEnabled) ||
        Number(product.preorderThreshold ?? 5) !== Number(preorderThreshold) ||
        Boolean(product.preorderAutoGenerate !== false) !==
          Boolean(preorderAutoGenerate) ||
        Number(product.preorderAutoStock ?? 20) !== Number(preorderAutoStock) ||
        formatDateInput(product.preorderRestockDate) !== preorderRestockDate ||
        String(product.preorderNote || "") !== String(preorderNote || "");

      if (actualLogs.length === 0 && preorderLogs.length === 0 && !metaChanged) {
        toast.info("No inventory changes detected");
        return;
      }

      const res = await axios.put(
        `${backendUrl}/api/product/update-stock/${productId}`,
        {
          stock: normalizedStock,
          preorderStock: normalizedPreorderStock,
          preorderEnabled,
          preorderThreshold,
          preorderAutoGenerate,
          preorderAutoStock,
          preorderRestockDate,
          preorderNote,
          updatedBy: getAdminName(),
        },
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Inventory updated successfully");

        const updatedProductFromServer = res.data.product || {};
        const finalStock = updatedProductFromServer.stock || {
          ...normalizedStock,
        };
        const finalPreorderStock =
          updatedProductFromServer.preorderStock || normalizedPreorderStock;

        const updatedProducts = products.map((item) =>
          item._id === productId
            ? {
                ...item,
                stock: finalStock,
                preorderStock: finalPreorderStock,
                preorderEnabled,
                preorderThreshold,
                preorderAutoGenerate,
                preorderAutoStock,
                preorderRestockDate: preorderRestockDate || null,
                preorderNote,
              }
            : item
        );

        setProducts(updatedProducts);

        setSelectedProduct((prev) =>
          prev && prev._id === productId
            ? {
                ...prev,
                stock: finalStock,
                preorderStock: finalPreorderStock,
                preorderEnabled,
                preorderThreshold,
                preorderAutoGenerate,
                preorderAutoStock,
                preorderRestockDate: preorderRestockDate || null,
                preorderNote,
              }
            : prev
        );

        setPreorderUpdates((prev) => ({
          ...prev,
          [productId]: sizesList.reduce((acc, size) => {
            acc[size] = getStock(finalPreorderStock, size);
            return acc;
          }, {}),
        }));

        const metaLog = metaChanged
          ? [
              {
                id: `${Date.now()}-${product._id}-preorder-settings`,
                productId: product._id,
                productName: product.name,
                sku: product.sku || "N/A",
                size: "Settings",
                stockType: "Pre-order",
                oldQty: "-",
                newQty: "-",
                difference: 0,
                updatedBy: getAdminName(),
                updatedAt: new Date().toISOString(),
              },
            ]
          : [];

        saveInventoryLogs([
          ...actualLogs,
          ...preorderLogs,
          ...metaLog,
          ...inventoryLogs,
        ]);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const clearInventoryLogs = () => {
    localStorage.removeItem(INVENTORY_LOG_KEY);
    setInventoryLogs([]);
    toast.success("Inventory logs cleared");
  };

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-3 pt-24 font-['Montserrat']">
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-[5px] bg-white/70" />
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 rounded-[5px] bg-white/70" />
            ))}
          </div>
          <div className="h-96 rounded-[5px] bg-white/70" />
        </div>
      </div>
    );
  }

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
                  <FaBoxes className="text-sm" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
                    Inventory Management
                  </h1>
                  <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                    Manage actual stock, pre-order allocation, auto slots,
                    thresholds, and restock dates.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchProducts}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm disabled:opacity-50"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              Refresh Stock
            </button>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17]">
                Stock Overview
              </h3>
              <p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">
                Live inventory summary from product stock and pre-order stock.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              {
                label: "Products",
                value: inventoryStats.products,
                icon: <FaStore />,
                className: "text-[#0A0D17]",
              },
              {
                label: "Actual Units",
                value: inventoryStats.totalStock,
                icon: <FaBoxes />,
                className: "text-[#0A0D17]",
              },
              {
                label: "Pre-order Units",
                value: inventoryStats.totalPreorder,
                icon: <FaClipboardList />,
                className: "text-orange-700",
              },
              {
                label: "Healthy",
                value: inventoryStats.healthyStock,
                icon: <FaBoxes />,
                className: "text-emerald-700",
              },
              {
                label: "Pre-order",
                value: inventoryStats.preorderStock,
                icon: <FaCalendarAlt />,
                className: "text-orange-700",
              },
              {
                label: "Out",
                value: inventoryStats.outStock,
                icon: <FaExclamationTriangle />,
                className: "text-red-600",
              },
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
                    {item.icon}
                  </div>
                </div>

                <h2
                  className={`text-[24px] sm:text-[28px] font-black leading-none tracking-[-0.03em] ${item.className}`}
                >
                  {item.value}
                </h2>
              </div>
            ))}
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_180px_210px] gap-3 items-end">
            <div>
              <p className={labelClass}>Search Inventory</p>

              <div className="relative mt-2">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0D17]/35 text-sm" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product name or SKU..."
                  className="w-full rounded-[5px] border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Category</p>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`${inputClass} mt-2`}
              >
                {FIXED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className={labelClass}>Stock Status</p>

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className={`${inputClass} mt-2`}
              >
                <option value="All">All</option>
                <option value="Healthy">Healthy</option>
                <option value="Low">Low Stock</option>
                <option value="Critical">Critical</option>
                <option value="Pre-order">Pre-order</option>
                <option value="Out">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] overflow-hidden mb-4`}>
          <div className="px-4 sm:px-5 py-5 border-b border-black/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className={labelClass}>Stock Inventory</p>
                <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                  Product Stock Table
                </h3>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">
                {filteredProducts.length} items
              </p>
            </div>
          </div>

          <div className="overflow-auto">
            <div className="min-w-[1150px]">
              <div className="grid grid-cols-[2.2fr_1fr_1fr_repeat(6,70px)_90px_90px_120px_100px] bg-[#0A0D17] text-white px-5 py-4 font-black text-[11px] uppercase tracking-[0.12em]">
                <span>Product</span>
                <span className="text-center">SKU</span>
                <span className="text-center">Category</span>

                {sizesList.map((size) => (
                  <span key={size} className="text-center">
                    {size}
                  </span>
                ))}

                <span className="text-center">Actual</span>
                <span className="text-center">Pre</span>
                <span className="text-center">Status</span>
                <span className="text-center">Action</span>
              </div>

              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((product, index) => {
                  const totalStock = getTotalStock(product.stock);
                  const totalPreorder = getTotalStock(product.preorderStock);
                  const status = getProductStatus(product);

                  return (
                    <div
                      key={product._id}
                      className={`grid grid-cols-[2.2fr_1fr_1fr_repeat(6,70px)_90px_90px_120px_100px] items-center border-b border-[#ecece6] px-5 py-4 gap-2 ${
                        index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-14 rounded-[5px] bg-[#f0f0ed] overflow-hidden border border-black/10 shrink-0">
                          {getCardImage(product) ? (
                            <img
                              src={getCardImage(product)}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-black/30">
                              IMG
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase text-[#0A0D17] truncate">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold text-[#0A0D17]/40 truncate">
                            ₱{Number(product.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <p className="text-center text-[11px] font-black text-[#0A0D17]/65 truncate">
                        {product.sku || "N/A"}
                      </p>

                      <div className="text-center">
                        <span className="inline-flex max-w-full rounded-[5px] bg-[#f3f3f1] border border-black/10 px-2 py-1 text-[9px] font-black uppercase text-[#0A0D17]/60 truncate">
                          {normalizeCategory(product.category) || "None"}
                        </span>
                      </div>

                      {sizesList.map((size) => {
                        const qty = getStock(product.stock, size);

                        return (
                          <div key={size} className="text-center">
                            <span
                              className={`inline-flex min-w-[34px] justify-center rounded-[5px] border px-2 py-1.5 text-[10px] font-black ${getStockBoxClass(
                                qty
                              )}`}
                            >
                              {qty}
                            </span>
                          </div>
                        );
                      })}

                      <p className="text-center text-sm font-black text-[#0A0D17]">
                        {totalStock}
                      </p>

                      <p className="text-center text-sm font-black text-orange-700">
                        {totalPreorder}
                      </p>

                      <div className="text-center">
                        <span
                          className={`inline-flex rounded-[5px] border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.06em] ${getInventoryStatusClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => openInventoryModal(product)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A0D17] text-white rounded-[5px] text-xs font-black hover:bg-[#1d2433] transition"
                        >
                          <FaEdit />
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-[#6b7280] font-semibold bg-white">
                  No inventory found
                </div>
              )}
            </div>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mb-4 flex justify-center items-center gap-2 flex-wrap">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className={buttonDark}
            >
              Prev
            </button>

            <div className="px-4 py-2.5 rounded-[5px] bg-white border border-black/10 text-xs font-black uppercase tracking-[0.16em]">
              {currentPage} / {totalPages || 1}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className={buttonDark}
            >
              Next
            </button>
          </div>
        )}

        <div className={`${panelBg} rounded-[5px] overflow-hidden`}>
          <div className="px-4 sm:px-5 py-5 border-b border-black/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className={labelClass}>Inventory History</p>
              <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                Recent Inventory Updates
              </h3>
            </div>

            {inventoryLogs.length > 0 && (
              <button
                type="button"
                onClick={clearInventoryLogs}
                className={buttonLight}
              >
                <FaTrash />
                Clear Logs
              </button>
            )}
          </div>

          <div className="divide-y divide-black/10">
            {inventoryLogs.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs font-black uppercase tracking-[0.2em] text-[#0A0D17]/35">
                No inventory update logs yet
              </div>
            ) : (
              inventoryLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 lg:items-center"
                >
                  <div>
                    <p className="text-sm font-black uppercase text-[#0A0D17]">
                      {log.productName}
                    </p>

                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0A0D17]/45">
                      SKU: {log.sku} • {log.stockType || "Actual"} • Size{" "}
                      {log.size}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className="rounded-[5px] bg-[#f3f3f1] px-3 py-1 text-[10px] font-black text-[#0A0D17]/60">
                      Old: {log.oldQty}
                    </span>

                    <span className="rounded-[5px] bg-[#f3f3f1] px-3 py-1 text-[10px] font-black text-[#0A0D17]/60">
                      New: {log.newQty}
                    </span>

                    <span
                      className={`rounded-[5px] px-3 py-1 text-[10px] font-black ${
                        log.difference > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : log.difference < 0
                            ? "bg-red-50 text-red-600"
                            : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {log.difference > 0
                        ? `+${log.difference}`
                        : log.difference}
                    </span>
                  </div>

                  <p className="text-[10px] font-bold text-[#0A0D17]/45">
                    Updated by {log.updatedBy}
                  </p>

                  <p className="text-[10px] font-bold text-[#0A0D17]/35">
                    {new Date(log.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-start justify-center pt-14 md:pt-20 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-[5px] overflow-hidden bg-white shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
            <div className="px-6 py-5 bg-[#0A0D17] flex justify-between gap-4">
              <div>
                <p className="text-white/45 text-[10px] font-black uppercase tracking-[0.28em]">
                  Update Inventory
                </p>

                <h3 className="mt-2 text-xl font-black uppercase text-white">
                  {selectedProduct.name}
                </h3>

                <p className="mt-1 text-white/45 text-[11px] font-bold uppercase tracking-[0.14em]">
                  SKU: {selectedProduct.sku || "N/A"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="w-10 h-10 rounded-[5px] bg-white/10 text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-[#f7f7f4]">
              <div className="grid lg:grid-cols-[240px_1fr] gap-4">
                <div className={`${panelBg} rounded-[5px] overflow-hidden h-fit`}>
                  <div className="h-[240px] bg-[#eeeeeb]">
                    {getCardImage(selectedProduct) ? (
                      <img
                        src={getCardImage(selectedProduct)}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-black uppercase tracking-[0.2em] text-[#0A0D17]/30">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className={labelClass}>Actual Stock</p>

                    <p className="mt-1 text-3xl font-black text-[#0A0D17]">
                      {getTotalStock(selectedProduct.stock)}
                    </p>

                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-orange-700">
                      Pre-order Stock
                    </p>

                    <p className="mt-1 text-3xl font-black text-orange-700">
                      {getTotalStock(selectedProduct.preorderStock)}
                    </p>

                    <span
                      className={`mt-3 inline-flex rounded-[5px] border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getInventoryStatusClass(
                        getProductStatus(selectedProduct)
                      )}`}
                    >
                      {getProductStatus(selectedProduct)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`${panelBg} rounded-[5px] p-4 sm:p-5`}>
                    <p className={labelClass}>Actual Stock Per Size</p>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {sizesList.map((size) => {
                        const qty = Number(
                          stockUpdates[selectedProduct._id]?.[size] ?? 0
                        );

                        return (
                          <div
                            key={size}
                            className={`rounded-[5px] border p-4 ${getStockBoxClass(
                              qty
                            )}`}
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                              Size {size}
                            </p>

                            <input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={(e) =>
                                handleStockChange(
                                  selectedProduct._id,
                                  size,
                                  e.target.value
                                )
                              }
                              className="mt-3 w-full rounded-[5px] border border-black/10 bg-white px-3 py-3 text-center text-base font-black text-[#0A0D17] outline-none focus:border-[#0A0D17]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[5px] bg-white border border-orange-200 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-700">
                          Pre-order Inventory
                        </p>
                        <p className="mt-1 text-xs font-bold text-orange-700/70">
                          Auto-generates slots when actual stock reaches the
                          threshold.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0D17]">
                          <input
                            type="checkbox"
                            checked={preorderEnabled}
                            onChange={(e) =>
                              setPreorderEnabled(e.target.checked)
                            }
                          />
                          Enable Pre-order
                        </label>

                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0D17]">
                          <input
                            type="checkbox"
                            checked={preorderAutoGenerate}
                            onChange={(e) =>
                              setPreorderAutoGenerate(e.target.checked)
                            }
                          />
                          Auto Generate
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {sizesList.map((size) => {
                        const qty = Number(
                          preorderUpdates[selectedProduct._id]?.[size] ?? 0
                        );

                        return (
                          <div
                            key={size}
                            className={`rounded-[5px] border p-4 ${getPreorderBoxClass(
                              qty
                            )}`}
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                              Pre-order {size}
                            </p>

                            <input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={(e) =>
                                handlePreorderChange(
                                  selectedProduct._id,
                                  size,
                                  e.target.value
                                )
                              }
                              className="mt-3 w-full rounded-[5px] border border-black/10 bg-white px-3 py-3 text-center text-base font-black text-[#0A0D17] outline-none focus:border-orange-500"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className={labelClass}>Auto Pre-order Threshold</p>

                        <input
                          type="number"
                          min={0}
                          value={preorderThreshold}
                          onChange={(e) =>
                            setPreorderThreshold(Number(e.target.value) || 5)
                          }
                          className={`${inputClass} mt-2`}
                        />
                      </div>

                      <div>
                        <p className={labelClass}>Auto Generate Slots</p>

                        <input
                          type="number"
                          min={0}
                          value={preorderAutoStock}
                          onChange={(e) =>
                            setPreorderAutoStock(Number(e.target.value) || 20)
                          }
                          className={`${inputClass} mt-2`}
                        />
                      </div>

                      <div>
                        <p className={labelClass}>Expected Restock Date</p>

                        <input
                          type="date"
                          value={preorderRestockDate}
                          onChange={(e) =>
                            setPreorderRestockDate(e.target.value)
                          }
                          className={`${inputClass} mt-2`}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className={labelClass}>Pre-order Note</p>

                      <textarea
                        value={preorderNote}
                        onChange={(e) => setPreorderNote(e.target.value)}
                        placeholder="Example: Ships once restocked."
                        className="mt-2 w-full min-h-[90px] rounded-[5px] border border-black/10 px-3 py-3 text-sm font-bold outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="mt-4 rounded-[5px] border border-orange-200 bg-orange-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
                        Auto Pre-order Rule
                      </p>

                      <p className="mt-2 text-xs font-bold leading-5 text-orange-700/80">
                        If actual stock is less than or equal to the threshold
                        and Auto Generate is enabled, saving inventory will
                        create pre-order slots using the Auto Generate Slots
                        value.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateStock(selectedProduct._id)}
                      className={buttonDark}
                    >
                      Save Inventory
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className={buttonLight}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              <div className={`${panelBg} mt-4 rounded-[5px] p-4 sm:p-5`}>
                <div className="flex items-center gap-2">
                  <FaHistory className="text-[#0A0D17]/45" />
                  <p className={labelClass}>Product Inventory History</p>
                </div>

                <div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto">
                  {inventoryLogs.filter(
                    (log) => log.productId === selectedProduct._id
                  ).length === 0 ? (
                    <p className="text-xs font-bold text-[#0A0D17]/40">
                      No inventory history for this product yet.
                    </p>
                  ) : (
                    inventoryLogs
                      .filter((log) => log.productId === selectedProduct._id)
                      .map((log) => (
                        <div
                          key={log.id}
                          className="rounded-[5px] border border-black/10 bg-[#fafaf8] p-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-[11px] font-black uppercase text-[#0A0D17]">
                              {log.stockType || "Actual"} • Size {log.size}:{" "}
                              {log.oldQty} → {log.newQty}
                            </p>

                            <span
                              className={`w-fit rounded-[5px] px-3 py-1 text-[10px] font-black ${
                                log.difference > 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : log.difference < 0
                                    ? "bg-red-50 text-red-600"
                                    : "bg-orange-50 text-orange-700"
                              }`}
                            >
                              {log.difference > 0
                                ? `+${log.difference}`
                                : log.difference}
                            </span>
                          </div>

                          <p className="mt-1 text-[10px] font-bold text-[#0A0D17]/45">
                            Updated by {log.updatedBy} •{" "}
                            {new Date(log.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SKU;