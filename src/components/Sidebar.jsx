import React from"react";
import{NavLink}from"react-router-dom";
import{
  LayoutDashboard,
  Package,
  Barcode,
  ShoppingCart,
  BarChart3,
  Users,
  UserCog,
  Store,
  History,
  Trash2,
  MonitorPlay,
  FileText,
  Image
}from"lucide-react";

const Sidebar=()=>{
  const role=localStorage.getItem("role")||"";
  const branch=localStorage.getItem("branch")||"";
  const adminName=localStorage.getItem("adminName")||"";

  const adminMainLinks=[
    {to:"/",icon:LayoutDashboard,label:"Dashboard"},
    {to:"/products",icon:Package,label:"Products"},
    {to:"/sku",icon:Barcode,label:"Inventory Management"},
    {to:"/orders",icon:ShoppingCart,label:"Orders"},
    {to:"/sales-report",icon:BarChart3,label:"Sales Report"}
  ];

  const managerMainLinks=[
    {to:"/",icon:LayoutDashboard,label:"Dashboard"},
    {to:"/products",icon:Package,label:"Products"},
    {to:"/sku",icon:Barcode,label:"Inventory Management"},
    {to:"/orders",icon:ShoppingCart,label:"Orders"},
    {to:"/sales-report",icon:BarChart3,label:"Sales Report"}
  ];

  const staffMainLinks=[
    {to:"/products",icon:Package,label:"Products"},
    {to:"/orders",icon:ShoppingCart,label:"Orders"}
  ];

  const adminOnlyLinks=[
    {to:"/hero-manager",icon:MonitorPlay,label:"Hero Manager"},
    {to:"/categories",icon:Image,label:"Categories"},
    {to:"/policies",icon:FileText,label:"Policies"},
    {to:"/users",icon:Users,label:"Users"},
    {to:"/employees",icon:UserCog,label:"Employees"},
    {to:"/branches",icon:Store,label:"Branches"}
  ];

  const managerArchiveLinks=[
    {to:"/admin/history",icon:History,label:"History"}
  ];

  const adminArchiveLinks=[
    {to:"/admin/history",icon:History,label:"History"},
    {to:"/admin/trash",icon:Trash2,label:"Trash"}
  ];

  const getMainLinks=()=>{
    if(role==="admin")return adminMainLinks;
    if(role==="manager")return managerMainLinks;
    if(role==="staff")return staffMainLinks;
    return[];
  };

  const getRoleLabel=()=>{
    if(role==="admin")return"Admin";
    if(role==="manager")return"Branch Manager";
    if(role==="staff")return"Staff";
    return"Employee";
  };

  const linkClass=({isActive})=>
    `group flex items-center gap-4 px-3 py-3 rounded-xl text-[12px] font-semibold uppercase tracking-[0.12em] transition-all ${
      isActive
        ?"bg-white text-[#0A0D17] shadow-md"
        :"text-white/60 hover:text-white hover:bg-white/[0.05]"
    }`;

  const Section=({title,links})=>{
    if(!links||links.length===0)return null;

    return(
      <div className="px-5">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.34em] text-white/35">
          {title}
        </p>

        <div className="flex flex-col gap-1.5">
          {links.map((item)=>{
            const Icon=item.icon;

            return(
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
              >
                {({isActive})=>(
                  <>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                        isActive
                          ?"bg-white text-black shadow-inner"
                          :"bg-white/[0.04] group-hover:bg-white/[0.08]"
                      }`}
                    >
                      <Icon
                        size={18}
                        strokeWidth={2.2}
                        className={`transition-all ${
                          isActive
                            ?"opacity-100 scale-105"
                            :"opacity-70 group-hover:opacity-100 group-hover:scale-105"
                        }`}
                      />
                    </div>

                    <span className="hidden lg:block truncate">
                      {item.label}
                    </span>

                    {isActive&&(
                      <span className="ml-auto hidden h-2.5 w-2.5 rounded-full bg-white lg:block"/>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  };

  return(
    <div className="w-[18%] shrink-0">
      <aside className="fixed left-0 top-[72px] h-[calc(100vh-72px)] w-[18%] bg-gradient-to-b from-[#0A0D17] via-[#0f1724] to-[#111827] shadow-[10px_0_40px_rgba(0,0,0,0.18)]">
        <div className="flex h-full flex-col justify-between overflow-y-auto">
          <div className="pb-6">
            <div className="px-5 pt-5 pb-6">
              <div className="rounded-2xl bg-white/[0.05] p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                  Saint Clothing
                </p>

                <p className="text-sm font-black text-white">
                  Admin Panel
                </p>

                {adminName&&(
                  <p className="mt-3 text-xs font-bold text-white/80 truncate">
                    {adminName}
                  </p>
                )}

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-[10px] text-white/50 uppercase tracking-widest">
                      {getRoleLabel()}
                    </span>

                    {role!=="admin"&&branch&&(
                      <span className="mt-1 block text-[9px] text-white/35 uppercase tracking-wider truncate">
                        {branch}
                      </span>
                    )}
                  </div>

                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0"/>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <Section
                title={role==="staff"?"Staff Panel":"Main Panel"}
                links={getMainLinks()}
              />

              {role==="admin"&&(
                <Section
                  title="Admin"
                  links={adminOnlyLinks}
                />
              )}

              {role==="admin"&&(
                <Section
                  title="Archive"
                  links={adminArchiveLinks}
                />
              )}

              {role==="manager"&&(
                <Section
                  title="Archive"
                  links={managerArchiveLinks}
                />
              )}
            </div>
          </div>

          <div className="px-5 pb-6 text-center">
            <p className="text-[9px] uppercase text-white/30 tracking-[0.3em]">
              {role==="staff"
                ?"Staff Console"
                :role==="manager"
                ?"Branch Console"
                :"Internal Console"}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;