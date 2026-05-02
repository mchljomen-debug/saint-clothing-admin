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
  const [stockUpdates, setStockUpdates] = useState({});
  const [preorderUpdates, setPreorderUpdates] = useState({});
  const [preorderEnabled, setPreorderEnabled] = useState(true);
  const [preorderThreshold, setPreorderThreshold] = useState(5);
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
    if (status === "Out") return "bg-red-100 text-red-700 border-red-200";
    if (status === "Pre-order")
      return "bg-orange-100 text-orange-700 border-orange-200";
    if (status === "Critical")
      return "bg-orange-100 text-orange-700 border-orange-200";
    if (status === "Low") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
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

    const healthyStock = products.filter(
      (product) => getProductStatus(product) === "Healthy"
    ).length;

    const lowStock = products.filter(
      (product) => getProductStatus(product) === "Low"
    ).length;

    const criticalStock = products.filter(
      (product) => getProductStatus(product) === "Critical"
    ).length;

    const preorderStock = products.filter(
      (product) => getProductStatus(product) === "Pre-order"
    ).length;

    const outStock = products.filter(
      (product) => getProductStatus(product) === "Out"
    ).length;

    return {
      products: products.length,
      totalStock,
      totalPreorder,
      healthyStock,
      lowStock,
      criticalStock,
      preorderStock,
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
          preorderRestockDate,
          preorderNote,
          updatedBy: getAdminName(),
        },
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Inventory updated successfully");

        const updatedProducts = products.map((item) =>
          item._id === productId
            ? {
                ...item,
                stock: { ...normalizedStock },
                preorderStock: { ...normalizedPreorderStock },
                preorderEnabled,
                preorderThreshold,
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
                stock: { ...normalizedStock },
                preorderStock: { ...normalizedPreorderStock },
                preorderEnabled,
                preorderThreshold,
                preorderRestockDate: preorderRestockDate || null,
                preorderNote,
              }
            : prev
        );

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
        <div className="px-5 md:px-7 py-6 bg-[#0A0D17]">
          <p className="text-white/45 text-[10px] font-black uppercase tracking-[0.34em]">
            Saint Clothing Admin
          </p>

          <div className="mt-2 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                Inventory Management
              </h2>

              <p className="mt-2 text-sm text-white/60 max-w-2xl">
                Manage actual stock, pre-order allocation, auto pre-order
                threshold, and expected restock date.
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

        <div className="p-4 md:p-6">
          <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="rounded-[16px] bg-white border border-black/10 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0A0D17]/45">
                Products
              </p>
              <p className="mt-2 text-2xl font-black text-[#0A0D17]">
                {inventoryStats.products}
              </p>
            </div>

            <div className="rounded-[16px] bg-white border border-black/10 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0A0D17]/45">
                Actual Units
              </p>
              <p className="mt-2 text-2xl font-black text-[#0A0D17]">
                {inventoryStats.totalStock}
              </p>
            </div>

            <div className="rounded-[16px] bg-white border border-orange-200 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-700">
                Pre-order Units
              </p>
              <p className="mt-2 text-2xl font-black text-orange-700">
                {inventoryStats.totalPreorder}
              </p>
            </div>

            <div className="rounded-[16px] bg-white border border-emerald-200 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Healthy
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-700">
                {inventoryStats.healthyStock}
              </p>
            </div>

            <div className="rounded-[16px] bg-white border border-orange-200 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-700">
                Pre-order
              </p>
              <p className="mt-2 text-2xl font-black text-orange-700">
                {inventoryStats.preorderStock}
              </p>
            </div>

            <div className="rounded-[16px] bg-white border border-red-200 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-600">
                Out
              </p>
              <p className="mt-2 text-2xl font-black text-red-600">
                {inventoryStats.outStock}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[16px] bg-white border border-black/10 p-4">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_170px_190px] gap-3 items-end">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0A0D17]/45">
                  Search Inventory
                </p>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product name or SKU..."
                  className="mt-2 w-full rounded-xl border border-black/10 px-4 py-2.5 text-xs font-bold outline-none focus:border-[#0A0D17]"
                />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0A0D17]/45">
                  Category
                </p>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs font-bold outline-none focus:border-[#0A0D17]"
                >
                  {FIXED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0A0D17]/45">
                  Stock Status
                </p>

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs font-bold outline-none focus:border-[#0A0D17]"
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

            <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">
                  Healthy
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">
                  Low
                </p>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-700">
                  Critical
                </p>
              </div>

              <div className="rounded-xl border border-orange-300 bg-orange-100 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-800">
                  Pre-order
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-700">
                  Out
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[16px] bg-white border border-black/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-black/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0A0D17]/45">
                  Stock Inventory
                </p>

                <h3 className="text-base font-black uppercase text-[#0A0D17]">
                  Product Stock Table
                </h3>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">
                {filteredProducts.length} items
              </p>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse text-[10px]">
                <thead>
                  <tr className="bg-[#0A0D17] text-white">
                    <th className="w-[25%] px-2 py-3 text-left font-black uppercase tracking-[0.1em]">
                      Product
                    </th>
                    <th className="w-[9%] px-1 py-3 text-center font-black uppercase tracking-[0.08em]">
                      SKU
                    </th>
                    <th className="w-[9%] px-1 py-3 text-center font-black uppercase tracking-[0.08em]">
                      Cat.
                    </th>

                    {sizesList.map((size) => (
                      <th
                        key={size}
                        className="w-[5%] px-1 py-3 text-center font-black uppercase tracking-[0.06em]"
                      >
                        {size}
                      </th>
                    ))}

                    <th className="w-[6%] px-1 py-3 text-center font-black uppercase tracking-[0.06em]">
                      Actual
                    </th>

                    <th className="w-[6%] px-1 py-3 text-center font-black uppercase tracking-[0.06em]">
                      Pre
                    </th>

                    <th className="w-[10%] px-1 py-3 text-center font-black uppercase tracking-[0.06em]">
                      Status
                    </th>
                    <th className="w-[7%] px-1 py-3 text-center font-black uppercase tracking-[0.06em]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedProducts.map((product) => {
                    const totalStock = getTotalStock(product.stock);
                    const totalPreorder = getTotalStock(product.preorderStock);
                    const status = getProductStatus(product);

                    return (
                      <tr
                        key={product._id}
                        className="border-b border-black/5 hover:bg-[#fafaf8]"
                      >
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#f0f0ed] overflow-hidden border border-black/10 shrink-0">
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
                              <p className="text-[10px] font-black uppercase text-[#0A0D17] truncate">
                                {product.name}
                              </p>
                              <p className="mt-0.5 text-[9px] font-bold text-[#0A0D17]/40 truncate">
                                ₱{Number(product.price || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-1 py-2 text-center">
                          <p className="text-[9px] font-black text-[#0A0D17]/65 truncate">
                            {product.sku || "N/A"}
                          </p>
                        </td>

                        <td className="px-1 py-2 text-center">
                          <span className="inline-flex max-w-full rounded-full bg-[#f3f3f1] border border-black/10 px-2 py-1 text-[8px] font-black uppercase text-[#0A0D17]/60 truncate">
                            {normalizeCategory(product.category) || "None"}
                          </span>
                        </td>

                        {sizesList.map((size) => {
                          const qty = getStock(product.stock, size);

                          return (
                            <td key={size} className="px-1 py-2 text-center">
                              <span
                                className={`inline-flex min-w-[26px] justify-center rounded-md border px-1 py-1 text-[9px] font-black ${getStockBoxClass(
                                  qty
                                )}`}
                              >
                                {qty}
                              </span>
                            </td>
                          );
                        })}

                        <td className="px-1 py-2 text-center text-[10px] font-black text-[#0A0D17]">
                          {totalStock}
                        </td>

                        <td className="px-1 py-2 text-center text-[10px] font-black text-orange-700">
                          {totalPreorder}
                        </td>

                        <td className="px-1 py-2 text-center">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.06em] ${getInventoryStatusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-1 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => openInventoryModal(product)}
                            className="px-2.5 py-1.5 rounded-full bg-[#0A0D17] text-white text-[8px] font-black uppercase tracking-[0.1em]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {paginatedProducts.length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0A0D17]/35">
                    No inventory found
                  </p>
                </div>
              )}
            </div>
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
                {currentPage} / {totalPages || 1}
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

          <div className="mt-5 rounded-[16px] bg-white border border-black/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-black/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0A0D17]/45">
                  Inventory History
                </p>

                <h3 className="text-base font-black uppercase text-[#0A0D17]">
                  Recent Inventory Updates
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
                  No inventory update logs yet
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
                        SKU: {log.sku} • {log.stockType || "Actual"} • Size{" "}
                        {log.size}
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
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-start justify-center pt-14 md:pt-20 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-[22px] overflow-hidden bg-white shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
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
                <div className="rounded-[18px] bg-white border border-black/10 overflow-hidden h-fit">
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
                      Actual Stock
                    </p>

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
                      className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getInventoryStatusClass(
                        getProductStatus(selectedProduct)
                      )}`}
                    >
                      {getProductStatus(selectedProduct)}
                    </span>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[18px] bg-white border border-black/10 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
                      Actual Stock Per Size
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
                  </div>

                  <div className="rounded-[18px] bg-white border border-orange-200 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-700">
                          Pre-order Inventory
                        </p>
                        <p className="mt-1 text-xs font-bold text-orange-700/70">
                          Used when actual stock reaches the threshold.
                        </p>
                      </div>

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
                    </div>

                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {sizesList.map((size) => {
                        const qty = Number(
                          preorderUpdates[selectedProduct._id]?.[size] ?? 0
                        );

                        return (
                          <div
                            key={size}
                            className={`rounded-2xl border p-4 ${getPreorderBoxClass(
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
                              className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-center text-base font-black text-[#0A0D17] outline-none focus:border-orange-500"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/45">
                          Auto Pre-order Threshold
                        </p>

                        <input
                          type="number"
                          min={0}
                          value={preorderThreshold}
                          onChange={(e) =>
                            setPreorderThreshold(Number(e.target.value) || 5)
                          }
                          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-3 text-sm font-black outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/45">
                          Expected Restock Date
                        </p>

                        <input
                          type="date"
                          value={preorderRestockDate}
                          onChange={(e) =>
                            setPreorderRestockDate(e.target.value)
                          }
                          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-3 text-sm font-black outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/45">
                        Pre-order Note
                      </p>

                      <textarea
                        value={preorderNote}
                        onChange={(e) => setPreorderNote(e.target.value)}
                        placeholder="Example: Ships once restocked."
                        className="mt-2 w-full min-h-[90px] rounded-xl border border-black/10 px-3 py-3 text-sm font-bold outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
                        Auto Pre-order Rule
                      </p>

                      <p className="mt-2 text-xs font-bold leading-5 text-orange-700/80">
                        If actual stock is less than or equal to the threshold
                        and pre-order stock is available, the frontend will show
                        this product as Pre-order.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
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
                  Product Inventory History
                </p>

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
                          className="rounded-xl border border-black/10 bg-[#fafaf8] p-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-[11px] font-black uppercase text-[#0A0D17]">
                              {log.stockType || "Actual"} • Size {log.size}:{" "}
                              {log.oldQty} → {log.newQty}
                            </p>

                            <span
                              className={`w-fit rounded-full px-3 py-1 text-[10px] font-black ${
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