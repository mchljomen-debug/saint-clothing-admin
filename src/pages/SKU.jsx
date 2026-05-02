import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

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

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

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

  const getInventoryStatus = (totalStock) => {
    if (totalStock === 0) return "Out of Stock";
    if (totalStock <= 5) return "Critical";
    if (totalStock <= 10) return "Low Stock";
    return "Healthy";
  };

  const getInventoryStatusClass = (totalStock) => {
    if (totalStock === 0) {
      return "bg-red-100 text-red-700 border-red-200";
    }

    if (totalStock <= 5) {
      return "bg-orange-100 text-orange-700 border-orange-200";
    }

    if (totalStock <= 10) {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }

    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  const getStockBoxClass = (qty) => {
    if (qty === 0) return "bg-red-50 text-red-600 border-red-100";
    if (qty <= 5) return "bg-orange-50 text-orange-700 border-orange-100";
    if (qty <= 10) return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
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

        allProducts.forEach((product) => {
          initialStock[product._id] = {};

          sizesList.forEach((size) => {
            initialStock[product._id][size] = getStock(product.stock, size);
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
        const total = getTotalStock(product.stock);

        if (stockFilter === "Healthy") return total > 10;
        if (stockFilter === "Low") return total > 5 && total <= 10;
        if (stockFilter === "Critical") return total > 0 && total <= 5;
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

    const healthyStock = products.filter(
      (product) => getTotalStock(product.stock) > 10
    ).length;

    const lowStock = products.filter((product) => {
      const total = getTotalStock(product.stock);
      return total > 5 && total <= 10;
    }).length;

    const criticalStock = products.filter((product) => {
      const total = getTotalStock(product.stock);
      return total > 0 && total <= 5;
    }).length;

    const outStock = products.filter(
      (product) => getTotalStock(product.stock) === 0
    ).length;

    return {
      products: products.length,
      totalStock,
      healthyStock,
      lowStock,
      criticalStock,
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
    return sizesList
      .map((size) => {
        const oldQty = getStock(oldStock, size);
        const newQty = getStock(newStock, size);

        if (oldQty === newQty) return null;

        return {
          id: `${Date.now()}-${product._id}-${size}`,
          productId: product._id,
          productName: product.name,
          sku: product.sku || "N/A",
          size,
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

      sizesList.forEach((size) => {
        normalizedStock[size] = Number(stockUpdates?.[productId]?.[size] ?? 0);
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

        const updatedProducts = products.map((item) =>
          item._id === productId
            ? {
                ...item,
                stock: { ...normalizedStock },
              }
            : item
        );

        setProducts(updatedProducts);

        setSelectedProduct((prev) =>
          prev && prev._id === productId
            ? {
                ...prev,
                stock: { ...normalizedStock },
              }
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
      <div className="rounded-[22px] border border-black/10 bg-[#f7f7f4] shadow-[0_18px_60px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-6 md:px-8 py-7 bg-[#0A0D17]">
          <p className="text-white/45 text-[10px] font-black uppercase tracking-[0.34em]">
            Saint Clothing Admin
          </p>

          <div className="mt-2 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                Inventory Management
              </h2>

              <p className="mt-2 text-sm text-white/60 max-w-2xl">
                Monitor stock levels, update size inventory, and track critical
                stock before it becomes unavailable in the storefront.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchProducts}
              className="w-fit px-5 py-3 rounded-full bg-white text-[#0A0D17] text-[10px] font-black uppercase tracking-[0.2em]"
            >
              Refresh Stock
            </button>
          </div>
        </div>

        <div className="p-5 md:p-8">
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="rounded-[18px] bg-white border border-black/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                Products
              </p>
              <p className="mt-3 text-3xl font-black text-[#0A0D17]">
                {inventoryStats.products}
              </p>
            </div>

            <div className="rounded-[18px] bg-white border border-black/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                Total Units
              </p>
              <p className="mt-3 text-3xl font-black text-[#0A0D17]">
                {inventoryStats.totalStock}
              </p>
            </div>

            <div className="rounded-[18px] bg-white border border-emerald-200 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">
                Healthy
              </p>
              <p className="mt-3 text-3xl font-black text-emerald-700">
                {inventoryStats.healthyStock}
              </p>
            </div>

            <div className="rounded-[18px] bg-white border border-orange-200 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-700">
                Critical
              </p>
              <p className="mt-3 text-3xl font-black text-orange-700">
                {inventoryStats.criticalStock}
              </p>
            </div>

            <div className="rounded-[18px] bg-white border border-red-200 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-600">
                Out
              </p>
              <p className="mt-3 text-3xl font-black text-red-600">
                {inventoryStats.outStock}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] bg-white border border-black/10 p-5">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto] gap-4 items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                  Search Inventory
                </p>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product name or SKU..."
                  className="mt-3 w-full rounded-xl border border-black/10 px-4 py-3 text-sm font-bold outline-none focus:border-[#0A0D17]"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                  Category
                </p>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="mt-3 w-full xl:w-[220px] rounded-xl border border-black/10 px-4 py-3 text-sm font-bold outline-none focus:border-[#0A0D17]"
                >
                  {FIXED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                  Stock Status
                </p>

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="mt-3 w-full xl:w-[220px] rounded-xl border border-black/10 px-4 py-3 text-sm font-bold outline-none focus:border-[#0A0D17]"
                >
                  <option value="All">All</option>
                  <option value="Healthy">Healthy</option>
                  <option value="Low">Low Stock</option>
                  <option value="Critical">Critical</option>
                  <option value="Out">Out of Stock</option>
                </select>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  11+ Healthy
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  6-10 Low
                </p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">
                  1-5 Critical
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-700">
                  0 Out
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] bg-white border border-black/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                  Stock Inventory
                </p>

                <h3 className="text-lg font-black uppercase text-[#0A0D17]">
                  Product Stock Levels
                </h3>
              </div>

              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/45">
                {filteredProducts.length} items
              </p>
            </div>

            <div className="divide-y divide-black/10">
              {paginatedProducts.map((product) => {
                const totalStock = getTotalStock(product.stock);
                const status = getInventoryStatus(totalStock);
                const statusClass = getInventoryStatusClass(totalStock);

                return (
                  <div
                    key={product._id}
                    className="p-4 hover:bg-[#fafaf8] transition"
                  >
                    <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.8fr_1fr_auto] gap-4 xl:items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-xl bg-[#f0f0ed] overflow-hidden border border-black/10 shrink-0">
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
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-black/30">
                              IMG
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase text-[#0A0D17] truncate">
                            {product.name}
                          </p>

                          <p className="mt-1 text-[10px] font-bold text-[#0A0D17]/45 uppercase tracking-[0.14em]">
                            SKU: {product.sku || "N/A"}
                          </p>

                          <p className="mt-1 text-[10px] font-bold text-[#0A0D17]/35">
                            ₱{Number(product.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="xl:hidden text-[9px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/35 mb-1">
                          Category
                        </p>

                        <span className="inline-flex px-3 py-1 rounded-full bg-[#f3f3f1] border border-black/10 text-[10px] font-black uppercase text-[#0A0D17]/60">
                          {normalizeCategory(product.category) ||
                            "Uncategorized"}
                        </span>
                      </div>

                      <div>
                        <p className="xl:hidden text-[9px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/35 mb-2">
                          Size Stocks
                        </p>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {sizesList.map((size) => {
                            const qty = getStock(product.stock, size);

                            return (
                              <div
                                key={size}
                                className={`rounded-xl border p-2 text-center ${getStockBoxClass(
                                  qty
                                )}`}
                              >
                                <p className="text-[9px] font-black uppercase">
                                  {size}
                                </p>

                                <p className="mt-1 text-sm font-black">
                                  {qty}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex xl:flex-col items-center xl:items-end justify-between gap-3">
                        <div className="text-left xl:text-right">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/35">
                            Total
                          </p>

                          <p className="text-xl font-black text-[#0A0D17]">
                            {totalStock}
                          </p>

                          <span
                            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass}`}
                          >
                            {status}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                          className="px-5 py-2.5 rounded-full bg-[#0A0D17] text-white text-[10px] font-black uppercase tracking-[0.16em] shrink-0"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {paginatedProducts.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0A0D17]/35">
                  No inventory found
                </p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-5 flex justify-center items-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="px-5 py-3 rounded-full bg-[#0A0D17] text-white disabled:opacity-30 text-[10px] font-black uppercase tracking-[0.2em]"
              >
                Prev
              </button>

              <div className="px-4 py-3 rounded-full bg-white border border-black/10 text-[10px] font-black uppercase tracking-[0.2em]">
                {currentPage} / {totalPages}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="px-5 py-3 rounded-full bg-[#0A0D17] text-white disabled:opacity-30 text-[10px] font-black uppercase tracking-[0.2em]"
              >
                Next
              </button>
            </div>
          )}

          <div className="mt-5 rounded-[18px] bg-white border border-black/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                  Inventory History
                </p>

                <h3 className="text-lg font-black uppercase text-[#0A0D17]">
                  Recent Stock Updates
                </h3>
              </div>

              {inventoryLogs.length > 0 && (
                <button
                  type="button"
                  onClick={clearInventoryLogs}
                  className="px-4 py-2 rounded-full border border-black/10 text-[10px] font-black uppercase tracking-[0.16em]"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="divide-y divide-black/10">
              {inventoryLogs.length === 0 ? (
                <div className="px-4 py-10 text-center text-xs font-black uppercase tracking-[0.2em] text-[#0A0D17]/35">
                  No stock update logs yet
                </div>
              ) : (
                inventoryLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 lg:items-center"
                  >
                    <div>
                      <p className="text-xs font-black uppercase text-[#0A0D17]">
                        {log.productName}
                      </p>

                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0A0D17]/45">
                        SKU: {log.sku} • Size {log.size}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="rounded-full bg-[#f3f3f1] px-3 py-1 text-[10px] font-black text-[#0A0D17]/60">
                        Old: {log.oldQty}
                      </span>

                      <span className="rounded-full bg-[#f3f3f1] px-3 py-1 text-[10px] font-black text-[#0A0D17]/60">
                        New: {log.newQty}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black ${
                          log.difference > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
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
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-start justify-center pt-14 md:pt-20 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-[22px] overflow-hidden bg-white shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
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
                className="w-10 h-10 rounded-full bg-white/10 text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 bg-[#f7f7f4]">
              <div className="grid lg:grid-cols-[240px_1fr] gap-5">
                <div className="rounded-[18px] bg-white border border-black/10 overflow-hidden">
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
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                      Current Total Stock
                    </p>

                    <p className="mt-1 text-3xl font-black text-[#0A0D17]">
                      {getTotalStock(selectedProduct.stock)}
                    </p>

                    <span
                      className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getInventoryStatusClass(
                        getTotalStock(selectedProduct.stock)
                      )}`}
                    >
                      {getInventoryStatus(getTotalStock(selectedProduct.stock))}
                    </span>
                  </div>
                </div>

                <div className="rounded-[18px] bg-white border border-black/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
                    Stock Per Size
                  </p>

                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {sizesList.map((size) => {
                      const qty = Number(
                        stockUpdates[selectedProduct._id]?.[size] ?? 0
                      );

                      return (
                        <div
                          key={size}
                          className={`rounded-2xl border p-4 ${getStockBoxClass(
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
                            className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-center text-base font-black text-[#0A0D17] outline-none focus:border-[#0A0D17]"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
                      Critical Stock Reminder
                    </p>

                    <p className="mt-2 text-xs font-bold leading-5 text-orange-700/80">
                      If total stock reaches 1-5, it will be marked as Critical.
                      If it reaches 0, it becomes Out of Stock.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => updateStock(selectedProduct._id)}
                      className="px-6 py-3 rounded-full bg-[#0A0D17] text-white text-[11px] font-black uppercase tracking-[0.2em]"
                    >
                      Save Inventory
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="px-6 py-3 rounded-full bg-white border border-black/10 text-[#0A0D17] text-[11px] font-black uppercase tracking-[0.2em]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[18px] bg-white border border-black/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
                  Product Stock History
                </p>

                <div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto">
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
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-[11px] font-black uppercase text-[#0A0D17]">
                              Size {log.size}: {log.oldQty} → {log.newQty}
                            </p>

                            <span
                              className={`w-fit rounded-full px-3 py-1 text-[10px] font-black ${
                                log.difference > 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-600"
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