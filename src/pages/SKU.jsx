import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

const sizesList = ["S", "M", "L", "XL", "2XL", "3XL"];
const ITEMS_PER_PAGE = 32;
const INVENTORY_LOG_KEY = "saint_inventory_logs";

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

const FIXED_CATEGORIES = [
  "All",
  "Tshirt",
  "Long Sleeve",
  "Jorts",
  "Mesh Short",
  "Crop Jersey",
];

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

const getTotalStock = (stock) => {
  return sizesList.reduce((sum, size) => sum + getStock(stock, size), 0);
};

const getAdminName = () => {
  return (
    localStorage.getItem("adminName") ||
    localStorage.getItem("name") ||
    localStorage.getItem("username") ||
    localStorage.getItem("email") ||
    localStorage.getItem("role") ||
    "Admin"
  );
};

const SKU = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockUpdates, setStockUpdates] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [inventoryLogs, setInventoryLogs] = useState([]);

  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

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
    try {
      const res = await axios.get(`${backendUrl}/api/product/list`, axiosConfig);

      if (res.data.success) {
        const allProducts = [...res.data.products].reverse();
        setProducts(allProducts);

        const initialStock = {};
        allProducts.forEach((p) => {
          initialStock[p._id] = {};
          sizesList.forEach((size) => {
            initialStock[p._id][size] = getStock(p.stock, size);
          });
        });

        setStockUpdates(initialStock);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
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
        (p) => normalizeCategory(p.category) === categoryFilter
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term)
      );
    }

    if (stockFilter !== "All") {
      result = result.filter((p) => {
        const total = getTotalStock(p.stock);

        if (stockFilter === "Healthy") return total > 5;
        if (stockFilter === "Low") return total > 0 && total <= 5;
        if (stockFilter === "Out") return total === 0;

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

    const lowStock = products.filter((product) => {
      const total = getTotalStock(product.stock);
      return total > 0 && total <= 5;
    }).length;

    const outStock = products.filter(
      (product) => getTotalStock(product.stock) === 0
    ).length;

    return {
      products: products.length,
      totalStock,
      lowStock,
      outStock,
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

  const createStockChangeLogs = (product, oldStock, newStock) => {
    const changedSizes = sizesList
      .map((size) => {
        const oldQty = getStock(oldStock, size);
        const newQty = getStock(newStock, size);

        if (oldQty === newQty) return null;

        return {
          size,
          oldQty,
          newQty,
          difference: newQty - oldQty,
        };
      })
      .filter(Boolean);

    if (changedSizes.length === 0) return [];

    return changedSizes.map((change) => ({
      id: `${Date.now()}-${product._id}-${change.size}`,
      productId: product._id,
      productName: product.name,
      sku: product.sku || "N/A",
      category: normalizeCategory(product.category) || "Uncategorized",
      size: change.size,
      oldQty: change.oldQty,
      newQty: change.newQty,
      difference: change.difference,
      updatedBy: getAdminName(),
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateStock = async (productId) => {
    try {
      const product = products.find((p) => p._id === productId);

      if (!product) {
        toast.error("Product not found");
        return;
      }

      const normalizedStock = {};
      sizesList.forEach((size) => {
        normalizedStock[String(size).toUpperCase()] = Number(
          stockUpdates?.[productId]?.[String(size).toUpperCase()] ?? 0
        );
      });

      const newLogs = createStockChangeLogs(
        product,
        product.stock,
        normalizedStock
      );

      if (newLogs.length === 0) {
        toast.info("No stock changes detected");
        return;
      }

      const res = await axios.put(
        `${backendUrl}/api/product/update-stock/${productId}`,
        {
          stock: normalizedStock,
          updatedBy: getAdminName(),
        },
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Stock updated successfully");

        const updatedProducts = products.map((p) =>
          p._id === productId ? { ...p, stock: { ...normalizedStock } } : p
        );

        setProducts(updatedProducts);

        setSelectedProduct((prev) =>
          prev && prev._id === productId
            ? { ...prev, stock: { ...normalizedStock } }
            : null
        );

        saveInventoryLogs([...newLogs, ...inventoryLogs]);
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

  const getStockColor = (qty) => {
    if (qty === 0) return "bg-red-500/90 text-white border-red-400/40";
    if (qty <= 5) return "bg-amber-400 text-black border-amber-300/40";
    return "bg-emerald-500/90 text-white border-emerald-400/40";
  };

  const getDifferenceLabel = (difference) => {
    if (difference > 0) return `+${difference}`;
    return String(difference);
  };

  const getDifferenceColor = (difference) => {
    if (difference > 0) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (difference < 0) return "text-red-600 bg-red-50 border-red-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-black/20 border-t-black animate-spin" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.28em] text-[#0A0D17]">
            Loading Inventory Management
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-['Montserrat'] pt-[60px]">
      <div className="rounded-[28px] border border-black/10 bg-gradient-to-br from-white via-[#f8f8f6] to-[#ececec] shadow-[0_18px_60px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="relative px-5 md:px-8 py-6 md:py-8 border-b border-black/10 bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%)] pointer-events-none" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.34em]">
                Saint Clothing Admin
              </p>

              <h2 className="mt-2 text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                Inventory Management
              </h2>

              <p className="mt-2 text-sm text-white/70 max-w-2xl">
                Manage live product stock per size and track inventory update
                history.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Products
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {inventoryStats.products}
                </p>
              </div>

              <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Total Stock
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {inventoryStats.totalStock}
                </p>
              </div>

              <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Low Stock
                </p>
                <p className="mt-1 text-xl font-black text-amber-300">
                  {inventoryStats.lowStock}
                </p>
              </div>

              <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Out
                </p>
                <p className="mt-1 text-xl font-black text-red-300">
                  {inventoryStats.outStock}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 md:px-8 py-5">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
            <div>
              <div className="rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-sm">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/55">
                        Filter by Category
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {FIXED_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
                              categoryFilter === cat
                                ? "bg-[#0A0D17] text-white border-[#0A0D17] shadow-[0_10px_24px_rgba(10,13,23,0.22)]"
                                : "bg-white text-[#0A0D17] border-black/10 hover:border-black hover:bg-[#f5f5f4]"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:max-w-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/55">
                        Search
                      </p>

                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search product or SKU..."
                        className="mt-4 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#0A0D17] outline-none focus:border-[#0A0D17]"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/55">
                      Stock Status
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {["All", "Healthy", "Low", "Out"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStockFilter(status)}
                          className={`px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
                            stockFilter === status
                              ? "bg-[#0A0D17] text-white border-[#0A0D17] shadow-[0_10px_24px_rgba(10,13,23,0.22)]"
                              : "bg-white text-[#0A0D17] border-black/10 hover:border-black hover:bg-[#f5f5f4]"
                          }`}
                        >
                          {status === "Out" ? "Out of Stock" : status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                {paginatedProducts.map((product) => {
                  const totalStock = getTotalStock(product.stock);

                  return (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="text-left group rounded-[24px] border border-black/10 bg-white/90 backdrop-blur shadow-[0_12px_34px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_44px_rgba(0,0,0,0.12)] hover:border-black/20 transition-all overflow-hidden"
                    >
                      <div className="relative h-44 bg-gradient-to-br from-[#efefef] via-white to-[#e8e8e8] overflow-hidden">
                        {getCardImage(product) ? (
                          <img
                            src={getCardImage(product)}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#0A0D17]/35 text-xs font-black uppercase tracking-[0.22em]">
                            No Image
                          </div>
                        )}

                        <div className="absolute left-3 top-3">
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.16em] ${
                              totalStock === 0
                                ? "bg-red-500 text-white"
                                : totalStock <= 5
                                ? "bg-amber-400 text-black"
                                : "bg-emerald-500 text-white"
                            }`}
                          >
                            {totalStock === 0
                              ? "Out of Stock"
                              : totalStock <= 5
                              ? "Low Stock"
                              : "Healthy"}
                          </span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/55 via-black/20 to-transparent">
                          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 backdrop-blur px-3 py-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white">
                              {normalizeCategory(product.category) ||
                                "Uncategorized"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="min-h-[58px]">
                          <h3 className="text-sm font-black uppercase tracking-tight text-[#0A0D17] line-clamp-2">
                            {product.name}
                          </h3>

                          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0A0D17]/45 line-clamp-1">
                            SKU: {product.sku || "N/A"}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-[#0A0D17]">
                              ₱{Number(product.price || 0).toLocaleString()}
                            </p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/45">
                              Total Stock: {totalStock}
                            </p>
                          </div>

                          <span className="px-2.5 py-1 rounded-full bg-[#0A0D17] text-white text-[9px] font-black uppercase tracking-[0.16em]">
                            Edit Stock
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2">
                          {sizesList.map((size) => {
                            const qty = getStock(product.stock, size);

                            return (
                              <div
                                key={size}
                                className={`rounded-xl border px-2 py-2 text-center ${getStockColor(
                                  qty
                                )}`}
                              >
                                <p className="text-[9px] font-black uppercase tracking-[0.14em]">
                                  {size}
                                </p>
                                <p className="mt-1 text-xs font-black">{qty}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {paginatedProducts.length === 0 && (
                <div className="mt-8 rounded-[24px] border border-dashed border-black/15 bg-white/60 py-16 text-center">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0A0D17]/40">
                    No products found
                  </p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-8 gap-3">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="px-5 py-3 rounded-full bg-[#0A0D17] text-white disabled:opacity-30 text-[10px] font-black uppercase tracking-[0.24em] shadow-[0_10px_24px_rgba(10,13,23,0.2)]"
                  >
                    Prev
                  </button>

                  <div className="px-4 py-3 rounded-full border border-black/10 bg-white text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]">
                    {currentPage} / {totalPages}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="px-5 py-3 rounded-full bg-[#0A0D17] text-white disabled:opacity-30 text-[10px] font-black uppercase tracking-[0.24em] shadow-[0_10px_24px_rgba(10,13,23,0.2)]"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-black/10 bg-white/90 p-5 shadow-sm h-fit xl:sticky xl:top-24">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
                    Inventory History
                  </p>
                  <h3 className="mt-1 text-lg font-black uppercase text-[#0A0D17]">
                    Stock Update Logs
                  </h3>
                </div>

                {inventoryLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={clearInventoryLogs}
                    className="px-3 py-2 rounded-full border border-black/10 bg-white text-[9px] font-black uppercase tracking-[0.16em] text-[#0A0D17] hover:bg-[#f4f4f3]"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-5 max-h-[680px] overflow-y-auto pr-1">
                {inventoryLogs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-[#fafaf8] p-6 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0A0D17]/35">
                      No inventory updates yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inventoryLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-black/10 bg-[#fafaf8] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase text-[#0A0D17] line-clamp-2">
                              {log.productName}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0A0D17]/45">
                              SKU: {log.sku} • Size {log.size}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-black ${getDifferenceColor(
                              log.difference
                            )}`}
                          >
                            {getDifferenceLabel(log.difference)}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-white border border-black/5 p-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/35">
                              Old
                            </p>
                            <p className="text-sm font-black text-[#0A0D17]">
                              {log.oldQty}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white border border-black/5 p-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/35">
                              New
                            </p>
                            <p className="text-sm font-black text-[#0A0D17]">
                              {log.newQty}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-black/10 pt-3">
                          <p className="text-[10px] font-bold text-[#0A0D17]/55">
                            Updated by{" "}
                            <span className="font-black text-[#0A0D17]">
                              {log.updatedBy}
                            </span>
                          </p>
                          <p className="mt-1 text-[10px] font-bold text-[#0A0D17]/40">
                            {new Date(log.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-black/10 bg-[#0A0D17] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                  Note
                </p>
                <p className="mt-2 text-xs leading-5 text-white/70">
                  These logs are saved in this admin browser. For permanent logs
                  shared across all admins, connect this to your backend activity
                  logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-start justify-center pt-14 md:pt-20 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-[28px] overflow-hidden border border-white/10 shadow-[0_28px_100px_rgba(0,0,0,0.35)] bg-white">
            <div className="px-6 md:px-8 py-5 bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937] flex items-start justify-between gap-4">
              <div>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.28em]">
                  Edit Stock
                </p>

                <h3 className="mt-2 text-xl md:text-2xl font-black uppercase text-white leading-tight">
                  {selectedProduct.name}
                </h3>

                <p className="mt-1 text-white/55 text-[11px] font-bold uppercase tracking-[0.14em]">
                  SKU: {selectedProduct.sku || "N/A"}
                </p>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white text-xl leading-none hover:bg-white/10 transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 md:p-8 bg-gradient-to-br from-white via-[#fafaf8] to-[#eeeeea]">
              <div className="grid lg:grid-cols-[260px_1fr] gap-6">
                <div className="rounded-[24px] overflow-hidden border border-black/10 bg-white shadow-sm">
                  <div className="h-[260px] bg-gradient-to-br from-[#efefef] via-white to-[#e8e8e8]">
                    {getCardImage(selectedProduct) ? (
                      <img
                        src={getCardImage(selectedProduct)}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#0A0D17]/35 text-xs font-black uppercase tracking-[0.22em]">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                      Total Stock
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#0A0D17]">
                      {getTotalStock(selectedProduct.stock)}
                    </p>

                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                      Price
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#0A0D17]">
                      ₱{Number(selectedProduct.price || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
                      Per Size Inventory
                    </p>

                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {sizesList.map((size) => (
                        <div
                          key={size}
                          className="rounded-2xl border border-black/10 bg-[#fafaf8] p-3"
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/55 text-center">
                            {size}
                          </p>

                          <input
                            type="number"
                            min={0}
                            value={
                              stockUpdates[selectedProduct._id]?.[
                                String(size).toUpperCase()
                              ] ?? 0
                            }
                            onChange={(e) =>
                              handleStockChange(
                                selectedProduct._id,
                                size,
                                e.target.value
                              )
                            }
                            className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-center text-sm font-black text-[#0A0D17] outline-none focus:border-[#0A0D17]"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => updateStock(selectedProduct._id)}
                        className="px-6 py-3 rounded-full bg-[#0A0D17] text-white text-[11px] font-black uppercase tracking-[0.24em] shadow-[0_12px_24px_rgba(10,13,23,0.22)] hover:translate-y-[-1px] transition"
                      >
                        Update Stock
                      </button>

                      <button
                        onClick={() => setSelectedProduct(null)}
                        className="px-6 py-3 rounded-full border border-black/10 bg-white text-[#0A0D17] text-[11px] font-black uppercase tracking-[0.24em] hover:bg-[#f4f4f3] transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
                      Stock Guide
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-3 py-2 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.16em]">
                        6+ Healthy Stock
                      </span>
                      <span className="px-3 py-2 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-[0.16em]">
                        1-5 Low Stock
                      </span>
                      <span className="px-3 py-2 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.16em]">
                        0 Out of Stock
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
                      Product Stock History
                    </p>

                    <div className="mt-4 max-h-[220px] overflow-y-auto space-y-2">
                      {inventoryLogs.filter(
                        (log) => log.productId === selectedProduct._id
                      ).length === 0 ? (
                        <p className="text-xs font-bold text-[#0A0D17]/40">
                          No stock history for this product yet.
                        </p>
                      ) : (
                        inventoryLogs
                          .filter((log) => log.productId === selectedProduct._id)
                          .map((log) => (
                            <div
                              key={log.id}
                              className="rounded-xl border border-black/10 bg-[#fafaf8] p-3"
                            >
                              <div className="flex justify-between gap-3">
                                <p className="text-[11px] font-black uppercase text-[#0A0D17]">
                                  Size {log.size}: {log.oldQty} → {log.newQty}
                                </p>

                                <span
                                  className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${getDifferenceColor(
                                    log.difference
                                  )}`}
                                >
                                  {getDifferenceLabel(log.difference)}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default SKU;