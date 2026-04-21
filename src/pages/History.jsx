import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Pagination } from "antd";

const History = ({ token }) => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const pageSize = 10;

  useEffect(() => {
    if (!token) return;

    const fetchLogs = async () => {
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

    fetchLogs();
  }, [token]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((log) => {
      return (
        String(log._id || "").toLowerCase().includes(term) ||
        String(log.action || "").toLowerCase().includes(term) ||
        String(log.message || "").toLowerCase().includes(term) ||
        String(log.user || "").toLowerCase().includes(term) ||
        String(log.entityType || "").toLowerCase().includes(term)
      );
    });
  }, [logs, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const handlePrint = () => window.print();

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

    return {
      total: logs.length,
      filtered: filteredLogs.length,
      today: todayCount,
      pages: Math.ceil(filteredLogs.length / pageSize) || 1,
    };
  }, [logs, filteredLogs]);

  return (
    <div className="w-full font-['Montserrat'] pt-[40px] bg-[#f8f7f4] min-h-screen print:bg-white print:p-0">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 print:max-w-none print:px-0">
        <div className="rounded-[30px] border border-black/10 bg-gradient-to-br from-white via-[#f8f8f6] to-[#ececec] shadow-[0_18px_60px_rgba(0,0,0,0.08)] overflow-hidden print:rounded-none print:border-0 print:shadow-none print:bg-white">
          <div className="relative px-5 md:px-8 py-6 md:py-8 border-b border-black/10 bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937] print:bg-white print:border-black/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%)] pointer-events-none print:hidden" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.34em] print:text-gray-500">
                  Saint Clothing Admin
                </p>
                <h2 className="mt-2 text-2xl md:text-3xl font-black uppercase tracking-tight text-white print:text-[#0A0D17]">
                  History Logs
                </h2>
                <p className="mt-2 text-sm text-white/70 max-w-2xl print:text-gray-600">
                  Review all system activity, actions, and admin records.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[120px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur print:bg-[#faf8f3] print:border-black/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55 print:text-[#0A0D17]/50">
                    Total
                  </p>
                  <p className="mt-1 text-xl font-black text-white print:text-[#0A0D17]">
                    {summary.total}
                  </p>
                </div>

                <div className="min-w-[120px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur print:bg-[#faf8f3] print:border-black/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55 print:text-[#0A0D17]/50">
                    Showing
                  </p>
                  <p className="mt-1 text-xl font-black text-white print:text-[#0A0D17]">
                    {summary.filtered}
                  </p>
                </div>

                <div className="min-w-[120px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur print:bg-[#faf8f3] print:border-black/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55 print:text-[#0A0D17]/50">
                    Today
                  </p>
                  <p className="mt-1 text-xl font-black text-white print:text-[#0A0D17]">
                    {summary.today}
                  </p>
                </div>

                <button
                  onClick={handlePrint}
                  className="print:hidden px-6 py-3 rounded-2xl bg-white text-[#0A0D17] font-black uppercase tracking-[0.14em] shadow-sm hover:bg-[#f4f4f3] transition"
                >
                  Print Report
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 md:px-8 py-6 print:px-0 print:py-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-4 items-end print:hidden">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/55">
                  Search Logs
                </p>
                <input
                  type="text"
                  placeholder="Search by ID, action, message, user, entity"
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

            <div className="mt-6 rounded-[26px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden print:rounded-none print:border print:shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937] print:bg-[#f6f6f4]">
                    <tr>
                      <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-white/75 print:text-[#0A0D17]">
                        Timestamp
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-white/75 print:text-[#0A0D17]">
                        Action
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-white/75 print:text-[#0A0D17]">
                        User
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-white/75 print:text-[#0A0D17]">
                        Description
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-white/75 print:text-[#0A0D17]">
                        Entity
                      </th>
                      <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em] text-white/75 print:text-[#0A0D17]">
                        Log ID
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-5 py-16 text-center text-[#0A0D17]/40"
                        >
                          Loading history logs...
                        </td>
                      </tr>
                    ) : currentLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-5 py-16 text-center text-[#0A0D17]/40"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-[#f3f3f1] border border-black/5 flex items-center justify-center text-[#0A0D17]/35 text-lg font-black">
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
                            className={`border-t border-black/5 transition-colors hover:bg-[#fafaf8] ${
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

                            <td className="px-4 py-4 align-top min-w-[120px]">
                              <span className="inline-flex rounded-full border border-black/10 bg-[#f5f5f4] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#0A0D17]/70">
                                {log.action || "N/A"}
                              </span>
                            </td>

                            <td className="px-4 py-4 align-top min-w-[120px]">
                              <p className="text-[12px] font-bold text-[#0A0D17] break-words">
                                {log.user || "System"}
                              </p>
                            </td>

                            <td className="px-4 py-4 align-top">
                              <p className="text-[12px] font-bold text-[#334155] leading-snug break-words">
                                {log.message || "No message"}
                              </p>
                            </td>

                            <td className="px-4 py-4 align-top min-w-[120px]">
                              <p className="text-[11px] font-semibold text-[#0A0D17]/70">
                                {log.entityType || "—"}
                              </p>
                            </td>

                            <td className="px-4 py-4 align-top text-right min-w-[120px]">
                              <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">
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

            {filteredLogs.length > 0 && (
              <div className="flex justify-center items-center py-6 print:hidden">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredLogs.length}
                  onChange={(page) => setCurrentPage(page)}
                  showQuickJumper
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>
        </div>

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