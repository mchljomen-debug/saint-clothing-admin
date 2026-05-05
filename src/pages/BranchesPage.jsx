import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import {
  FaStore,
  FaSearch,
  FaSyncAlt,
  FaPlus,
  FaEdit,
  FaSave,
  FaTimes,
  FaMapMarkerAlt,
  FaPhone,
  FaUserTie,
  FaCheckCircle,
  FaBan,
} from "react-icons/fa";

const ITEMS_PER_PAGE = 8;

const BranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    contactNumber: "",
    managerName: "",
  });

  const [editData, setEditData] = useState({
    name: "",
    address: "",
    contactNumber: "",
    managerName: "",
    isActive: true,
  });

  const token = localStorage.getItem("token");

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      token,
    },
  };

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

  const fetchBranches = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      const res = await axios.get(`${backendUrl}/api/branch/list`, axiosConfig);

      if (res.data.success) {
        setBranches(res.data.branches || []);
      } else {
        toast.error(res.data.message || "Failed to load branches");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to load branches");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) fetchBranches();
  }, [token]);

  const onChangeHandler = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onEditChangeHandler = (e) => {
    const { name, value, type, checked } = e.target;

    setEditData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      contactNumber: "",
      managerName: "",
    });
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) return toast.error("Branch name is required");
    if (!formData.code.trim()) return toast.error("Branch code is required");

    try {
      setSaving(true);

      const res = await axios.post(
        `${backendUrl}/api/branch/add`,
        {
          name: formData.name.trim(),
          code: formData.code.trim().toLowerCase(),
          address: formData.address.trim(),
          contactNumber: formData.contactNumber.trim(),
          managerName: formData.managerName.trim(),
        },
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Branch added successfully");
        resetForm();
        setCurrentPage(1);
        fetchBranches(true);
      } else {
        toast.error(res.data.message || "Failed to add branch");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to add branch");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (branch) => {
    setEditingId(branch._id);
    setEditData({
      name: branch.name || "",
      address: branch.address || "",
      contactNumber: branch.contactNumber || "",
      managerName: branch.managerName || "",
      isActive: !!branch.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({
      name: "",
      address: "",
      contactNumber: "",
      managerName: "",
      isActive: true,
    });
  };

  const saveEdit = async (id) => {
    try {
      setSaving(true);

      const res = await axios.put(
        `${backendUrl}/api/branch/update/${id}`,
        {
          name: editData.name.trim(),
          address: editData.address.trim(),
          contactNumber: editData.contactNumber.trim(),
          managerName: editData.managerName.trim(),
          isActive: editData.isActive,
        },
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Branch updated successfully");
        setEditingId(null);
        fetchBranches(true);
      } else {
        toast.error(res.data.message || "Failed to update branch");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to update branch");
    } finally {
      setSaving(false);
    }
  };

  const filteredBranches = useMemo(() => {
    const term = search.trim().toLowerCase();

    return branches.filter((branch) => {
      const matchesSearch =
        !term ||
        String(branch.name || "").toLowerCase().includes(term) ||
        String(branch.code || "").toLowerCase().includes(term) ||
        String(branch.address || "").toLowerCase().includes(term) ||
        String(branch.contactNumber || "").toLowerCase().includes(term) ||
        String(branch.managerName || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && branch.isActive) ||
        (statusFilter === "Inactive" && !branch.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [branches, search, statusFilter]);

  const totalPages = Math.ceil(filteredBranches.length / ITEMS_PER_PAGE) || 1;

  const paginatedBranches = filteredBranches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: branches.length,
      active: branches.filter((b) => b.isActive).length,
      inactive: branches.filter((b) => !b.isActive).length,
      withManagers: branches.filter((b) => !!b.managerName).length,
    };
  }, [branches]);

  const getStatusClass = (isActive) => {
    return isActive
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-red-50 text-red-700 border-red-200";
  };

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-[5px] bg-white/70" />
            ))}
          </div>
          <div className="h-44 rounded-[5px] bg-white/70" />
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
                  <FaStore className="text-sm" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
                    Branch Management
                  </h1>

                  <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                    Manage store branches, contact details, managers, and
                    branch status.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchBranches(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm disabled:opacity-50"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              Refresh Branches
            </button>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17]">
                Branch Overview
              </h3>

              <p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">
                Summary of all branches registered in the system.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total Branches",
                value: summary.total,
                icon: <FaStore />,
                className: "text-[#0A0D17]",
              },
              {
                label: "Active",
                value: summary.active,
                icon: <FaCheckCircle />,
                className: "text-emerald-700",
              },
              {
                label: "Inactive",
                value: summary.inactive,
                icon: <FaBan />,
                className: "text-red-600",
              },
              {
                label: "With Manager",
                value: summary.withManagers,
                icon: <FaUserTie />,
                className: "text-[#0A0D17]",
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
          <div className="mb-5">
            <p className={labelClass}>Branch Form</p>

            <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
              Add Branch
            </h3>

            <p className="mt-1 text-xs text-[#6b7280]">
              Create a new branch with a unique lowercase branch code.
            </p>
          </div>

          <form
            onSubmit={onSubmitHandler}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3"
          >
            <input
              type="text"
              name="name"
              placeholder="Branch Name"
              value={formData.name}
              onChange={onChangeHandler}
              className={inputClass}
              required
            />

            <input
              type="text"
              name="code"
              placeholder="Branch Code"
              value={formData.code}
              onChange={onChangeHandler}
              className={inputClass}
              required
            />

            <input
              type="text"
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={onChangeHandler}
              className={inputClass}
            />

            <input
              type="text"
              name="contactNumber"
              placeholder="Contact Number"
              value={formData.contactNumber}
              onChange={onChangeHandler}
              className={inputClass}
            />

            <input
              type="text"
              name="managerName"
              placeholder="Manager Name"
              value={formData.managerName}
              onChange={onChangeHandler}
              className={inputClass}
            />

            <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={saving} className={buttonDark}>
                <FaPlus />
                {saving ? "Adding..." : "Add Branch"}
              </button>

              <button type="button" onClick={resetForm} className={buttonLight}>
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_220px_150px] gap-3 items-end">
            <div>
              <p className={labelClass}>Search Branch</p>

              <div className="relative mt-2">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0D17]/35 text-sm" />

                <input
                  type="text"
                  placeholder="Search name, code, address, contact, manager..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] px-4 py-3">
              <p className={labelClass}>Showing</p>
              <p className="mt-1 text-sm font-black text-[#0A0D17]">
                {paginatedBranches.length} / {filteredBranches.length}
              </p>
            </div>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] overflow-hidden`}>
          <div className="px-4 sm:px-5 py-5 border-b border-black/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className={labelClass}>Branches Table</p>

                <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                  Store Branches
                </h3>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">
                Page {currentPage} of {totalPages}
              </p>
            </div>
          </div>

          <div className="hidden xl:block">
            <div className="grid grid-cols-[1.1fr_120px_1.7fr_145px_1.1fr_105px_150px] bg-[#0A0D17] text-white px-5 py-4 font-black text-[10px] uppercase tracking-[0.12em]">
              <span>Name</span>
              <span>Code</span>
              <span>Address</span>
              <span>Contact</span>
              <span>Manager</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {paginatedBranches.length > 0 ? (
              paginatedBranches.map((branch, index) => (
                <div
                  key={branch._id}
                  className={`grid grid-cols-[1.1fr_120px_1.7fr_145px_1.1fr_105px_150px] items-center border-b border-[#ecece6] px-5 py-4 gap-3 ${
                    index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                  }`}
                >
                  <div className="min-w-0">
                    {editingId === branch._id ? (
                      <input
                        type="text"
                        name="name"
                        value={editData.name}
                        onChange={onEditChangeHandler}
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-black text-sm text-[#0A0D17] truncate">
                        {branch.name}
                      </p>
                    )}
                  </div>

                  <span className="w-fit rounded-[5px] border border-black/10 bg-[#FAFAF8] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#0A0D17]">
                    {branch.code}
                  </span>

                  <div className="min-w-0">
                    {editingId === branch._id ? (
                      <input
                        type="text"
                        name="address"
                        value={editData.address}
                        onChange={onEditChangeHandler}
                        className={inputClass}
                      />
                    ) : (
                      <p className="text-xs font-semibold text-[#0A0D17]/70 truncate">
                        {branch.address || "-"}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0">
                    {editingId === branch._id ? (
                      <input
                        type="text"
                        name="contactNumber"
                        value={editData.contactNumber}
                        onChange={onEditChangeHandler}
                        className={inputClass}
                      />
                    ) : (
                      <p className="text-xs font-semibold text-[#0A0D17]/70 truncate">
                        {branch.contactNumber || "-"}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0">
                    {editingId === branch._id ? (
                      <input
                        type="text"
                        name="managerName"
                        value={editData.managerName}
                        onChange={onEditChangeHandler}
                        className={inputClass}
                      />
                    ) : (
                      <p className="text-xs font-semibold text-[#0A0D17]/70 truncate">
                        {branch.managerName || "-"}
                      </p>
                    )}
                  </div>

                  <div>
                    {editingId === branch._id ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={editData.isActive}
                          onChange={onEditChangeHandler}
                          className="w-4 h-4 accent-[#0A0D17]"
                        />

                        <span
                          className={`rounded-[5px] border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${getStatusClass(
                            editData.isActive
                          )}`}
                        >
                          {editData.isActive ? "Active" : "Inactive"}
                        </span>
                      </label>
                    ) : (
                      <span
                        className={`w-fit rounded-[5px] border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${getStatusClass(
                          branch.isActive
                        )}`}
                      >
                        {branch.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {editingId === branch._id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(branch._id)}
                          disabled={saving}
                          className="px-2.5 py-1.5 rounded-[5px] bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-2.5 py-1.5 rounded-[5px] bg-gray-100 border border-gray-200 text-gray-700 text-[9px] font-black uppercase hover:bg-gray-600 hover:text-white"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(branch)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-[#0A0D17] text-white text-[9px] font-black uppercase hover:bg-black"
                      >
                        <FaEdit />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-[#6b7280] font-semibold bg-white">
                No branches found
              </div>
            )}
          </div>

          <div className="xl:hidden divide-y divide-black/10">
            {paginatedBranches.length > 0 ? (
              paginatedBranches.map((branch) => (
                <div key={branch._id} className="p-4 bg-white">
                  {editingId === branch._id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        name="name"
                        value={editData.name}
                        onChange={onEditChangeHandler}
                        className={inputClass}
                        placeholder="Branch Name"
                      />

                      <input
                        type="text"
                        name="address"
                        value={editData.address}
                        onChange={onEditChangeHandler}
                        className={inputClass}
                        placeholder="Address"
                      />

                      <input
                        type="text"
                        name="contactNumber"
                        value={editData.contactNumber}
                        onChange={onEditChangeHandler}
                        className={inputClass}
                        placeholder="Contact Number"
                      />

                      <input
                        type="text"
                        name="managerName"
                        value={editData.managerName}
                        onChange={onEditChangeHandler}
                        className={inputClass}
                        placeholder="Manager Name"
                      />

                      <label className="flex items-center gap-3 rounded-[5px] border border-black/10 bg-[#FAFAF8] px-3 py-2">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={editData.isActive}
                          onChange={onEditChangeHandler}
                          className="w-4 h-4 accent-[#0A0D17]"
                        />
                        <span className="text-xs font-black uppercase text-[#0A0D17]">
                          Active Branch
                        </span>
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(branch._id)}
                          disabled={saving}
                          className={buttonDark}
                        >
                          <FaSave />
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          className={buttonLight}
                        >
                          <FaTimes />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-[#0A0D17] truncate">
                            {branch.name}
                          </p>

                          <span className="mt-2 inline-flex rounded-[5px] border border-black/10 bg-[#FAFAF8] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#0A0D17]">
                            {branch.code}
                          </span>
                        </div>

                        <span
                          className={`shrink-0 rounded-[5px] border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${getStatusClass(
                            branch.isActive
                          )}`}
                        >
                          {branch.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2">
                        <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                          <div className="flex items-center gap-2 text-[#0A0D17]/45">
                            <FaMapMarkerAlt />
                            <p className={labelClass}>Address</p>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-[#0A0D17]/70">
                            {branch.address || "-"}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                            <div className="flex items-center gap-2 text-[#0A0D17]/45">
                              <FaPhone />
                              <p className={labelClass}>Contact</p>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-[#0A0D17]/70">
                              {branch.contactNumber || "-"}
                            </p>
                          </div>

                          <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
                            <div className="flex items-center gap-2 text-[#0A0D17]/45">
                              <FaUserTie />
                              <p className={labelClass}>Manager</p>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-[#0A0D17]/70">
                              {branch.managerName || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => startEdit(branch)}
                          className={buttonDark}
                        >
                          <FaEdit />
                          Edit Branch
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-[#6b7280] font-semibold bg-white">
                No branches found
              </div>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/45">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredBranches.length)}{" "}
              of {filteredBranches.length}
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
    </div>
  );
};

export default BranchesPage;