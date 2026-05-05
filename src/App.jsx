import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { Routes, Route, Navigate } from "react-router-dom";
import Orders from "./pages/Orders";
import Login from "./components/Login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Dashboard from "./pages/Dashboard";
import Trash from "./pages/Trash";
import History from "./pages/History";
import SalesReport from "./pages/SalesReport";
import SalesReportPrint from "./pages/SalesReportPrint";
import ProductPage from "./pages/ProductPage";
import SKU from "./pages/SKU";
import UsersPage from "./pages/UsersPage";
import EmployeesPage from "./pages/EmployeesPage";
import BranchesPage from "./pages/BranchesPage";
import HeroManager from "./pages/HeroManager";
import PoliciesManager from "./pages/PoliciesManager";
import CategoryManager from "./pages/CategoryManager";
import SocialFeedManager from "./pages/SocialFeedManager";
export const backendUrl = import.meta.env.VITE_BACKEND_URL;
export const currency = "₱";

const ProtectedAdminRoute = ({ children }) => {
  const role = localStorage.getItem("role");
  return role === "admin" ? children : <Navigate to="/" replace />;
};

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  useEffect(() => {
    localStorage.setItem("token", token);
  }, [token]);

  return (
    <div className="relative min-h-screen bg-[#f3f3f1] overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <p className="text-[180px] md:text-[260px] font-black tracking-tighter text-black opacity-[0.03]">
          SAINT
        </p>
      </div>

      <ToastContainer />

      {token === "" ? (
        <Login setToken={setToken} />
      ) : (
        <>
          <Navbar setToken={setToken} />

          <hr className="border-none h-[1px] bg-transparent" />

          <div className="flex w-full relative z-10">
            <Sidebar />

            <div className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base">
              <Routes>
                <Route path="/" element={<Dashboard token={token} />} />
                <Route path="/products" element={<ProductPage token={token} />} />
                <Route path="/sku" element={<SKU token={token} />} />
                <Route path="/orders" element={<Orders token={token} />} />
                <Route path="/admin/history" element={<History token={token} />} />
                <Route path="/admin/trash" element={<Trash token={token} />} />
                <Route path="/sales-report" element={<SalesReport token={token} />} />
                <Route
                  path="/sales-report-print"
                  element={<SalesReportPrint token={token} />}
                />

                <Route
                  path="/hero-manager"
                  element={
                    <ProtectedAdminRoute>
                      <HeroManager token={token} />
                    </ProtectedAdminRoute>
                  }
                />

                <Route
                  path="/categories"
                  element={
                    <ProtectedAdminRoute>
                      <CategoryManager token={token} />
                    </ProtectedAdminRoute>
                  }
                />

                <Route
                  path="/policies"
                  element={
                    <ProtectedAdminRoute>
                      <PoliciesManager token={token} />
                    </ProtectedAdminRoute>
                  }
                />

                <Route
                  path="/users"
                  element={
                    <ProtectedAdminRoute>
                      <UsersPage token={token} />
                    </ProtectedAdminRoute>
                  }
                />

                <Route
                  path="/employees"
                  element={
                    <ProtectedAdminRoute>
                      <EmployeesPage token={token} />
                    </ProtectedAdminRoute>
                  }
                />

                <Route
                  path="/branches"
                  element={
                    <ProtectedAdminRoute>
                      <BranchesPage token={token} />
                    </ProtectedAdminRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
                <Route
                  path="/social-feed"
                  element={<SocialFeedManager token={token} />}
                />
              </Routes>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;