import React from "react";
import logo from "../assets/logo.png";

const Navbar = ({ setToken }) => {
  const role = localStorage.getItem("role") || "";
  const branch = localStorage.getItem("branch") || "";
  const adminName = localStorage.getItem("adminName") || "";

  const logout = () => {
    setToken("");
    localStorage.clear();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[50] backdrop-blur bg-[#0A0D17]/90 border-b border-white/10">
      <div className="flex items-center justify-between px-[4%] py-3 max-w-[1440px] mx-auto">

        {/* LEFT */}
        <div className="flex items-center gap-4">

          {/* LOGO */}
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center border border-white/10">
            <img
              src={logo}
              alt="Saint Clothing"
              className="w-6 h-6 object-contain invert opacity-90"
            />
          </div>

          {/* BRAND */}
          <div className="flex flex-col leading-tight">
            <h1 className="text-white text-lg md:text-xl font-black uppercase tracking-tight">
              Saint Clothing
            </h1>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.25em]">
              {role === "admin"
                ? "Admin Panel"
                : `Branch Panel • ${branch || "N/A"}`}
            </p>
          </div>

        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-5">

          {/* USER CARD */}
          <div className="hidden md:flex items-center gap-4 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2">

            {/* STATUS DOT */}
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]"></div>

            {/* TEXT */}
            <div className="flex flex-col leading-tight">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">
                {role === "admin" ? "Administrator" : "Staff"}
              </p>
              <p className="text-xs font-bold text-white">
                {adminName || "User"}
              </p>
              {branch && (
                <p className="text-[10px] text-white/60">
                  {branch}
                </p>
              )}
            </div>

          </div>

          {/* LOGOUT */}
          <button
            onClick={logout}
            className="px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] 
            border border-white/20 text-white rounded-xl 
            hover:bg-white hover:text-[#0A0D17] 
            transition-all duration-300"
          >
            Logout
          </button>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;