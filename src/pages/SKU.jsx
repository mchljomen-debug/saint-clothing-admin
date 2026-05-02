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
  if (clean === "tshirt" || clean === "t-shirt" || clean === "tee") return "Tshirt";

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
    return input.secure_url || input.url || input.image || input.src || input.path || input.filename || "";
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

  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  const getCardImage = (product) => {
    const img = extractImage(product?.images);
    if (!img) return "";

    if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) {
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
      result = result.filter((p) => normalizeCategory(p.category) === categoryFilter);
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
    const totalStock = products.reduce((sum, product) => sum + getTotalStock(product.stock), 0);

    const lowStock = products.filter((product) => {
      const total = getTotalStock(product.stock);
      return total > 0 && total <= 5;
    }).length;

    const outStock = products.filter((product) => getTotalStock(product.stock) === 0).length;

    return {
      products: products.length,
      totalStock,
      lowStock,
      outStock,
    };
  }, [products]);

  const getStatus = (totalStock) => {
    if (totalStock === 0) return "Out of Stock";
    if (totalStock <= 5) return "Low Stock";
    return "Healthy";
  };

  const getStatusClass = (totalStock) => {
    if (totalStock === 0) return "bg-red-50 text-red-600 border-red-200";
    if (totalStock <= 5) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const getStockCellClass = (qty) => {
    if (qty === 0) return "bg-red-50 text-red-600 border-red-100";
    if (qty <= 5) return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  };

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
      const product = products.find((p) => p._id === productId);

      if (!product) {
        toast.error("Product not found");
        return;
      }

      const normalizedStock = {};
      sizesList.forEach((size) => {
        normalizedStock[size] = Number(stockUpdates?.[productId]?.[size] ?? 0);
      });

      const newLogs = createStockChangeLogs(product, product.stock, normalizedStock);

      if (newLogs.length === 0) {
        toast.info("No stock changes detected");
        return;
      }

      const res = await axios.put(
        `${backendUrl}/api/product/update-stock/${productId}`,
        { stock: normalizedStock, updatedBy: getAdminName() },
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Stock updated successfully");

        const updatedProducts = products.map((p) =>
          p._id === productId ? { ...p, stock: { ...normalizedStock } } : p
        );

        setProducts(updatedProducts);
        setSelectedProduct((prev) =>
          prev && prev._id === productId ? { ...prev, stock: { ...normalizedStock } } : null
        );

        saveInventoryLogs([...newLogs, ...inventoryLogs]);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
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
              <p className="mt-2 text-sm text-white/60">
                Monitor stock levels, update size inventory, and review stock movement history.
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
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-[18px] bg-white border border-black/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                Total Products
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

            <div className="rounded-[18px] bg-white border border-amber-200 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">
                Low Stock
              </p>
              <p className="mt-3 text-3xl font-black text-amber-700">
                {inventoryStats.lowStock}
              </p>
            </div>

            <div className="rounded-[18px] bg-white border border-red-200 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-600">
                Out of Stock
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
                  <option value="Out">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] bg-white border border-black/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                  Stock Table
                </p>
                <h3 className="text-lg font-black uppercase text-[#0A0D17]">
                  Product Inventory
                </h3>
              </div>

              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/45">
                {filteredProducts.length} items
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] border-collapse">
                <thead>
                  <tr className="bg-[#0A0D17] text-white">
                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em]">
                      Product
                    </th>
                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em]">
                      SKU
                    </th>
                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em]">
                      Category
                    </th>
                    {sizesList.map((size) => (
                      <th
                        key={size}
                        className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-[0.18em]"
                      >
                        {size}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-[0.18em]">
                      Total
                    </th>
                    <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-[0.18em]">
                      Status
                    </th>
                    <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-[0.18em]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedProducts.map((product) => {
                    const totalStock = getTotalStock(product.stock);

                    return (
                      <tr key={product._id} className="border-b border-black/5 hover:bg-[#fafaf8]">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#f0f0ed] overflow-hidden border border-black/10">
                              {getCardImage(product) ? (
                                <img
                                  src={getCardImage(product)}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                            </div>

                            <div>
                              <p className="text-xs font-black uppercase text-[#0A0D17] line-clamp-1">
                                {product.name}
                              </p>
                              <p className="mt-1 text-[10px] font-bold text-[#0A0D17]/40">
                                ₱{Number(product.price || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-xs font-black text-[#0A0D17]/70">
                          {product.sku || "N/A"}
                        </td>

                        <td className="px-4 py-4">
                          <span className="px-3 py-1 rounded-full bg-[#f3f3f1] border border-black/10 text-[10px] font-black uppercase text-[#0A0D17]/60">
                            {normalizeCategory(product.category) || "Uncategorized"}
                          </span>
                        </td>

                        {sizesList.map((size) => {
                          const qty = getStock(product.stock, size);

                          return (
                            <td key={size} className="px-4 py-4 text-center">
                              <span
                                className={`inline-flex min-w-[38px] justify-center rounded-lg border px-2 py-1 text-xs font-black ${getStockCellClass(
                                  qty
                                )}`}
                              >
                                {qty}
                              </span>
                            </td>
                          );
                        })}

                        <td className="px-4 py-4 text-center text-sm font-black text-[#0A0D17]">
                          {totalStock}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClass(
                              totalStock
                            )}`}
                          >
                            {getStatus(totalStock)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => setSelectedProduct(product)}
                            className="px-4 py-2 rounded-full bg-[#0A0D17] text-white text-[10px] font-black uppercase tracking-[0.16em]"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
            <div className="px-5 py-4 border-b border-black/10 flex justify-between items-center">
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
                  onClick={() => {
                    localStorage.removeItem(INVENTORY_LOG_KEY);
                    setInventoryLogs([]);
                    toast.success("Inventory logs cleared");
                  }}
                  className="px-4 py-2 rounded-full border border-black/10 text-[10px] font-black uppercase tracking-[0.16em]"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-[#fafaf8] border-b border-black/10">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em]">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em]">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em]">
                      Size
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em]">
                      Old
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em]">
                      New
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em]">
                      Changed
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em]">
                      Updated By
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em]">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {inventoryLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-10 text-center text-xs font-black uppercase tracking-[0.2em] text-[#0A0D17]/35">
                        No stock update logs yet
                      </td>
                    </tr>
                  ) : (
                    inventoryLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="border-b border-black/5">
                        <td className="px-4 py-3 text-xs font-black uppercase text-[#0A0D17]">
                          {log.productName}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-[#0A0D17]/60">
                          {log.sku}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-black">
                          {log.size}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-black">
                          {log.oldQty}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-black">
                          {log.newQty}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black ${
                              log.difference > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {log.difference > 0 ? `+${log.difference}` : log.difference}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-[#0A0D17]/60">
                          {log.updatedBy}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-[#0A0D17]/40">
                          {new Date(log.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                    {getCardImage(selectedProduct) && (
                      <img
                        src={getCardImage(selectedProduct)}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                      Current Total Stock
                    </p>
                    <p className="mt-1 text-3xl font-black text-[#0A0D17]">
                      {getTotalStock(selectedProduct.stock)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[18px] bg-white border border-black/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
                    Stock Per Size
                  </p>

                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {sizesList.map((size) => (
                      <div key={size} className="rounded-2xl border border-black/10 bg-[#fafaf8] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/55">
                          Size {size}
                        </p>

                        <input
                          type="number"
                          min={0}
                          value={stockUpdates[selectedProduct._id]?.[size] ?? 0}
                          onChange={(e) =>
                            handleStockChange(selectedProduct._id, size, e.target.value)
                          }
                          className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-center text-base font-black text-[#0A0D17] outline-none focus:border-[#0A0D17]"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => updateStock(selectedProduct._id)}
                      className="px-6 py-3 rounded-full bg-[#0A0D17] text-white text-[11px] font-black uppercase tracking-[0.2em]"
                    >
                      Save Inventory
                    </button>

                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="px-6 py-3 rounded-full bg-white border border-black/10 text-[#0A0D17] text-[11px] font-black uppercase tracking-[0.2em]"
                    >
                      Cancel
                    </button>
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