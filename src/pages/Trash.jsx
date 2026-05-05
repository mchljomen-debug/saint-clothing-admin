import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Pagination } from "antd";
import "antd/dist/reset.css";
import {
  FaTrash,
  FaSearch,
  FaSyncAlt,
  FaUndo,
  FaExclamationTriangle,
  FaBoxOpen,
  FaUsers,
  FaStore,
  FaFileAlt,
  FaImage,
  FaShoppingCart,
  FaUserTie,
} from "react-icons/fa";

const DEFAULT_ITEMS_PER_PAGE = 8;

const Trash = ({ token }) => {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ITEMS_PER_PAGE);

  const panelBg =
    "bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
  const softPanelBg = "bg-[#FAFAF8] border border-black/10";
  const labelClass =
    "text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";
  const inputClass =
    "w-full rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm text-[#0A0D17] outline-none transition focus:border-black";
  const buttonDark =
    "inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937] disabled:opacity-50";
  const buttonLight =
    "inline-flex items-center justify-center gap-2 rounded-[5px] border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#0A0D17] transition hover:bg-[#FAFAF8] disabled:opacity-50";
  const buttonDanger =
    "inline-flex items-center justify-center gap-2 rounded-[5px] border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-500 hover:text-white disabled:opacity-50";

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    token,
  };

  const getMediaUrl = (value) => {
    if (!value) return "";

    const stringValue = String(value).trim();

    if (
      stringValue.startsWith("http://") ||
      stringValue.startsWith("https://") ||
      stringValue.startsWith("data:")
    ) {
      return stringValue;
    }

    if (stringValue.startsWith("/uploads/")) return `${backendUrl}${stringValue}`;
    if (stringValue.startsWith("uploads/")) return `${backendUrl}/${stringValue}`;

    return `${backendUrl}/uploads/${stringValue.replace(/^\/+/, "")}`;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "PRODUCT":
        return <FaBoxOpen />;
      case "USER":
        return <FaUsers />;
      case "EMPLOYEE":
        return <FaUserTie />;
      case "BRANCH":
        return <FaStore />;
      case "HERO":
        return <FaImage />;
      case "POLICY":
        return <FaFileAlt />;
      case "ORDER":
        return <FaShoppingCart />;
      default:
        return <FaTrash />;
    }
  };

  const getTypeClass = (type) => {
    switch (type) {
      case "PRODUCT":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "USER":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "EMPLOYEE":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "BRANCH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "HERO":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "POLICY":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "ORDER":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const formatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fetchTrash = async (silent = false) => {
    if (!token) return;

    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      const res = await axios.get(`${backendUrl}/api/trash/list`, {
        headers: authHeaders,
      });

      if (res.data.success) {
        setTrashItems(Array.isArray(res.data.trash) ? res.data.trash : []);
      } else {
        toast.error(res.data.message || "Failed to load trash");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  const restoreItem = async (item) => {
    try {
      setActionLoading(`restore-${item.type}-${item._id}`);

      const res = await axios.post(
        `${backendUrl}/api/trash/restore`,
        {
          id: item._id,
          type: item.type,
        },
        {
          headers: authHeaders,
        }
      );

      if (res.data.success) {
        toast.success(res.data.message || `${item.type} restored successfully`);
        await fetchTrash(true);
      } else {
        toast.error(res.data.message || "Failed to restore item");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setActionLoading("");
    }
  };

  const permanentDeleteItem = async (item) => {
    const confirmDelete = window.confirm(
      `Permanently delete this ${item.type.toLowerCase()}? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setActionLoading(`delete-${item.type}-${item._id}`);

      const res = await axios.post(
        `${backendUrl}/api/trash/permanent-delete`,
        {
          id: item._id,
          type: item.type,
        },
        {
          headers: authHeaders,
        }
      );

      if (res.data.success) {
        toast.success(res.data.message || `${item.type} permanently deleted`);
        await fetchTrash(true);
      } else {
        toast.error(res.data.message || "Failed to permanently delete item");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setActionLoading("");
    }
  };

  useEffect(() => {
    if (token) fetchTrash();
  }, [token]);

  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(trashItems.map((item) => item.type)));
    return ["ALL", ...types.sort()];
  }, [trashItems]);

  const filteredTrash = useMemo(() => {
    const term = search.trim().toLowerCase();

    return trashItems.filter((item) => {
      const matchesType = typeFilter === "ALL" || item.type === typeFilter;

      const raw = item.raw || {};

      const matchesSearch =
        !term ||
        String(item.type || "").toLowerCase().includes(term) ||
        String(item.name || "").toLowerCase().includes(term) ||
        String(item.code || "").toLowerCase().includes(term) ||
        String(item.status || "").toLowerCase().includes(term) ||
        String(item.branch || "").toLowerCase().includes(term) ||
        String(raw.email || "").toLowerCase().includes(term) ||
        String(raw.phone || "").toLowerCase().includes(term) ||
        String(raw.role || "").toLowerCase().includes(term) ||
        String(raw.category || "").toLowerCase().includes(term) ||
        String(raw.sku || "").toLowerCase().includes(term) ||
        String(raw.groupCode || "").toLowerCase().includes(term);

      return matchesType && matchesSearch;
    });
  }, [trashItems, search, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;

  const currentTrash = filteredTrash.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredTrash.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const summary = useMemo(() => {
    const byType = trashItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    return {
      total: trashItems.length,
      showing: filteredTrash.length,
      products: byType.PRODUCT || 0,
      users: byType.USER || 0,
      employees: byType.EMPLOYEE || 0,
      branches: byType.BRANCH || 0,
      policies: byType.POLICY || 0,
      heroes: byType.HERO || 0,
      orders: byType.ORDER || 0,
    };
  }, [trashItems, filteredTrash]);

  const groupedCurrentTrash = useMemo(() => {
    return currentTrash.reduce((acc, item) => {
      const type = item.type || "UNKNOWN";

      if (!acc[type]) acc[type] = [];
      acc[type].push(item);

      return acc;
    }, {});
  }, [currentTrash]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-3 pt-24 font-['Montserrat']">
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-[5px] bg-white/70" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-[5px] bg-white/70" />
            ))}
          </div>
          <div className="h-20 rounded-[5px] bg-white/70" />
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
                  <FaTrash className="text-sm" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
                    Global Trash
                  </h1>

                  <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                    Restore or permanently remove deleted products, users,
                    employees, branches, hero content, policies, and orders.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchTrash(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm disabled:opacity-50"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              Refresh Trash
            </button>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="flex flex-col gap-2 mb-4">
            <h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17]">
              Trash Overview
            </h3>

            <p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">
              Combined deleted records from all supported modules.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {[
              { label: "Total", value: summary.total, icon: <FaTrash /> },
              { label: "Showing", value: summary.showing, icon: <FaSearch /> },
              {
                label: "Products",
                value: summary.products,
                icon: <FaBoxOpen />,
              },
              { label: "Users", value: summary.users, icon: <FaUsers /> },
              {
                label: "Employees",
                value: summary.employees,
                icon: <FaUserTie />,
              },
              { label: "Branches", value: summary.branches, icon: <FaStore /> },
              { label: "Policies", value: summary.policies, icon: <FaFileAlt /> },
              {
                label: "Orders",
                value: summary.orders,
                icon: <FaShoppingCart />,
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

                <h2 className="text-[24px] sm:text-[28px] font-black leading-none tracking-[-0.03em] text-[#0A0D17]">
                  {item.value}
                </h2>
              </div>
            ))}
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_220px_190px] gap-3 items-end">
            <div>
              <p className={labelClass}>Search Trash</p>

              <div className="relative mt-2">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0D17]/35 text-sm" />

                <input
                  type="text"
                  placeholder="Search type, name, email, code, branch, status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-[5px] border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Type</p>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`${inputClass} mt-2`}
              >
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "ALL" ? "All Types" : type}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] px-4 py-3">
              <p className={labelClass}>Showing</p>
              <p className="mt-1 text-sm font-black text-[#0A0D17]">
                {filteredTrash.length === 0
                  ? "0 / 0"
                  : `${indexOfFirstItem + 1}-${Math.min(
                      indexOfLastItem,
                      filteredTrash.length
                    )} / ${filteredTrash.length}`}
              </p>
            </div>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] overflow-hidden`}>
          <div className="px-4 sm:px-5 py-5 border-b border-black/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className={labelClass}>Trash Table</p>
                <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                  Deleted Records
                </h3>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">
                Page {currentPage} of {totalPages}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-[#FAFAF8] space-y-4">
            {currentTrash.length === 0 ? (
              <div className="rounded-[5px] border border-dashed border-black/15 bg-white p-12 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-[5px] bg-[#f3f3f1] border border-black/5 flex items-center justify-center text-[#0A0D17]/35 text-lg font-black">
                    <FaTrash />
                  </div>

                  <p className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                    Trash is Empty
                  </p>

                  <p className="mt-2 text-xs text-[#0A0D17]/35">
                    No deleted records found.
                  </p>
                </div>
              </div>
            ) : (
              Object.entries(groupedCurrentTrash).map(([type, items]) => (
                <div
                  key={type}
                  className="rounded-[5px] border border-black/10 bg-white overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/10 bg-[#0A0D17] px-4 py-4 text-white">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-[5px] border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getTypeClass(
                          type
                        )}`}
                      >
                        {getTypeIcon(type)}
                        {type}
                      </span>

                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                        {items.length} record{items.length > 1 ? "s" : ""}
                      </p>
                    </div>

                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                      Deleted Records Group
                    </p>
                  </div>

                  <div className="divide-y divide-black/10">
                    {items.map((item) => {
                      const raw = item.raw || {};
                      const imageUrl = getMediaUrl(item.image);

                      return (
                        <div
                          key={`${item.type}-${item._id}`}
                          className="p-4 transition hover:bg-[#FAFAF8]"
                        >
                          <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr_160px_260px] gap-4 xl:items-center">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-16 w-14 rounded-[5px] overflow-hidden border border-black/10 bg-[#f5f5f4] shrink-0">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover grayscale opacity-80"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[10px] font-black uppercase text-[#0A0D17]/30">
                                    {String(item.type || "T").charAt(0)}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-black uppercase text-[#0A0D17] truncate">
                                  {item.name || "Unnamed Record"}
                                </p>

                                <p className="mt-1 text-[10px] font-semibold text-[#0A0D17]/45 break-all">
                                  {raw.email || item.code || item._id}
                                </p>

                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-[5px] border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${getTypeClass(
                                      item.type
                                    )}`}
                                  >
                                    {getTypeIcon(item.type)}
                                    {item.type}
                                  </span>

                                  <span className="inline-flex rounded-[5px] border border-red-100 bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-red-600">
                                    Deleted
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2">
                              <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                                <p className={labelClass}>Code</p>
                                <p className="mt-1 text-xs font-black text-[#0A0D17] break-all">
                                  {item.code || raw.sku || raw.groupCode || "—"}
                                </p>
                              </div>

                              <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                                <p className={labelClass}>Branch</p>
                                <p className="mt-1 text-xs font-black text-[#0A0D17] break-all">
                                  {item.branch || raw.branch || "—"}
                                </p>
                              </div>

                              <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                                <p className={labelClass}>Status</p>
                                <p className="mt-1 text-xs font-black text-[#0A0D17] break-all">
                                  {item.status ||
                                    raw.role ||
                                    raw.category ||
                                    "—"}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                              <p className={labelClass}>Deleted</p>

                              <p className="mt-1 text-xs font-black text-[#0A0D17]">
                                {formatDate(item.deletedAt)}
                              </p>

                              <p className="mt-1 text-[10px] font-bold text-[#0A0D17]/40 uppercase">
                                {formatTime(item.deletedAt) || "No time"}
                              </p>

                              <p className="mt-2 text-[10px] font-bold text-[#0A0D17]/45 truncate">
                                By {raw.deletedBy || "Admin"}
                              </p>
                            </div>

                            <div className="flex flex-wrap xl:justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => restoreItem(item)}
                                disabled={
                                  actionLoading ===
                                  `restore-${item.type}-${item._id}`
                                }
                                className={buttonDark}
                              >
                                <FaUndo />
                                Restore
                              </button>

                              <button
                                type="button"
                                onClick={() => permanentDeleteItem(item)}
                                disabled={
                                  actionLoading ===
                                  `delete-${item.type}-${item._id}`
                                }
                                className={buttonDanger}
                              >
                                <FaExclamationTriangle />
                                Permanent Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {filteredTrash.length > pageSize && (
          <div className={`${panelBg} mt-4 rounded-[5px] px-4 py-4`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                  Page Control
                </p>

                <p className="mt-1 text-xs font-semibold text-[#6b7280]">
                  Showing {indexOfFirstItem + 1} -{" "}
                  {Math.min(indexOfLastItem, filteredTrash.length)} of{" "}
                  {filteredTrash.length} deleted records
                </p>
              </div>

              <Pagination
                className="saint-pagination"
                current={currentPage}
                pageSize={pageSize}
                total={filteredTrash.length}
                showSizeChanger
                pageSizeOptions={["8", "16", "32", "64"]}
                responsive
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} of ${total} records`
                }
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                }}
                onShowSizeChange={(_, size) => {
                  setCurrentPage(1);
                  setPageSize(size);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trash;