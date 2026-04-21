import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

const sizesList = ["XS", "S", "M", "L", "XL", "XXL"];
const ITEMS_PER_PAGE = 32;

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

const SKU = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockUpdates, setStockUpdates] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/product/list`, axiosConfig);

      if (res.data.success) {
        const allProducts = [...res.data.products].reverse();
        setProducts(allProducts);
        setFilteredProducts(allProducts);

        const initialStock = {};
        allProducts.forEach((p) => {
          initialStock[p._id] = {};
          sizesList.forEach((size) => {
            initialStock[p._id][size] = Number(
              p.stock?.[size] ?? p.stock?.get?.(size) ?? 0
            );
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
  }, [token]);

  const handleStockChange = (productId, size, value) => {
    setStockUpdates((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [size]: Number(value),
      },
    }));
  };

  const updateStock = async (productId) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/product/update-stock/${productId}`,
        { stock: stockUpdates[productId] },
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message);

        const updatedProducts = products.map((p) =>
          p._id === productId
            ? { ...p, stock: { ...stockUpdates[productId] } }
            : p
        );

        setProducts(updatedProducts);

        if (categoryFilter === "All") {
          setFilteredProducts(updatedProducts);
        } else {
          setFilteredProducts(
            updatedProducts.filter(
              (p) => normalizeCategory(p.category) === categoryFilter
            )
          );
        }

        setSelectedProduct(null);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleCategoryFilter = (cat) => {
    setCategoryFilter(cat);
    setCurrentPage(1);

    if (cat === "All") {
      setFilteredProducts(products);
      return;
    }

    setFilteredProducts(
      products.filter((p) => normalizeCategory(p.category) === cat)
    );
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

  const getCardImage = (product) => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return `${backendUrl}/uploads/${product.images[0]}`;
    }
    if (typeof product.images === "string" && product.images) {
      return `${backendUrl}/uploads/${product.images}`;
    }
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-black/20 border-t-black animate-spin" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.28em] text-[#0A0D17]">
            Loading SKU Management
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-['Montserrat'] pt-[40px]">
      <div className="rounded-[28px] border border-black/10 bg-gradient-to-br from-white via-[#f8f8f6] to-[#ececec] shadow-[0_18px_60px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="relative px-5 md:px-8 py-6 md:py-8 border-b border-black/10 bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%)] pointer-events-none" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.34em]">
                Saint Clothing Admin
              </p>
              <h2 className="mt-2 text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                SKU Management
              </h2>
              <p className="mt-2 text-sm text-white/70 max-w-2xl">
                Manage live stock per size with a cleaner premium dashboard layout.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Products
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {filteredProducts.length}
                </p>
              </div>

              <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Pages
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {totalPages || 1}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 md:px-8 py-5">
          <div className="mt-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/55">
                Filter by Category
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {FIXED_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryFilter(cat)}
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

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/50">
                  Current Page
                </p>
                <p className="mt-1 text-lg font-black text-[#0A0D17]">
                  {currentPage} / {totalPages || 1}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {paginatedProducts.map((product) => (
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
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#0A0D17]/35 text-xs font-black uppercase tracking-[0.22em]">
                      No Image
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/55 via-black/20 to-transparent">
                    <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 backdrop-blur px-3 py-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white">
                        {normalizeCategory(product.category) || "Uncategorized"}
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
                    <p className="text-lg font-black text-[#0A0D17]">
                      ₱{Number(product.price || 0).toLocaleString()}
                    </p>

                    <span className="px-2.5 py-1 rounded-full bg-[#0A0D17] text-white text-[9px] font-black uppercase tracking-[0.16em]">
                      Edit Stock
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {sizesList.map((size) => {
                      const qty =
                        Number(
                          product.stock?.[size] ??
                            product.stock?.get?.(size) ??
                            0
                        ) || 0;

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
            ))}
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
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#0A0D17]/35 text-xs font-black uppercase tracking-[0.22em]">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
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

                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                            value={stockUpdates[selectedProduct._id]?.[size] ?? 0}
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