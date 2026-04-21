import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);

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

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/employees`, axiosConfig);

      if (res.data.success) {
        setEmployees(res.data.employees || []);
      } else {
        toast.error(res.data.message || "Failed to load employees");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to load employees");
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
    };
  }, [employees]);

  const inputClass =
    "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A0D17] outline-none transition focus:border-[#0A0D17] focus:shadow-[0_0_0_4px_rgba(10,13,23,0.05)]";

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
                Employees Management
              </h2>
              <p className="mt-2 text-sm text-white/70 max-w-2xl">
                Manage staff, managers, and admin accounts with a cleaner premium
                workspace.
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
                  Managers
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {summary.managers}
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
                  Employee Form
                </p>
                <h3 className="mt-2 text-xl font-black uppercase text-[#0A0D17]">
                  {editingId ? "Edit Employee" : "Add Employee"}
                </h3>
              </div>

              {editingId && (
                <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Editing Mode
                </div>
              )}
            </div>

            <form
              onSubmit={onSubmitHandler}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4"
            >
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={onChangeHandler}
                className={inputClass}
                required
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={onChangeHandler}
                className={inputClass}
                required
              />

              <input
                type="text"
                name="password"
                placeholder={editingId ? "New Password (optional)" : "Password"}
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

              <div className="md:col-span-2 xl:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                <div className="rounded-2xl border border-black/10 bg-[#fafaf8] p-4">
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/60 mb-3">
                    Employee Picture
                  </label>
                  <input
                    type="file"
                    name="picture"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={onChangeHandler}
                    className={inputClass}
                  />
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#fafaf8] p-4">
                  <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/60 mb-3">
                    Resume File
                  </label>
                  <input
                    type="file"
                    name="resume"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={onChangeHandler}
                    className={inputClass}
                  />
                </div>
              </div>

              <label className="md:col-span-2 xl:col-span-5 flex items-center gap-3 text-sm font-semibold text-[#0A0D17] mt-1">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={onChangeHandler}
                  className="w-4 h-4 accent-[#0A0D17]"
                />
                Active Employee
              </label>

              <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-[#0A0D17] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-[0.14em] shadow-[0_10px_24px_rgba(10,13,23,0.2)] hover:bg-black transition"
                >
                  {editingId ? "Update Employee" : "Add Employee"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-[0.14em] hover:bg-gray-600 transition"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search name, email, branch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />

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

          <div className="mt-6 rounded-[26px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-[#f6f6f4] to-[#eceae5]">
                  <tr>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Picture
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Name
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Email
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Role
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Branch
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Manager
                    </th>
                    <th className="p-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/70">
                      Resume
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
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee, index) => (
                      <tr
                        key={employee._id}
                        className={`border-t border-black/5 transition-colors hover:bg-[#fafaf8] ${
                          index % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                        }`}
                      >
                        <td className="p-4 align-top">
                          {employee.picture ? (
                            <img
                              src={getImageUrl(employee.picture)}
                              alt={employee.name}
                              className="w-12 h-12 rounded-full object-cover border border-black/10 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#ececec] flex items-center justify-center text-xs text-gray-500 font-bold">
                              No Img
                            </div>
                          )}
                        </td>

                        <td className="p-4 font-bold text-[#0A0D17] align-top">
                          {employee.name}
                        </td>

                        <td className="p-4 text-[#0A0D17]/75 font-semibold align-top break-all">
                          {employee.email}
                        </td>

                        <td className="p-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getRoleClass(
                              employee.role
                            )}`}
                          >
                            {employee.role}
                          </span>
                        </td>

                        <td className="p-4 text-[#0A0D17] font-semibold align-top">
                          {employee.branch}
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
                              className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700 hover:bg-sky-100"
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
                            className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
                              employee.isActive
                            )}`}
                          >
                            {employee.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="p-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => startEdit(employee)}
                              className="px-3 py-2 bg-[#0A0D17] text-white rounded-full text-[10px] font-black uppercase tracking-[0.12em] hover:bg-black"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeEmployee(employee._id)}
                              className="px-3 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.12em] hover:bg-red-700"
                            >
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
                        className="p-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-[#f3f3f1] border border-black/5 flex items-center justify-center text-[#0A0D17]/35 text-lg font-black">
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
    </div>
  );
};

export default EmployeesPage;