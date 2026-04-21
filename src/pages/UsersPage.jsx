import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

const ITEMS_PER_PAGE = 10;

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${backendUrl}/api/admin/users`, {
        headers: getAuthHeaders(),
      });

      if (res.data.success) {
        setUsers(res.data.users || []);
      } else {
        toast.error(res.data.message || "Failed to load users");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserAction = async (endpoint, userId, successMessage) => {
    try {
      setActionLoading(`${endpoint}-${userId}`);

      const res = await axios.post(
        `${backendUrl}/api/admin/users/${endpoint}`,
        { userId },
        { headers: getAuthHeaders() }
      );

      if (res.data.success) {
        toast.success(successMessage);
        await fetchUsers();
      } else {
        toast.error(res.data.message || "Action failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading("");
    }
  };

  const getUserStatus = (user) => {
    if (user.isDeleted) return "Deleted";
    if (user.isBlocked) return "Blocked";
    if (user.isActive === false) return "Inactive";
    return "Active";
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const name = String(user.name || "").toLowerCase();
      const email = String(user.email || "").toLowerCase();

      const matchesSearch = !term || name.includes(term) || email.includes(term);
      const matchesStatus =
        statusFilter === "All" || getUserStatus(user) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => getUserStatus(u) === "Active").length,
      blocked: users.filter((u) => getUserStatus(u) === "Blocked").length,
      inactive: users.filter((u) => getUserStatus(u) === "Inactive").length,
      deleted: users.filter((u) => getUserStatus(u) === "Deleted").length,
    };
  }, [users]);

  const getStatusClass = (status) => {
    if (status === "Active") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (status === "Blocked") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (status === "Inactive") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-gray-100 text-gray-700 border-gray-300";
  };

  const formatDateTime = (value) => {
    if (!value) return { date: "N/A", time: "" };

    const d = new Date(value);
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getInitial = (user) => {
    return (
      user?.name?.trim()?.charAt(0) ||
      user?.email?.trim()?.charAt(0) ||
      "U"
    ).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-black/15 border-t-black animate-spin" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.28em] text-[#0A0D17]">
            Loading Users
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-['Montserrat'] pt-[40px]">
      <div className="rounded-[30px] border border-black/10 bg-gradient-to-br from-white via-[#f8f8f6] to-[#ececec] shadow-[0_18px_60px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="relative px-5 md:px-8 py-6 md:py-8 border-b border-black/10 bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%)] pointer-events-none" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.34em]">
                Saint Clothing Admin
              </p>
              <h2 className="mt-2 text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                Users Management
              </h2>
              <p className="mt-2 text-sm text-white/70 max-w-2xl">
                Manage account access, inactivity, and user status with a cleaner admin workspace.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                  Active
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {summary.active}
                </p>
              </div>

              <div className="min-w-[120px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Blocked
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {summary.blocked}
                </p>
              </div>

              <div className="min-w-[120px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Inactive
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {summary.inactive}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 md:px-8 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_220px_160px] gap-4 items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/55">
                Search User
              </p>
              <div className="mt-3 relative">
                <input
                  type="text"
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A0D17] outline-none transition focus:border-[#0A0D17] focus:shadow-[0_0_0_4px_rgba(10,13,23,0.05)]"
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/55">
                Status Filter
              </p>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A0D17] outline-none transition focus:border-[#0A0D17] focus:shadow-[0_0_0_4px_rgba(10,13,23,0.05)]"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Blocked">Blocked</option>
                <option value="Inactive">Inactive</option>
                <option value="Deleted">Deleted</option>
              </select>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17]/50">
                Current Page
              </p>
              <p className="mt-1 text-lg font-black text-[#0A0D17]">
                {currentPage} / {totalPages}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[26px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead className="bg-gradient-to-r from-[#f6f6f4] to-[#eceae5]">
                  <tr>
                    <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      User
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Email
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Last Login
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Last Seen
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Created
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user, index) => {
                      const status = getUserStatus(user);
                      const lastLogin = formatDateTime(user.lastLoginAt);
                      const lastSeen = formatDateTime(user.lastSeenAt);
                      const created = formatDateTime(user.createdAt);

                      return (
                        <tr
                          key={user._id}
                          className={`border-t border-black/5 transition-colors hover:bg-[#fafaf8] ${
                            index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                          }`}
                        >
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-3 min-w-[180px]">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0A0D17] to-[#374151] text-white flex items-center justify-center text-sm font-black uppercase shadow-md shrink-0">
                                {getInitial(user)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-[#0A0D17] break-words">
                                  {user.name || "No Name"}
                                </p>
                                <p className="text-xs text-[#0A0D17]/45 font-semibold break-words">
                                  {user.phone || "No Phone"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top min-w-[180px]">
                            <p className="font-semibold text-[#0A0D17]/75 break-words whitespace-normal">
                              {user.email || "No Email"}
                            </p>
                          </td>

                          <td className="px-4 py-4 align-top min-w-[110px]">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-top min-w-[110px]">
                            <div>
                              <p className="font-semibold text-[#0A0D17] text-sm">
                                {lastLogin.date}
                              </p>
                              <p className="text-xs text-[#0A0D17]/45">
                                {lastLogin.time}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top min-w-[110px]">
                            <div>
                              <p className="font-semibold text-[#0A0D17] text-sm">
                                {lastSeen.date}
                              </p>
                              <p className="text-xs text-[#0A0D17]/45">
                                {lastSeen.time}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top min-w-[110px]">
                            <div>
                              <p className="font-semibold text-[#0A0D17] text-sm">
                                {created.date}
                              </p>
                              <p className="text-xs text-[#0A0D17]/45">
                                {created.time}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top min-w-[170px]">
                            <div className="flex flex-wrap gap-1.5">
                              {!user.isDeleted && !user.isBlocked && (
                                <button
                                  onClick={() =>
                                    handleUserAction("block", user._id, "User blocked")
                                  }
                                  disabled={actionLoading === `block-${user._id}`}
                                  className="px-2.5 py-1.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.12em] hover:bg-red-700 disabled:opacity-60"
                                >
                                  Block
                                </button>
                              )}

                              {!user.isDeleted && user.isBlocked && (
                                <button
                                  onClick={() =>
                                    handleUserAction("unblock", user._id, "User unblocked")
                                  }
                                  disabled={actionLoading === `unblock-${user._id}`}
                                  className="px-2.5 py-1.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-[0.12em] hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  Unblock
                                </button>
                              )}

                              {!user.isDeleted && user.isActive !== false && (
                                <button
                                  onClick={() =>
                                    handleUserAction(
                                      "deactivate",
                                      user._id,
                                      "User deactivated"
                                    )
                                  }
                                  disabled={actionLoading === `deactivate-${user._id}`}
                                  className="px-2.5 py-1.5 rounded-full bg-amber-500 text-black text-[9px] font-black uppercase tracking-[0.12em] hover:bg-amber-400 disabled:opacity-60"
                                >
                                  Deactivate
                                </button>
                              )}

                              {!user.isDeleted && user.isActive === false && (
                                <button
                                  onClick={() =>
                                    handleUserAction(
                                      "reactivate",
                                      user._id,
                                      "User reactivated"
                                    )
                                  }
                                  disabled={actionLoading === `reactivate-${user._id}`}
                                  className="px-2.5 py-1.5 rounded-full bg-sky-600 text-white text-[9px] font-black uppercase tracking-[0.12em] hover:bg-sky-700 disabled:opacity-60"
                                >
                                  Reactivate
                                </button>
                              )}

                              {!user.isDeleted && (
                                <button
                                  onClick={() =>
                                    handleUserAction("delete", user._id, "User deleted")
                                  }
                                  disabled={actionLoading === `delete-${user._id}`}
                                  className="px-2.5 py-1.5 rounded-full bg-[#0A0D17] text-white text-[9px] font-black uppercase tracking-[0.12em] hover:bg-black disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-5 py-16 text-center text-[#0A0D17]/40"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-[#f3f3f1] border border-black/5 flex items-center justify-center text-[#0A0D17]/35 text-lg font-black">
                            U
                          </div>
                          <p className="mt-4 text-sm font-black uppercase tracking-[0.24em]">
                            No users found
                          </p>
                          <p className="mt-2 text-xs text-[#0A0D17]/45">
                            Try changing the search or filter.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-3 flex-wrap">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="px-5 py-3 rounded-full bg-[#0A0D17] text-white disabled:opacity-30 text-[10px] font-black uppercase tracking-[0.24em] shadow-[0_10px_24px_rgba(10,13,23,0.2)] hover:bg-black"
              >
                Prev
              </button>

              <div className="px-4 py-3 rounded-full border border-black/10 bg-white text-[10px] font-black uppercase tracking-[0.24em] text-[#0A0D17] shadow-sm">
                {currentPage} / {totalPages}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="px-5 py-3 rounded-full bg-[#0A0D17] text-white disabled:opacity-30 text-[10px] font-black uppercase tracking-[0.24em] shadow-[0_10px_24px_rgba(10,13,23,0.2)] hover:bg-black"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;