import React,{useEffect,useState}from"react";
import Navbar from"./components/Navbar";
import Sidebar from"./components/Sidebar";
import{Routes,Route,Navigate}from"react-router-dom";
import Orders from"./pages/Orders";
import Login from"./components/Login";
import{ToastContainer}from"react-toastify";
import"react-toastify/dist/ReactToastify.css";
import Dashboard from"./pages/Dashboard";
import Trash from"./pages/Trash";
import History from"./pages/History";
import SalesReport from"./pages/SalesReport";
import SalesReportPrint from"./pages/SalesReportPrint";
import ProductPage from"./pages/ProductPage";
import SKU from"./pages/SKU";
import UsersPage from"./pages/UsersPage";
import EmployeesPage from"./pages/EmployeesPage";
import BranchesPage from"./pages/BranchesPage";
import HeroManager from"./pages/HeroManager";
import PoliciesManager from"./pages/PoliciesManager";
import CategoryManager from"./pages/CategoryManager";

export const backendUrl=import.meta.env.VITE_BACKEND_URL;
export const currency="₱";

const getDefaultRoute=(role)=>{
  if(role==="staff")return"/products";
  return"/";
};

const RoleRoute=({children,allowedRoles=[],role})=>{
  if(!allowedRoles.includes(role)){
    return<Navigate to={getDefaultRoute(role)} replace/>;
  }

  return children;
};

const App=()=>{
  const[token,setToken]=useState(localStorage.getItem("token")||"");
  const[role,setRole]=useState(localStorage.getItem("role")||"");

  useEffect(()=>{
    if(token){
      localStorage.setItem("token",token);
      setRole(localStorage.getItem("role")||"");
    }else{
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("branch");
      localStorage.removeItem("adminName");
      setRole("");
    }
  },[token]);

  return(
    <div className="relative min-h-screen bg-[#f3f3f1] overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <p className="text-[180px] md:text-[260px] font-black tracking-tighter text-black opacity-[0.03]">
          SAINT
        </p>
      </div>

      <ToastContainer/>

      {token===""?(
        <Login setToken={setToken}/>
      ):(
        <>
          <Navbar setToken={setToken}/>

          <hr className="border-none h-[1px] bg-transparent"/>

          <div className="flex w-full relative z-10">
            <Sidebar/>

            <div className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base">
              <Routes>
                <Route
                  path="/"
                  element={
                    role==="staff"
                      ?<Navigate to="/products" replace/>
                      :(
                        <RoleRoute role={role} allowedRoles={["admin","manager"]}>
                          <Dashboard token={token}/>
                        </RoleRoute>
                      )
                  }
                />

                <Route
                  path="/products"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin","manager","staff"]}>
                      <ProductPage token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/orders"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin","manager","staff"]}>
                      <Orders token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/sku"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin","manager"]}>
                      <SKU token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/sales-report"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin","manager"]}>
                      <SalesReport token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/sales-report-print"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin","manager"]}>
                      <SalesReportPrint token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/history"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin"]}>
                      <History token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/trash"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin"]}>
                      <Trash token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/hero-manager"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin"]}>
                      <HeroManager token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/categories"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin"]}>
                      <CategoryManager token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/policies"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin"]}>
                      <PoliciesManager token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/users"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin"]}>
                      <UsersPage token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/employees"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin"]}>
                      <EmployeesPage token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="/branches"
                  element={
                    <RoleRoute role={role} allowedRoles={["admin"]}>
                      <BranchesPage token={token}/>
                    </RoleRoute>
                  }
                />

                <Route
                  path="*"
                  element={
                    <Navigate
                      to={getDefaultRoute(role)}
                      replace
                    />
                  }
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