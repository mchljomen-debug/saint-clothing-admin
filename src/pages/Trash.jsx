import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Pagination } from "antd";

const Trash = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 8;

  const fetchTrash = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/product/trash`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setProducts(Array.isArray(res.data.products) ? res.data.products : []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const restore = async (id) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/product/restore`,
        { id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success("Product restored successfully");
        fetchTrash();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const permanentDelete = async (id) => {
    if (!window.confirm("Permanent delete cannot be undone. Continue?")) return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/product/permanent-delete`,
        { id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success("Product permanently deleted");
        fetchTrash();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    if (token) fetchTrash();
  }, [token]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((p) => {
      return (
        String(p.name || "").toLowerCase().includes(term) ||
        String(p.category || "").toLowerCase().includes(term) ||
        String(p.sku || "").toLowerCase().includes(term) ||
        String(p.groupCode || "").toLowerCase().includes(term) ||
        String(p.branch || "").toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const summary = useMemo(() => {
    const total = products.length;
    const showing = filteredProducts.length;
    const withImages = filteredProducts.filter(
      (p) => Array.isArray(p.images) && p.images.length > 0
    ).length;

    return {
      total,
      showing,
      withImages,
      pages: Math.ceil(showing / pageSize) || 1,
    };
  }, [products, filteredProducts]);

  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentProducts = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#f8f7f4] flex items-center justify-center font-['Montserrat']">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-black/10 border-t-[#0A0D17] animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A0D17]/45">
            Loading Trash
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-['Montserrat'] pt-[40px] bg-[#f8f7f4] min-h-screen">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="rounded-[30px] border border-black/10 bg-gradient-to-br from-white via-[#f8f8f6] to-[#ececec] shadow-[0_18px_60px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="relative px-5 md:px-8 py-6 md:py-8 border-b border-black/10 bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%)] pointer-events-none" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.34em]">
                  Saint Clothing Admin
                </p>
                <h2 className="mt-2 text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                  Trash Management
                </h2>
                <p className="mt-2 text-sm text-white/70 max-w-2xl">
                  Review archived products, restore items back to inventory, or
                  permanently remove records from the system.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[120px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                    Total
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {summary.total}
                  </p>
                </div>

                <div className="min-w-[120px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                    Showing
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {summary.showing}
                  </p>
                </div>

                <div className="min-w-[120px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                    With Image
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {summary.withImages}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 md:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-4 items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/55">
                  Search Trash
                </p>
                <input
                  type="text"
                  placeholder="Search by name, category, SKU, group code, branch"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A0D17] outline-none transition focus:border-[#0A0D17] focus:shadow-[0_0_0_4px_rgba(10,13,23,0.05)]"
                />
              </div>

              <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/50">
                  Current Page
                </p>
                <p className="mt-1 text-lg font-black text-[#0A0D17]">
                  {currentPage} / {summary.pages}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[26px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937]">
                    <tr>
                      <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-white/75">
                        Product
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-white/75">
                        Details
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-white/75">
                        Branch
                      </th>
                      <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em] text-white/75">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {currentProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="px-5 py-16 text-center text-[#0A0D17]/40"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-[#f3f3f1] border border-black/5 flex items-center justify-center text-[#0A0D17]/35 text-lg font-black">
                              T
                            </div>
                            <p className="mt-4 text-sm font-black uppercase tracking-[0.24em]">
                              Trash is Empty
                            </p>
                            <p className="mt-2 text-xs text-[#0A0D17]/45">
                              No archived products found.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentProducts.map((p, index) => (
                        <tr
                          key={p._id}
                          className={`border-t border-black/5 transition-colors hover:bg-[#fafaf8] ${
                            index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                          }`}
                        >
                          <td className="px-4 py-4 align-top min-w-[260px]">
                            <div className="flex items-center gap-4">
                              <div className="h-16 w-14 rounded-xl overflow-hidden border border-black/10 bg-[#f5f5f4] shrink-0">
                                {p.images?.[0] ? (
                                  <img
                                    src={`${backendUrl}/uploads/${p.images[0]}`}
                                    alt={p.name}
                                    className="h-full w-full object-cover grayscale opacity-80"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[10px] font-black uppercase text-[#0A0D17]/30">
                                    No Img
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-[12px] font-black uppercase text-[#0A0D17] break-words">
                                  {p.name || "Unnamed Product"}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {p.category && (
                                    <span className="inline-flex rounded-full border border-black/10 bg-[#f5f5f4] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#0A0D17]/65">
                                      {p.category}
                                    </span>
                                  )}
                                  {p.sku && (
                                    <span className="inline-flex rounded-full border border-black/10 bg-[#faf8f3] px-3 py-1 text-[10px] font-mono font-black uppercase tracking-[0.12em] text-[#0A0D17]/55">
                                      {p.sku}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top min-w-[220px]">
                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold text-[#0A0D17]/75">
                                Group Code:{" "}
                                <span className="font-black text-[#0A0D17]">
                                  {p.groupCode || "—"}
                                </span>
                              </p>
                              <p className="text-[11px] font-semibold text-[#0A0D17]/75">
                                Color:{" "}
                                <span className="font-black text-[#0A0D17]">
                                  {p.color || "—"}
                                </span>
                              </p>
                              <p className="text-[11px] font-semibold text-[#0A0D17]/75">
                                Deleted:{" "}
                                <span className="font-black text-[#0A0D17]">
                                  {p.deletedAt
                                    ? new Date(p.deletedAt).toLocaleDateString()
                                    : "Archived"}
                                </span>
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top min-w-[120px]">
                            <span className="inline-flex rounded-full border border-black/10 bg-[#f5f5f4] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0D17]/70">
                              {p.branch || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-top text-right min-w-[220px]">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                onClick={() => restore(p._id)}
                                className="rounded-2xl bg-[#0A0D17] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#1d2433]"
                              >
                                Restore
                              </button>

                              <button
                                onClick={() => permanentDelete(p._id)}
                                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-red-600 transition hover:bg-red-500 hover:text-white"
                              >
                                Permanent Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredProducts.length > 0 && (
              <div className="flex justify-center items-center py-6">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredProducts.length}
                  onChange={(page) => setCurrentPage(page)}
                  showQuickJumper
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trash;