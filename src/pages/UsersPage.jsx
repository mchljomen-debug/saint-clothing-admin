import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import {
  FaUsers,
  FaSearch,
  FaSyncAlt,
  FaUserCheck,
  FaUserSlash,
  FaUserClock,
  FaTrash,
  FaBan,
  FaUndo,
  FaPowerOff,
  FaEye,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaTimes,
} from "react-icons/fa";

const ITEMS_PER_PAGE = 8;

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const panelBg =
    "bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
  const softPanelBg = "bg-[#FAFAF8] border border-black/10";
  const inputClass =
    "w-full rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm text-[#0A0D17] outline-none transition focus:border-black";
  const labelClass =
    "text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";
  const buttonDark =
    "inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937] disabled:opacity-50";
  const buttonLight =
    "inline-flex items-center justify-center gap-2 rounded-[5px] border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#0A0D17] transition hover:bg-[#FAFAF8] disabled:opacity-50";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
      token,
    };
  };

  const fetchUsers = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

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
      if (!silent) setLoading(false);
      setRefreshing(false);
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
        await fetchUsers(true);
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

    if (Number.isNaN(d.getTime())) {
      return { date: "N/A", time: "" };
    }

    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const getInitial = (user) => {
    return (
      user?.name?.trim()?.charAt(0) ||
      user?.email?.trim()?.charAt(0) ||
      "U"
    ).toUpperCase();
  };

  const formatAddress = (address = {}) => {
    const parts = [
      address.houseUnit,
      address.street,
      address.barangay,
      address.city,
      address.province,
      address.region,
      address.zipcode,
      address.country,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "No address saved";
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const name = String(user.name || "").toLowerCase();
      const email = String(user.email || "").toLowerCase();
      const phone = String(user.phone || "").toLowerCase();

      const matchesSearch =
        !term ||
        name.includes(term) ||
        email.includes(term) ||
        phone.includes(term);

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

  const getPaginationNumbers = () => {
    const pages = [];
    const maxButtons = 5;

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-3 pt-24 font-['Montserrat']">
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-[5px] bg-white/70" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-[5px] bg-white/70" />
            ))}
          </div>
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
                  <FaUsers className="text-sm" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
                    Users Management
                  </h1>

                  <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                    Manage customer accounts, access status, activity, and user
                    restrictions.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchUsers(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm disabled:opacity-50"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              Refresh Users
            </button>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17]">
                User Overview
              </h3>

              <p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">
                Account summary based on current registered users.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              {
                label: "Total Users",
                value: summary.total,
                icon: <FaUsers />,
                className: "text-[#0A0D17]",
              },
              {
                label: "Active",
                value: summary.active,
                icon: <FaUserCheck />,
                className: "text-emerald-700",
              },
              {
                label: "Blocked",
                value: summary.blocked,
                icon: <FaBan />,
                className: "text-red-600",
              },
              {
                label: "Inactive",
                value: summary.inactive,
                icon: <FaUserClock />,
                className: "text-amber-700",
              },
              {
                label: "Deleted",
                value: summary.deleted,
                icon: <FaTrash />,
                className: "text-gray-700",
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

                <h2
                  className={`text-[24px] sm:text-[28px] font-black leading-none tracking-[-0.03em] ${item.className}`}
                >
                  {item.value}
                </h2>
              </div>
            ))}
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_220px_150px] gap-3 items-end">
            <div>
              <p className={labelClass}>Search User</p>

              <div className="relative mt-2">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0D17]/35 text-sm" />

                <input
                  type="text"
                  placeholder="Search name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-[5px] border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Status</p>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${inputClass} mt-2`}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Blocked">Blocked</option>
                <option value="Inactive">Inactive</option>
                <option value="Deleted">Deleted</option>
              </select>
            </div>

            <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] px-4 py-3">
              <p className={labelClass}>Showing</p>
              <p className="mt-1 text-sm font-black text-[#0A0D17]">
                {paginatedUsers.length} / {filteredUsers.length}
              </p>
            </div>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] overflow-hidden`}>
          <div className="px-4 sm:px-5 py-5 border-b border-black/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className={labelClass}>Users Table</p>

                <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                  Customer Accounts
                </h3>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">
                Page {currentPage} of {totalPages}
              </p>
            </div>
          </div>

          <div className="hidden xl:block">
            <div className="grid grid-cols-[1.3fr_1.5fr_105px_115px_115px_115px_230px] bg-[#0A0D17] text-white px-5 py-4 font-black text-[10px] uppercase tracking-[0.12em]">
              <span>User</span>
              <span>Email</span>
              <span>Status</span>
              <span>Last Login</span>
              <span>Last Seen</span>
              <span>Created</span>
              <span>Actions</span>
            </div>

            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user, index) => {
                const status = getUserStatus(user);
                const lastLogin = formatDateTime(user.lastLoginAt);
                const lastSeen = formatDateTime(user.lastSeenAt);
                const created = formatDateTime(user.createdAt);

                return (
                  <div
                    key={user._id}
                    className={`grid grid-cols-[1.3fr_1.5fr_105px_115px_115px_115px_230px] items-center border-b border-[#ecece6] px-5 py-4 gap-3 ${
                      index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-[5px] bg-[#0A0D17] text-white flex items-center justify-center text-sm font-black uppercase shrink-0 overflow-hidden">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || user.email}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitial(user)
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-black text-sm text-[#0A0D17] truncate">
                          {user.name || "No Name"}
                        </p>

                        <p className="text-[10px] text-[#0A0D17]/45 font-semibold truncate">
                          {user.phone || "No Phone"}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-[#0A0D17]/70 truncate">
                      {user.email || "No Email"}
                    </p>

                    <span
                      className={`w-fit rounded-[5px] border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${getStatusClass(
                        status
                      )}`}
                    >
                      {status}
                    </span>

                    {[lastLogin, lastSeen, created].map((dateItem, i) => (
                      <div key={i}>
                        <p className="text-xs font-black text-[#0A0D17]">
                          {dateItem.date}
                        </p>

                        <p className="text-[10px] text-[#0A0D17]/40">
                          {dateItem.time}
                        </p>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className="px-2.5 py-1.5 rounded-[5px] bg-[#FAFAF8] border border-black/10 text-[#0A0D17] text-[9px] font-black uppercase hover:bg-[#0A0D17] hover:text-white"
                      >
                        View
                      </button>

                      {!user.isDeleted && !user.isBlocked && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUserAction(
                              "block",
                              user._id,
                              "User blocked"
                            )
                          }
                          disabled={actionLoading === `block-${user._id}`}
                          className="px-2.5 py-1.5 rounded-[5px] bg-red-50 border border-red-100 text-red-600 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white disabled:opacity-50"
                        >
                          Block
                        </button>
                      )}

                      {!user.isDeleted && user.isBlocked && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUserAction(
                              "unblock",
                              user._id,
                              "User unblocked"
                            )
                          }
                          disabled={actionLoading === `unblock-${user._id}`}
                          className="px-2.5 py-1.5 rounded-[5px] bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                        >
                          Unblock
                        </button>
                      )}

                      {!user.isDeleted && user.isActive !== false && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUserAction(
                              "deactivate",
                              user._id,
                              "User deactivated"
                            )
                          }
                          disabled={
                            actionLoading === `deactivate-${user._id}`
                          }
                          className="px-2.5 py-1.5 rounded-[5px] bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-black uppercase hover:bg-amber-500 hover:text-white disabled:opacity-50"
                        >
                          Off
                        </button>
                      )}

                      {!user.isDeleted && user.isActive === false && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUserAction(
                              "reactivate",
                              user._id,
                              "User reactivated"
                            )
                          }
                          disabled={
                            actionLoading === `reactivate-${user._id}`
                          }
                          className="px-2.5 py-1.5 rounded-[5px] bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white disabled:opacity-50"
                        >
                          On
                        </button>
                      )}

                      {!user.isDeleted && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUserAction(
                              "delete",
                              user._id,
                              "User deleted"
                            )
                          }
                          disabled={actionLoading === `delete-${user._id}`}
                          className="px-2.5 py-1.5 rounded-[5px] bg-[#0A0D17] text-white text-[9px] font-black uppercase hover:bg-black disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-[#6b7280] font-semibold bg-white">
                No users found
              </div>
            )}
          </div>

          <div className="xl:hidden divide-y divide-black/10">
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => {
                const status = getUserStatus(user);
                const lastLogin = formatDateTime(user.lastLoginAt);
                const lastSeen = formatDateTime(user.lastSeenAt);
                const created = formatDateTime(user.createdAt);

                return (
                  <div key={user._id} className="p-4 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-[5px] bg-[#0A0D17] text-white flex items-center justify-center text-sm font-black uppercase shrink-0 overflow-hidden">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || user.email}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitial(user)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-black text-[#0A0D17] truncate">
                              {user.name || "No Name"}
                            </p>

                            <p className="text-xs font-semibold text-[#0A0D17]/55 break-all">
                              {user.email || "No Email"}
                            </p>

                            <p className="text-[11px] font-semibold text-[#0A0D17]/40">
                              {user.phone || "No Phone"}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-[5px] border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${getStatusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {[
                            { label: "Login", value: lastLogin },
                            { label: "Seen", value: lastSeen },
                            { label: "Created", value: created },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-2"
                            >
                              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#0A0D17]/40">
                                {item.label}
                              </p>

                              <p className="mt-1 text-[10px] font-black text-[#0A0D17]">
                                {item.value.date}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-[#FAFAF8] border border-black/10 text-[#0A0D17] text-[9px] font-black uppercase"
                          >
                            <FaEye />
                            View
                          </button>

                          {!user.isDeleted && !user.isBlocked && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUserAction(
                                  "block",
                                  user._id,
                                  "User blocked"
                                )
                              }
                              disabled={actionLoading === `block-${user._id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-red-50 border border-red-100 text-red-600 text-[9px] font-black uppercase"
                            >
                              <FaBan />
                              Block
                            </button>
                          )}

                          {!user.isDeleted && user.isBlocked && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUserAction(
                                  "unblock",
                                  user._id,
                                  "User unblocked"
                                )
                              }
                              disabled={
                                actionLoading === `unblock-${user._id}`
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase"
                            >
                              <FaUndo />
                              Unblock
                            </button>
                          )}

                          {!user.isDeleted && user.isActive !== false && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUserAction(
                                  "deactivate",
                                  user._id,
                                  "User deactivated"
                                )
                              }
                              disabled={
                                actionLoading === `deactivate-${user._id}`
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-black uppercase"
                            >
                              <FaPowerOff />
                              Deactivate
                            </button>
                          )}

                          {!user.isDeleted && user.isActive === false && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUserAction(
                                  "reactivate",
                                  user._id,
                                  "User reactivated"
                                )
                              }
                              disabled={
                                actionLoading === `reactivate-${user._id}`
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-black uppercase"
                            >
                              <FaUndo />
                              Reactivate
                            </button>
                          )}

                          {!user.isDeleted && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUserAction(
                                  "delete",
                                  user._id,
                                  "User deleted"
                                )
                              }
                              disabled={
                                actionLoading === `delete-${user._id}`
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-[#0A0D17] text-white text-[9px] font-black uppercase"
                            >
                              <FaTrash />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-[#6b7280] font-semibold bg-white">
                No users found
              </div>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/45">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
              {filteredUsers.length}
            </p>

            <div className="flex justify-center sm:justify-end gap-2 flex-wrap">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className={buttonLight}
              >
                Prev
              </button>

              {getPaginationNumbers().map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`px-3.5 py-2 border rounded-[5px] font-black text-sm ${
                    currentPage === page
                      ? "bg-[#0A0D17] text-white border-[#0A0D17]"
                      : "bg-white text-gray-900 border-[#d7d7d2]"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                className={buttonDark}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-[5px] bg-white shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-4 bg-[#0A0D17] px-5 py-5 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-[5px] bg-white/10 border border-white/10 flex items-center justify-center text-lg font-black uppercase shrink-0 overflow-hidden">
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name || selectedUser.email}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitial(selectedUser)
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-white/45 text-[10px] font-black uppercase tracking-[0.28em]">
                    User Profile
                  </p>

                  <h3 className="mt-1 text-xl font-black uppercase truncate">
                    {selectedUser.name || "No Name"}
                  </h3>

                  <p className="mt-1 text-xs font-bold text-white/55 truncate">
                    {selectedUser.email || "No Email"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-10 h-10 rounded-[5px] bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <FaTimes />
              </button>
            </div>

            <div className="bg-[#f7f7f4] p-4 sm:p-5">
              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
                <div className={`${panelBg} rounded-[5px] p-4 h-fit`}>
                  <p className={labelClass}>Account Status</p>

                  <span
                    className={`mt-3 inline-flex rounded-[5px] border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClass(
                      getUserStatus(selectedUser)
                    )}`}
                  >
                    {getUserStatus(selectedUser)}
                  </span>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                      <p className={labelClass}>Last Login</p>
                      <p className="mt-1 text-sm font-black text-[#0A0D17]">
                        {formatDateTime(selectedUser.lastLoginAt).date}
                      </p>
                    </div>

                    <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                      <p className={labelClass}>Last Seen</p>
                      <p className="mt-1 text-sm font-black text-[#0A0D17]">
                        {formatDateTime(selectedUser.lastSeenAt).date}
                      </p>
                    </div>

                    <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                      <p className={labelClass}>Created</p>
                      <p className="mt-1 text-sm font-black text-[#0A0D17]">
                        {formatDateTime(selectedUser.createdAt).date}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`${panelBg} rounded-[5px] p-4`}>
                    <p className={labelClass}>Contact Information</p>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                        <div className="flex items-center gap-2 text-[#0A0D17]/45">
                          <FaEnvelope />
                          <p className={labelClass}>Email</p>
                        </div>

                        <p className="mt-2 text-sm font-black text-[#0A0D17] break-all">
                          {selectedUser.email || "No Email"}
                        </p>
                      </div>

                      <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                        <div className="flex items-center gap-2 text-[#0A0D17]/45">
                          <FaPhone />
                          <p className={labelClass}>Phone</p>
                        </div>

                        <p className="mt-2 text-sm font-black text-[#0A0D17]">
                          {selectedUser.phone || "No Phone"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`${panelBg} rounded-[5px] p-4`}>
                    <div className="flex items-center gap-2 text-[#0A0D17]/45">
                      <FaMapMarkerAlt />
                      <p className={labelClass}>Saved Address</p>
                    </div>

                    <p className="mt-3 text-sm font-semibold leading-6 text-[#6b7280]">
                      {formatAddress(selectedUser.address)}
                    </p>
                  </div>

                  <div className={`${panelBg} rounded-[5px] p-4`}>
                    <p className={labelClass}>Preferences</p>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                        <p className={labelClass}>Preferred Size</p>
                        <p className="mt-2 text-sm font-black text-[#0A0D17]">
                          {selectedUser.preferences?.preferredSize || "N/A"}
                        </p>
                      </div>

                      <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                        <p className={labelClass}>Order Notify</p>
                        <p className="mt-2 text-sm font-black text-[#0A0D17]">
                          {selectedUser.preferences?.notifyOrders === false
                            ? "Off"
                            : "On"}
                        </p>
                      </div>

                      <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                        <p className={labelClass}>Drop Notify</p>
                        <p className="mt-2 text-sm font-black text-[#0A0D17]">
                          {selectedUser.preferences?.notifyDrops === false
                            ? "Off"
                            : "On"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`${panelBg} rounded-[5px] p-4`}>
                    <p className={labelClass}>Terms</p>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                        <p className={labelClass}>Accepted</p>
                        <p className="mt-2 text-sm font-black text-[#0A0D17]">
                          {selectedUser.termsAccepted ? "Yes" : "No"}
                        </p>
                      </div>

                      <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                        <p className={labelClass}>Version</p>
                        <p className="mt-2 text-sm font-black text-[#0A0D17]">
                          {selectedUser.termsAcceptedVersion || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className={buttonDark}
                    >
                      Close Profile
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

export default UsersPage; 