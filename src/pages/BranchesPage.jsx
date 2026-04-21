import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

const BranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

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
    headers: { Authorization: `Bearer ${token}` },
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/branch/list`, axiosConfig);

      if (res.data.success) {
        setBranches(res.data.branches || []);
      } else {
        toast.error(res.data.message || "Failed to load branches");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to load branches");
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

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        `${backendUrl}/api/branch/add`,
        formData,
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Branch added successfully");
        setFormData({
          name: "",
          code: "",
          address: "",
          contactNumber: "",
          managerName: "",
        });
        fetchBranches();
      } else {
        toast.error(res.data.message || "Failed to add branch");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to add branch");
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
      const res = await axios.put(
        `${backendUrl}/api/branch/update/${id}`,
        editData,
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Branch updated successfully");
        setEditingId(null);
        fetchBranches();
      } else {
        toast.error(res.data.message || "Failed to update branch");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to update branch");
    }
  };

  const filteredBranches = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return branches;

    return branches.filter((branch) => {
      return (
        String(branch.name || "").toLowerCase().includes(term) ||
        String(branch.code || "").toLowerCase().includes(term) ||
        String(branch.address || "").toLowerCase().includes(term) ||
        String(branch.contactNumber || "").toLowerCase().includes(term) ||
        String(branch.managerName || "").toLowerCase().includes(term)
      );
    });
  }, [branches, search]);

  const summary = useMemo(() => {
    return {
      total: branches.length,
      active: branches.filter((b) => b.isActive).length,
      inactive: branches.filter((b) => !b.isActive).length,
      withManagers: branches.filter((b) => !!b.managerName).length,
    };
  }, [branches]);

  const inputClass =
    "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A0D17] outline-none transition focus:border-[#0A0D17] focus:shadow-[0_0_0_4px_rgba(10,13,23,0.05)]";

  const getStatusClass = (isActive) => {
    return isActive
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-red-50 text-red-700 border-red-200";
  };

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
                Branch Management
              </h2>
              <p className="mt-2 text-sm text-white/70 max-w-2xl">
                Manage store branches, contact details, managers, and branch status.
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
                  Inactive
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {summary.inactive}
                </p>
              </div>

              <div className="min-w-[120px] px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  With Manager
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {summary.withManagers}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 md:px-8 py-6">
          <div className="rounded-[26px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-5 md:p-6">
            <div className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#0A0D17]/55">
                  Branch Form
                </p>
                <h3 className="mt-2 text-xl font-black uppercase text-[#0A0D17]">
                  Add Branch
                </h3>
              </div>
            </div>

            <form
              onSubmit={onSubmitHandler}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4"
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
                placeholder="Branch Code (ex. branch3)"
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

              <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-[#0A0D17] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-[0.14em] shadow-[0_10px_24px_rgba(10,13,23,0.2)] hover:bg-black transition"
                >
                  Add Branch
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr] gap-4">
            <input
              type="text"
              placeholder="Search name, code, address, contact, manager"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="mt-6 rounded-[26px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-[#f6f6f4] to-[#eceae5]">
                  <tr>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Name
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Code
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Address
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Contact
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Manager
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Status
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBranches.length > 0 ? (
                    filteredBranches.map((branch, index) => (
                      <tr
                        key={branch._id}
                        className={`border-t border-black/5 transition-colors hover:bg-[#fafaf8] ${
                          index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                        }`}
                      >
                        <td className="p-4 align-top font-bold text-[#0A0D17]">
                          {editingId === branch._id ? (
                            <input
                              type="text"
                              name="name"
                              value={editData.name}
                              onChange={onEditChangeHandler}
                              className={inputClass}
                            />
                          ) : (
                            branch.name
                          )}
                        </td>

                        <td className="p-4 align-top">
                          <span className="inline-flex rounded-full border border-black/10 bg-[#f5f5f4] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0D17]">
                            {branch.code}
                          </span>
                        </td>

                        <td className="p-4 align-top text-[#0A0D17]/75 font-semibold">
                          {editingId === branch._id ? (
                            <input
                              type="text"
                              name="address"
                              value={editData.address}
                              onChange={onEditChangeHandler}
                              className={inputClass}
                            />
                          ) : (
                            branch.address || "-"
                          )}
                        </td>

                        <td className="p-4 align-top text-[#0A0D17]/75 font-semibold">
                          {editingId === branch._id ? (
                            <input
                              type="text"
                              name="contactNumber"
                              value={editData.contactNumber}
                              onChange={onEditChangeHandler}
                              className={inputClass}
                            />
                          ) : (
                            branch.contactNumber || "-"
                          )}
                        </td>

                        <td className="p-4 align-top text-[#0A0D17]/75 font-semibold">
                          {editingId === branch._id ? (
                            <input
                              type="text"
                              name="managerName"
                              value={editData.managerName}
                              onChange={onEditChangeHandler}
                              className={inputClass}
                            />
                          ) : (
                            branch.managerName || "-"
                          )}
                        </td>

                        <td className="p-4 align-top">
                          {editingId === branch._id ? (
                            <label className="flex items-center gap-3 text-sm font-semibold text-[#0A0D17]">
                              <input
                                type="checkbox"
                                name="isActive"
                                checked={editData.isActive}
                                onChange={onEditChangeHandler}
                                className="w-4 h-4 accent-[#0A0D17]"
                              />
                              <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
                                  editData.isActive
                                )}`}
                              >
                                {editData.isActive ? "Active" : "Inactive"}
                              </span>
                            </label>
                          ) : (
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
                                branch.isActive
                              )}`}
                            >
                              {branch.isActive ? "Active" : "Inactive"}
                            </span>
                          )}
                        </td>

                        <td className="p-4 align-top">
                          {editingId === branch._id ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => saveEdit(branch._id)}
                                className="px-3 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.12em] hover:bg-emerald-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-2 bg-gray-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.12em] hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(branch)}
                              className="px-3 py-2 bg-[#0A0D17] text-white rounded-full text-[10px] font-black uppercase tracking-[0.12em] hover:bg-black"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="p-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-[#f3f3f1] border border-black/5 flex items-center justify-center text-[#0A0D17]/35 text-lg font-black">
                            B
                          </div>
                          <p className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                            No branches found
                          </p>
                          <p className="mt-2 text-xs text-[#0A0D17]/35">
                            Try adding a new branch or changing your search.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchesPage;