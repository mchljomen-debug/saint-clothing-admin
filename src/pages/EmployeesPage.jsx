import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUserTie,
  FaSearch,
  FaEdit,
  FaTrash,
  FaSyncAlt,
  FaFileAlt,
  FaImage,
  FaFilter,
  FaPlus,
} from "react-icons/fa";

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: "",
    email: "",
    password: "",
    role: "staff",
    branch: "",
    resume: null,
    picture: null,
    isActive: true,
  };

  const [formData, setFormData] = useState(emptyForm);

  const token = localStorage.getItem("token");

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
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

  const fetchEmployees = async () => {
    setRefreshing(true);

    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/employees`,
        axiosConfig
      );

      if (res.data.success) {
        setEmployees(res.data.employees || []);
      } else {
        toast.error(res.data.message || "Failed to load employees");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to load employees");
    } finally {
      setRefreshing(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/branch/list`, axiosConfig);

      if (res.data.success) {
        const activeBranches = (res.data.branches || []).filter(
          (branch) => branch.isActive
        );

        setBranches(activeBranches);

        setFormData((prev) => ({
          ...prev,
          branch: prev.branch || activeBranches[0]?.code || "",
        }));
      } else {
        toast.error(res.data.message || "Failed to load branches");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to load branches");
    }
  };

  useEffect(() => {
    if (token) {
      fetchEmployees();
      fetchBranches();
    }
  }, [token]);

  const onChangeHandler = (e) => {
    const { name, value, type, files, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "file"
          ? files?.[0] || null
          : type === "checkbox"
          ? checked
          : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      ...emptyForm,
      branch: branches[0]?.code || "",
    });
    setEditingId(null);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = new FormData();

      submitData.append("name", formData.name);
      submitData.append("email", formData.email);
      submitData.append("role", formData.role);
      submitData.append(
        "branch",
        formData.role === "admin" ? "all" : formData.branch
      );
      submitData.append("isActive", formData.isActive);

      if (formData.password) {
        submitData.append("password", formData.password);
      }

      if (formData.resume) {
        submitData.append("resume", formData.resume);
      }

      if (formData.picture) {
        submitData.append("picture", formData.picture);
      }

      const res = editingId
        ? await axios.put(
            `${backendUrl}/api/admin/employees/${editingId}`,
            submitData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
              },
            }
          )
        : await axios.post(`${backendUrl}/api/admin/employees`, submitData, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          });

      if (res.data.success) {
        toast.success(
          res.data.message ||
            (editingId
              ? "Employee updated successfully"
              : "Employee created successfully")
        );

        resetForm();
        fetchEmployees();
        fetchBranches();
      } else {
        toast.error(res.data.message || "Failed to save employee");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to save employee");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (employee) => {
    setEditingId(employee._id);
    setFormData({
      name: employee.name || "",
      email: employee.email || "",
      password: "",
      role: employee.role || "staff",
      branch: employee.branch === "all" ? "" : employee.branch,
      resume: null,
      picture: null,
      isActive: !!employee.isActive,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeEmployee = async (id) => {
    if (!window.confirm("Remove this employee?")) return;

    try {
      const res = await axios.delete(
        `${backendUrl}/api/admin/employees/${id}`,
        axiosConfig
      );

      if (res.data.success) {
        toast.success(res.data.message || "Employee removed successfully");

        if (editingId === id) resetForm();

        fetchEmployees();
        fetchBranches();
      } else {
        toast.error(res.data.message || "Failed to remove employee");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to remove employee");
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchRole =
        roleFilter === "All" ? true : employee.role === roleFilter;

      const matchBranch =
        branchFilter === "All" ? true : employee.branch === branchFilter;

      const term = search.trim().toLowerCase();

      const matchSearch =
        !term ||
        employee.name?.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term) ||
        employee.branch?.toLowerCase().includes(term);

      return matchRole && matchBranch && matchSearch;
    });
  }, [employees, roleFilter, branchFilter, search]);

  const summary = useMemo(() => {
    return {
      total: employees.length,
      active: employees.filter((e) => e.isActive).length,
      inactive: employees.filter((e) => !e.isActive).length,
      managers: employees.filter((e) => e.role === "manager").length,
      admins: employees.filter((e) => e.role === "admin").length,
      staff: employees.filter((e) => e.role === "staff").length,
    };
  }, [employees]);

  const getRoleClass = (role) => {
    if (role === "admin") {
      return "bg-[#0A0D17] text-white border-[#0A0D17]";
    }

    if (role === "manager") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    return "bg-sky-50 text-sky-700 border-sky-200";
  };

  const getStatusClass = (isActive) => {
    return isActive
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-red-50 text-red-700 border-red-200";
  };

  const getImageUrl = (picture) => {
    if (!picture) return "";
    if (picture.startsWith("http")) return picture;
    return `${backendUrl}/uploads/${picture}`;
  };

  const getBranchName = (code) => {
    if (code === "all") return "All Branches";

    const found = branches.find((branch) => branch.code === code);
    return found ? `${found.name} (${found.code})` : code || "Unassigned";
  };

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
                    Employees Management
                  </h1>
                  <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                    Manage staff, managers, admin accounts, branch assignment,
                    documents, and access status.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchEmployees();
                fetchBranches();
              }}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm disabled:opacity-50"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              Refresh Employees
            </button>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17]">
                Employee Overview
              </h3>
              <p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">
                Summary of admin panel employee accounts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              {
                label: "Total",
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
                label: "Inactive",
                value: summary.inactive,
                icon: <FaUserTimes />,
                className: "text-red-600",
              },
              {
                label: "Managers",
                value: summary.managers,
                icon: <FaUserTie />,
                className: "text-amber-700",
              },
              {
                label: "Admins",
                value: summary.admins,
                icon: <FaUsers />,
                className: "text-[#0A0D17]",
              },
              {
                label: "Staff",
                value: summary.staff,
                icon: <FaUsers />,
                className: "text-sky-700",
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

        <form
          onSubmit={onSubmitHandler}
          className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
            <div>
              <p className={labelClass}>Employee Form</p>

              <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                {editingId ? "Edit Employee" : "Add Employee"}
              </h3>

              <p className="text-sm text-[#6b7280] mt-1">
                Create or update employee credentials, branch access, and file
                records.
              </p>
            </div>

            {editingId && (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-[5px] border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Editing Mode
                </span>

                <button type="button" onClick={resetForm} className={buttonLight}>
                  Cancel Edit
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3">
            <div className={`${softPanelBg} rounded-[5px] p-4`}>
              <p className={labelClass}>Basic Information</p>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  name="name"
                  placeholder="Employee Name"
                  value={formData.name}
                  onChange={onChangeHandler}
                  className={inputClass}
                  required
                />

                <input
                  type="email"
                  name="email"
                  placeholder="Employee Email"
                  value={formData.email}
                  onChange={onChangeHandler}
                  className={inputClass}
                  required
                />

                <input
                  type="text"
                  name="password"
                  placeholder={
                    editingId ? "New Password (optional)" : "Password"
                  }
                  value={formData.password}
                  onChange={onChangeHandler}
                  className={inputClass}
                  required={!editingId}
                />

                <select
                  name="role"
                  value={formData.role}
                  onChange={onChangeHandler}
                  className={inputClass}
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>

                {formData.role !== "admin" ? (
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={onChangeHandler}
                    className={inputClass}
                    required
                  >
                    {branches.length > 0 ? (
                      branches.map((branch) => (
                        <option key={branch._id} value={branch.code}>
                          {branch.name} ({branch.code})
                        </option>
                      ))
                    ) : (
                      <option value="">No branches available</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value="all"
                    disabled
                    className={`${inputClass} bg-[#f3f3f1] text-[#0A0D17]/45`}
                  />
                )}

                <label className="flex items-center gap-3 rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-[#0A0D17]">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={onChangeHandler}
                    className="w-4 h-4 accent-[#0A0D17]"
                  />
                  Active Employee
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className={`${softPanelBg} rounded-[5px] p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <FaImage className="text-[#0A0D17]/45" />
                  <p className={labelClass}>Employee Picture</p>
                </div>

                <input
                  type="file"
                  name="picture"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={onChangeHandler}
                  className={inputClass}
                />

                {formData.picture && (
                  <p className="mt-2 text-xs font-bold text-[#0A0D17]/50">
                    Selected: {formData.picture.name}
                  </p>
                )}
              </div>

              <div className={`${softPanelBg} rounded-[5px] p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <FaFileAlt className="text-[#0A0D17]/45" />
                  <p className={labelClass}>Resume File</p>
                </div>

                <input
                  type="file"
                  name="resume"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={onChangeHandler}
                  className={inputClass}
                />

                {formData.resume && (
                  <p className="mt-2 text-xs font-bold text-[#0A0D17]/50">
                    Selected: {formData.resume.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button type="submit" disabled={saving} className={buttonDark}>
              <FaPlus />
              {saving
                ? "Saving..."
                : editingId
                ? "Update Employee"
                : "Add Employee"}
            </button>

            {editingId && (
              <button type="button" onClick={resetForm} className={buttonLight}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="flex items-center gap-2 mb-4">
            <FaFilter className="text-[#0A0D17]/45" />
            <p className={labelClass}>Employee Filters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0D17]/35 text-sm" />
              <input
                type="text"
                placeholder="Search name, email, branch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-[5px] border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Branches</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch.code}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] overflow-hidden`}>
          <div className="px-4 sm:px-5 py-5 border-b border-black/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className={labelClass}>Employee Table</p>

                <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                  Employee List
                </h3>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">
                {filteredEmployees.length} items
              </p>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-[#0A0D17] text-white">
                <tr>
                  <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Picture
                  </th>
                  <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Name
                  </th>
                  <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Email
                  </th>
                  <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Role
                  </th>
                  <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Branch
                  </th>
                  <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Manager
                  </th>
                  <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Resume
                  </th>
                  <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Status
                  </th>
                  <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee, index) => (
                    <tr
                      key={employee._id}
                      className={`border-b border-[#ecece6] transition-colors hover:bg-[#fafaf8] ${
                        index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                      }`}
                    >
                      <td className="p-4 align-top">
                        {employee.picture ? (
                          <img
                            src={getImageUrl(employee.picture)}
                            alt={employee.name}
                            className="w-12 h-12 rounded-[5px] object-cover border border-black/10 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-[5px] bg-[#ececec] flex items-center justify-center text-[9px] text-gray-500 font-black uppercase">
                            No Img
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-black text-[#0A0D17] align-top">
                        {employee.name}
                      </td>

                      <td className="p-4 text-[#0A0D17]/75 font-semibold align-top break-all">
                        {employee.email}
                      </td>

                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex rounded-[5px] border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getRoleClass(
                            employee.role
                          )}`}
                        >
                          {employee.role}
                        </span>
                      </td>

                      <td className="p-4 text-[#0A0D17] font-semibold align-top">
                        {getBranchName(employee.branch)}
                      </td>

                      <td className="p-4 text-[#0A0D17]/75 font-semibold align-top">
                        {employee.role === "manager" ? "Yes" : "No"}
                      </td>

                      <td className="p-4 align-top">
                        {employee.resume ? (
                          <a
                            href={`${backendUrl}/uploads/${employee.resume}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-[5px] border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700 hover:bg-sky-100"
                          >
                            View Resume
                          </a>
                        ) : (
                          <span className="text-[#0A0D17]/40 font-semibold">
                            No File
                          </span>
                        )}
                      </td>

                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex rounded-[5px] border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
                            employee.isActive
                          )}`}
                        >
                          {employee.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="p-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(employee)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0A0D17] text-white rounded-[5px] text-xs font-black hover:bg-[#1d2433] transition"
                          >
                            <FaEdit />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => removeEmployee(employee._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-[5px] text-xs font-black hover:bg-red-500 hover:text-white transition"
                          >
                            <FaTrash />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className="p-12 text-center text-gray-500 bg-white"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-14 h-14 rounded-[5px] bg-[#f3f3f1] border border-black/5 flex items-center justify-center text-[#0A0D17]/35 text-lg font-black">
                          E
                        </div>

                        <p className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
                          No employees found
                        </p>

                        <p className="mt-2 text-xs text-[#0A0D17]/35">
                          Try changing the search or filters.
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
  );
};

export default EmployeesPage;