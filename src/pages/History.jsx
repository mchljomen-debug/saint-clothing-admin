import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Pagination } from "antd";
import "antd/dist/reset.css";
import {
  FaHistory,
  FaSearch,
  FaPrint,
  FaUserCircle,
  FaBox,
  FaShoppingCart,
  FaImage,
  FaUsers,
  FaLayerGroup,
  FaStore,
  FaClipboardList,
  FaSyncAlt,
} from "react-icons/fa";

const History = ({ token }) => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const panelBg =
    "bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
  const softPanelBg = "bg-[#FAFAF8] border border-black/10";
  const inputClass =
    "w-full rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm text-[#0A0D17] outline-none transition focus:border-black";
  const labelClass =
    "text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";

  const fetchLogs = async () => {
    if (!token) return;

    try {
      setLoading(true);

      const res = await axios.get(`${backendUrl}/api/activity/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data?.success) {
        setLogs(Array.isArray(res.data.logs) ? res.data.logs : []);
      } else {
        setLogs([]);
        toast.error(res.data?.message || "Failed to load history logs");
      }
    } catch (err) {
      console.log("FETCH LOGS ERROR:", err);
      toast.error(err.response?.data?.message || "Failed to load history logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const entityOptions = useMemo(() => {
    const values = logs
      .map((log) => log.entityType)
      .filter(Boolean)
      .map((value) => String(value).trim());

    return ["All", ...Array.from(new Set(values))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchEntity =
        entityFilter === "All" ? true : log.entityType === entityFilter;

      const matchSearch =
        !term ||
        String(log._id || "").toLowerCase().includes(term) ||
        String(log.action || "").toLowerCase().includes(term) ||
        String(log.message || "").toLowerCase().includes(term) ||
        String(log.user || "").toLowerCase().includes(term) ||
        String(log.entityType || "").toLowerCase().includes(term);

      return matchEntity && matchSearch;
    });
  }, [logs, search, entityFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, entityFilter]);

  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePrint = () => window.print();

  const getEntityIcon = (entityType = "") => {
    const value = String(entityType).toLowerCase();

    if (value.includes("product")) return <FaBox />;
    if (value.includes("order")) return <FaShoppingCart />;
    if (value.includes("hero")) return <FaImage />;
    if (value.includes("user")) return <FaUsers />;
    if (value.includes("employee")) return <FaUserCircle />;
    if (value.includes("category")) return <FaLayerGroup />;
    if (value.includes("branch")) return <FaStore />;

    return <FaClipboardList />;
  };

  const getEntityClass = (entityType = "") => {
    const value = String(entityType).toLowerCase();

    if (value.includes("product"))
      return "bg-blue-50 text-blue-700 border-blue-200";
    if (value.includes("order"))
      return "bg-purple-50 text-purple-700 border-purple-200";
    if (value.includes("hero"))
      return "bg-pink-50 text-pink-700 border-pink-200";
    if (value.includes("user"))
      return "bg-sky-50 text-sky-700 border-sky-200";
    if (value.includes("employee"))
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (value.includes("category"))
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (value.includes("branch"))
      return "bg-orange-50 text-orange-700 border-orange-200";

    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getActionClass = (action = "") => {
    const value = String(action).toLowerCase();

    if (value.includes("created") || value.includes("added"))
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (value.includes("updated") || value.includes("restored"))
      return "bg-blue-50 text-blue-700 border-blue-200";
    if (value.includes("deleted") || value.includes("removed"))
      return "bg-red-50 text-red-700 border-red-200";
    if (value.includes("login"))
      return "bg-[#0A0D17] text-white border-[#0A0D17]";
    if (value.includes("payment"))
      return "bg-violet-50 text-violet-700 border-violet-200";

    return "bg-[#FAFAF8] text-[#0A0D17]/70 border-black/10";
  };

  const summary = useMemo(() => {
    const today = new Date();

    const todayCount = logs.filter((log) => {
      if (!log.createdAt) return false;

      const d = new Date(log.createdAt);

      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    }).length;

    const productCount = logs.filter((log) =>
      String(log.entityType || "").toLowerCase().includes("product")
    ).length;

    const orderCount = logs.filter((log) =>
      String(log.entityType || "").toLowerCase().includes("order")
    ).length;

    const userCount = logs.filter((log) =>
      String(log.entityType || "").toLowerCase().includes("user")
    ).length;

    return {
      total: logs.length,
      filtered: filteredLogs.length,
      today: todayCount,
      pages: totalPages || 1,
      productCount,
      orderCount,
      userCount,
    };
  }, [logs, filteredLogs, totalPages]);

  return (
    <div className="min-h-screen bg-transparent px-2.5 sm:px-3 pt-20 sm:pt-24 pb-4 font-['Montserrat'] print:bg-white print:p-0">
      <div className="max-w-[1500px] mx-auto print:max-w-none">
        <div className="rounded-[5px] bg-[#0A0D17] p-5 sm:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] mb-4 text-white border border-black/10 overflow-hidden relative print:bg-white print:text-[#0A0D17] print:shadow-none print:border-black/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/50 mb-2 print:text-[#0A0D17]/50">
                Saint Clothing Admin
              </p>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[5px] bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm print:bg-[#FAFAF8] print:border-black/10">
                  <FaHistory className="text-sm" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
                    History Logs
                  </h1>
                  <p className="text-[11px] sm:text-sm text-white/65 mt-1 print:text-[#0A0D17]/60">
                    Review system activity, admin actions, records, and audit trails.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-[5px] border border-white/20 bg-white/10 text-white px-4 py-2.5 text-sm font-black transition hover:bg-white/20 disabled:opacity-50"
              >
                <FaSyncAlt className={loading ? "animate-spin" : ""} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm"
              >
                <FaPrint />
                Print Report
              </button>
            </div>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4 print:shadow-none`}>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17]">
                Activity Overview
              </h3>
              <p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">
                Summary of recorded actions across your admin system.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Total Logs", value: summary.total, icon: <FaHistory />, className: "text-[#0A0D17]" },
              { label: "Showing", value: summary.filtered, icon: <FaSearch />, className: "text-blue-700" },
              { label: "Today", value: summary.today, icon: <FaClipboardList />, className: "text-emerald-700" },
              { label: "Products", value: summary.productCount, icon: <FaBox />, className: "text-blue-700" },
              { label: "Orders", value: summary.orderCount, icon: <FaShoppingCart />, className: "text-purple-700" },
              { label: "Users", value: summary.userCount, icon: <FaUsers />, className: "text-sky-700" },
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

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4 print:hidden`}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_140px] gap-3 items-end">
            <div>
              <p className={labelClass}>Search Logs</p>

              <div className="relative mt-2">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0D17]/35 text-sm" />
                <input
                  type="text"
                  placeholder="Search by ID, action, message, user, entity"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-[5px] border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Entity Type</p>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className={`${inputClass} mt-2`}
              >
                {entityOptions.map((entity) => (
                  <option key={entity} value={entity}>
                    {entity === "All" ? "All Entities" : entity}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] px-4 py-3">
              <p className={labelClass}>Page</p>
              <p className="mt-1 text-lg font-black text-[#0A0D17]">
                {currentPage} / {summary.pages}
              </p>
            </div>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] overflow-hidden print:shadow-none`}>
          <div className="px-4 sm:px-5 py-5 border-b border-black/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className={labelClass}>Audit Trail</p>
                <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                  System Activity
                </h3>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">
                {filteredLogs.length} logs
              </p>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-[#0A0D17] text-white print:bg-[#FAFAF8] print:text-[#0A0D17]">
                <tr>
                  <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Timestamp
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Entity
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Action
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    User
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Description
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em]">
                    Log ID
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-16 text-center text-[#0A0D17]/40 bg-white"
                    >
                      Loading history logs...
                    </td>
                  </tr>
                ) : currentLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-16 text-center text-[#0A0D17]/40 bg-white"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-14 h-14 rounded-[5px] bg-[#f3f3f1] border border-black/5 flex items-center justify-center text-[#0A0D17]/35 text-lg font-black">
                          H
                        </div>

                        <p className="mt-4 text-sm font-black uppercase tracking-[0.24em]">
                          No history found
                        </p>

                        <p className="mt-2 text-xs text-[#0A0D17]/45">
                          Try another search term or check logs later.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log, index) => {
                    const date = log.createdAt ? new Date(log.createdAt) : null;

                    return (
                      <tr
                        key={log._id}
                        className={`border-b border-[#ecece6] transition-colors hover:bg-[#fafaf8] ${
                          index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                        }`}
                      >
                        <td className="px-4 py-4 align-top min-w-[160px]">
                          <p className="text-[11px] font-black text-[#0A0D17] uppercase">
                            {date ? date.toLocaleDateString() : "N/A"}
                          </p>

                          <p className="text-[10px] font-bold text-[#0A0D17]/45 tabular-nums uppercase mt-1">
                            {date
                              ? date.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "N/A"}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top min-w-[150px]">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-[5px] border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${getEntityClass(
                              log.entityType
                            )}`}
                          >
                            {getEntityIcon(log.entityType)}
                            {log.entityType || "System"}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top min-w-[170px]">
                          <span
                            className={`inline-flex rounded-[5px] border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${getActionClass(
                              log.action
                            )}`}
                          >
                            {log.action || "N/A"}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-[5px] bg-[#0A0D17] text-white flex items-center justify-center text-xs font-black uppercase shrink-0">
                              {String(log.user || "S").slice(0, 1)}
                            </div>

                            <div>
                              <p className="text-[12px] font-black text-[#0A0D17] break-words">
                                {log.user || "System"}
                              </p>
                              <p className="text-[10px] font-bold text-[#0A0D17]/40 uppercase tracking-[0.14em]">
                                Actor
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p className="text-[12px] font-bold text-[#334155] leading-snug break-words">
                            {log.message || "No message"}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top text-right min-w-[120px]">
                          <span className="inline-flex rounded-[5px] border border-gray-200 bg-gray-100 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">
                            {log._id ? log._id.slice(-6).toUpperCase() : "N/A"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredLogs.length > pageSize && (
          <div className={`${panelBg} mt-4 rounded-[5px] px-4 py-4 print:hidden`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                  Page Control
                </p>

                <p className="mt-1 text-xs font-semibold text-[#6b7280]">
                  Showing {indexOfFirstItem + 1} -{" "}
                  {Math.min(indexOfLastItem, filteredLogs.length)} of{" "}
                  {filteredLogs.length} logs
                </p>
              </div>

              <Pagination
                className="saint-pagination"
                current={currentPage}
                pageSize={pageSize}
                total={filteredLogs.length}
                showSizeChanger
                pageSizeOptions={["10", "20", "50", "100"]}
                responsive
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} of ${total} logs`
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

        <div className="hidden print:block mt-6 text-center">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">
            Internal Administration Use Only • Saint Clothing
          </p>
        </div>
      </div>
    </div>
  );
};

export default History;