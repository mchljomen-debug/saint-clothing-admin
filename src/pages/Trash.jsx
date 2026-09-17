import axios from"axios";
import{useEffect,useMemo,useState}from"react";
import{backendUrl}from"../App";
import{toast}from"react-toastify";
import{Pagination}from"antd";
import"antd/dist/reset.css";
import{
FaTrash,
FaSearch,
FaSyncAlt,
FaUndo,
FaExclamationTriangle,
FaBoxOpen,
FaUsers,
FaStore,
FaFileAlt,
FaImage,
FaShoppingCart,
FaUserTie,
FaLayerGroup,
FaCheckCircle
}from"react-icons/fa";

const DEFAULT_ITEMS_PER_PAGE=8;

const Trash=({token})=>{
const[trashItems,setTrashItems]=useState([]);
const[loading,setLoading]=useState(true);
const[refreshing,setRefreshing]=useState(false);
const[actionLoading,setActionLoading]=useState("");
const[search,setSearch]=useState("");
const[typeFilter,setTypeFilter]=useState("ALL");
const[currentPage,setCurrentPage]=useState(1);
const[pageSize,setPageSize]=useState(DEFAULT_ITEMS_PER_PAGE);

const panelBg="bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
const softPanelBg="bg-[#FAFAF8] border border-black/10";
const labelClass="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";
const inputClass="w-full rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm text-[#0A0D17] outline-none transition focus:border-black";
const buttonDark="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937] disabled:opacity-50";
const buttonDanger="inline-flex items-center justify-center gap-2 rounded-[5px] border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-500 hover:text-white disabled:opacity-50";

const authHeaders={
Authorization:`Bearer ${token}`,
token
};

const isOrder=(item)=>String(item?.type||"").toUpperCase()==="ORDER";

const getMediaUrl=(value)=>{
if(!value)return"";

let cleanValue=value;

if(typeof cleanValue==="object"){
cleanValue=
cleanValue.secure_url||
cleanValue.url||
cleanValue.image||
cleanValue.src||
cleanValue.path||
"";
}

const stringValue=String(cleanValue||"").trim();

if(!stringValue)return"";

if(
stringValue.startsWith("http://")||
stringValue.startsWith("https://")||
stringValue.startsWith("data:")
){
return stringValue;
}

if(stringValue.startsWith("/uploads/"))return`${backendUrl}${stringValue}`;
if(stringValue.startsWith("uploads/"))return`${backendUrl}/${stringValue}`;

return`${backendUrl}/uploads/${stringValue.replace(/^\/+/,"")}`;
};

const getTypeIcon=(type)=>{
switch(String(type||"").toUpperCase()){
case"PRODUCT":
return<FaBoxOpen/>;
case"USER":
return<FaUsers/>;
case"EMPLOYEE":
return<FaUserTie/>;
case"BRANCH":
return<FaStore/>;
case"CATEGORY":
return<FaLayerGroup/>;
case"HERO":
return<FaImage/>;
case"POLICY":
return<FaFileAlt/>;
case"ORDER":
return<FaShoppingCart/>;
default:
return<FaTrash/>;
}
};

const getTypeClass=(type)=>{
switch(String(type||"").toUpperCase()){
case"PRODUCT":
return"bg-blue-50 text-blue-700 border-blue-200";
case"USER":
return"bg-sky-50 text-sky-700 border-sky-200";
case"EMPLOYEE":
return"bg-indigo-50 text-indigo-700 border-indigo-200";
case"BRANCH":
return"bg-orange-50 text-orange-700 border-orange-200";
case"CATEGORY":
return"bg-emerald-50 text-emerald-700 border-emerald-200";
case"HERO":
return"bg-pink-50 text-pink-700 border-pink-200";
case"POLICY":
return"bg-slate-100 text-slate-700 border-slate-300";
case"ORDER":
return"bg-emerald-50 text-emerald-700 border-emerald-200";
default:
return"bg-gray-100 text-gray-700 border-gray-300";
}
};

const formatDate=(value)=>{
if(!value)return"—";

const date=new Date(value);

if(Number.isNaN(date.getTime()))return"—";

return date.toLocaleDateString([],{
year:"numeric",
month:"short",
day:"2-digit"
});
};

const formatTime=(value)=>{
if(!value)return"";

const date=new Date(value);

if(Number.isNaN(date.getTime()))return"";

return date.toLocaleTimeString([],{
hour:"2-digit",
minute:"2-digit",
hour12:true
});
};

const getRawValue=(raw,...keys)=>{
for(const key of keys){
const value=raw?.[key];

if(value!==undefined&&value!==null&&String(value).trim()!==""){
if(Array.isArray(value))return value.join(", ");

if(typeof value==="object"){
if(value.name)return value.name;
if(value.code)return value.code;
if(value._id)return value._id;
continue;
}

return value;
}
}

return"";
};

const getRecordCode=(item)=>{
const raw=item.raw||{};

if(item.type==="ORDER"){
return item.code||
raw.referenceNumber||
String(item._id||"").slice(-8).toUpperCase()||
"—";
}

if(item.type==="USER"||item.type==="EMPLOYEE"){
return raw.email||raw.phone||item.code||"—";
}

if(item.type==="CATEGORY"){
return item.code||raw.slug||raw.section||"—";
}

return item.code||
raw.sku||
raw.groupCode||
raw.code||
raw.slug||
"—";
};

const getRecordBranch=(item)=>{
const raw=item.raw||{};

if(item.branch)return item.branch;

if(Array.isArray(raw.branches)&&raw.branches.length){
return raw.branches
.map((branch)=>{
if(typeof branch==="string")return branch;
return branch?.name||branch?.code||branch?._id||"";
})
.filter(Boolean)
.join(", ");
}

if(typeof raw.branch==="object"){
return raw.branch?.name||raw.branch?.code||raw.branch?._id||"—";
}

return raw.branch||"—";
};

const getRecordStatus=(item)=>{
const raw=item.raw||{};

if(item.type==="ORDER")return raw.status||item.status||"Delivered";

if(item.status)return item.status;

if(item.type==="USER"||item.type==="EMPLOYEE"){
return raw.role||
(raw.isActive===false?"Inactive":"Active");
}

if(item.type==="CATEGORY"||item.type==="BRANCH"||item.type==="HERO"){
if(raw.isActive===false)return"Inactive";
if(raw.isActive===true)return"Active";
}

if(item.type==="PRODUCT"){
return raw.category||"Product";
}

if(item.type==="POLICY"){
return raw.type||raw.category||"Policy";
}

return raw.role||raw.category||raw.type||"—";
};

const getRecordSecondary=(item)=>{
const raw=item.raw||{};

if(raw.email)return raw.email;
if(raw.phone)return raw.phone;
if(raw.referenceNumber)return raw.referenceNumber;
if(raw.sku)return raw.sku;
if(raw.groupCode)return raw.groupCode;
if(raw.code)return raw.code;
if(raw.slug)return raw.slug;

return item._id;
};

const fetchTrash=async(silent=false)=>{
if(!token)return;

try{
if(!silent)setLoading(true);
setRefreshing(true);

const res=await axios.get(`${backendUrl}/api/trash/list`,{
headers:authHeaders
});

if(res.data.success){
setTrashItems(Array.isArray(res.data.trash)?res.data.trash:[]);
}else{
setTrashItems([]);
toast.error(res.data.message||"Failed to load trash");
}
}catch(err){
console.log("FETCH TRASH ERROR:",err);
toast.error(err.response?.data?.message||err.message||"Failed to load trash");
}finally{
if(!silent)setLoading(false);
setRefreshing(false);
}
};

const restoreItem=async(item)=>{
if(isOrder(item))return;

try{
setActionLoading(`restore-${item.type}-${item._id}`);

const res=await axios.post(
`${backendUrl}/api/trash/restore`,
{
id:item._id,
type:item.type
},
{
headers:authHeaders
}
);

if(res.data.success){
toast.success(res.data.message||`${item.type} restored successfully`);
await fetchTrash(true);
}else{
toast.error(res.data.message||"Failed to restore item");
}
}catch(err){
console.log("RESTORE TRASH ERROR:",err);
toast.error(err.response?.data?.message||err.message||"Failed to restore item");
}finally{
setActionLoading("");
}
};

const permanentDeleteItem=async(item)=>{
if(isOrder(item))return;

const confirmDelete=window.confirm(
`Permanently delete this ${String(item.type||"record").toLowerCase()}? This action cannot be undone.`
);

if(!confirmDelete)return;

try{
setActionLoading(`delete-${item.type}-${item._id}`);

const res=await axios.post(
`${backendUrl}/api/trash/permanent-delete`,
{
id:item._id,
type:item.type
},
{
headers:authHeaders
}
);

if(res.data.success){
toast.success(res.data.message||`${item.type} permanently deleted`);
await fetchTrash(true);
}else{
toast.error(res.data.message||"Failed to permanently delete item");
}
}catch(err){
console.log("PERMANENT DELETE ERROR:",err);
toast.error(
err.response?.data?.message||
err.message||
"Failed to permanently delete item"
);
}finally{
setActionLoading("");
}
};

useEffect(()=>{
if(token)fetchTrash();
},[token]);

const availableTypes=useMemo(()=>{
const supportedTypes=[
"PRODUCT",
"USER",
"EMPLOYEE",
"BRANCH",
"CATEGORY",
"HERO",
"POLICY",
"ORDER"
];

const returnedTypes=trashItems
.map((item)=>String(item.type||"").trim().toUpperCase())
.filter(Boolean);

return["ALL",...Array.from(new Set([...supportedTypes,...returnedTypes]))];
},[trashItems]);

const filteredTrash=useMemo(()=>{
const term=search.trim().toLowerCase();

return trashItems.filter((item)=>{
const normalizedType=String(item.type||"").toUpperCase();
const matchesType=typeFilter==="ALL"||normalizedType===typeFilter;
const raw=item.raw||{};

const searchableValues=[
item._id,
item.type,
item.name,
item.code,
item.status,
item.branch,
raw.name,
raw.title,
raw.email,
raw.phone,
raw.role,
raw.category,
raw.section,
raw.sku,
raw.groupCode,
raw.code,
raw.slug,
raw.referenceNumber,
raw.paymentMethod,
raw.paymentStatus,
raw.courier,
raw.jntTrackingNumber,
raw.description,
raw.deletedBy,
raw.deliveryProofNote
];

const matchesSearch=
!term||
searchableValues.some((value)=>
String(value||"").toLowerCase().includes(term)
);

return matchesType&&matchesSearch;
});
},[trashItems,search,typeFilter]);

useEffect(()=>{
setCurrentPage(1);
},[search,typeFilter]);

const indexOfLastItem=currentPage*pageSize;
const indexOfFirstItem=indexOfLastItem-pageSize;
const currentTrash=filteredTrash.slice(indexOfFirstItem,indexOfLastItem);
const totalPages=Math.ceil(filteredTrash.length/pageSize)||1;

useEffect(()=>{
if(currentPage>totalPages)setCurrentPage(totalPages);
},[currentPage,totalPages]);

const summary=useMemo(()=>{
const byType=trashItems.reduce((acc,item)=>{
const type=String(item.type||"UNKNOWN").toUpperCase();
acc[type]=(acc[type]||0)+1;
return acc;
},{});

return{
total:trashItems.length,
showing:filteredTrash.length,
products:byType.PRODUCT||0,
users:byType.USER||0,
employees:byType.EMPLOYEE||0,
branches:byType.BRANCH||0,
categories:byType.CATEGORY||0,
heroes:byType.HERO||0,
policies:byType.POLICY||0,
orders:byType.ORDER||0
};
},[trashItems,filteredTrash]);

const groupedCurrentTrash=useMemo(()=>{
return currentTrash.reduce((acc,item)=>{
const type=String(item.type||"UNKNOWN").toUpperCase();

if(!acc[type])acc[type]=[];

acc[type].push({
...item,
type
});

return acc;
},{});
},[currentTrash]);

const overviewCards=[
{label:"Total",value:summary.total,icon:<FaTrash/>},
{label:"Showing",value:summary.showing,icon:<FaSearch/>},
{label:"Products",value:summary.products,icon:<FaBoxOpen/>},
{label:"Users",value:summary.users,icon:<FaUsers/>},
{label:"Employees",value:summary.employees,icon:<FaUserTie/>},
{label:"Branches",value:summary.branches,icon:<FaStore/>},
{label:"Categories",value:summary.categories,icon:<FaLayerGroup/>},
{label:"Hero",value:summary.heroes,icon:<FaImage/>},
{label:"Policies",value:summary.policies,icon:<FaFileAlt/>},
{label:"Delivered Orders",value:summary.orders,icon:<FaShoppingCart/>}
];

if(loading){
return(
<div className="min-h-screen bg-transparent p-3 pt-24 font-['Montserrat']">
<div className="animate-pulse space-y-3">
<div className="h-24 rounded-[5px] bg-white/70"/>
<div className="grid grid-cols-2 gap-3 md:grid-cols-5">
{[...Array(10)].map((_,i)=>(
<div key={i} className="h-28 rounded-[5px] bg-white/70"/>
))}
</div>
<div className="h-20 rounded-[5px] bg-white/70"/>
<div className="h-96 rounded-[5px] bg-white/70"/>
</div>
</div>
);
}

return(
<div className="min-h-screen bg-transparent px-2.5 pb-4 pt-20 font-['Montserrat'] sm:px-3 sm:pt-24">
<div className="mx-auto max-w-[1500px]">
<div className="relative mb-4 overflow-hidden rounded-[5px] border border-black/10 bg-[#0A0D17] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:p-6">
<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
<div className="min-w-0">
<p className="mb-2 text-[10px] font-black uppercase tracking-[0.34em] text-white/50">
Saint Clothing Admin
</p>

<div className="flex items-center gap-3">
<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[5px] border border-white/10 bg-white/10 backdrop-blur-sm">
<FaTrash className="text-sm"/>
</div>

<div className="min-w-0">
<h1 className="truncate text-[22px] font-black uppercase tracking-[-0.03em] sm:text-[30px]">
Global Trash & Archive
</h1>

<p className="mt-1 text-[11px] text-white/65 sm:text-sm">
Manage deleted administration records and review completed delivered orders.
</p>
</div>
</div>
</div>

<button
type="button"
onClick={()=>fetchTrash(false)}
disabled={refreshing}
className="inline-flex items-center gap-2 rounded-[5px] bg-white px-4 py-2.5 text-sm font-black text-[#111111] shadow-sm transition hover:bg-[#ececec] disabled:opacity-50"
>
<FaSyncAlt className={refreshing?"animate-spin":""}/>
Refresh
</button>
</div>
</div>

<div className={`${panelBg} mb-4 rounded-[5px] p-4 sm:p-5`}>
<div className="mb-4 flex flex-col gap-2">
<h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#0A0D17] sm:text-[17px]">
Archive Overview
</h3>

<p className="mt-0.5 text-[11px] text-[#6b7280] sm:text-xs">
Deleted administration records and completed delivered order records.
</p>
</div>

<div className="grid grid-cols-2 gap-3 md:grid-cols-5">
{overviewCards.map((item)=>(
<div
key={item.label}
className={`${softPanelBg} min-w-0 overflow-hidden rounded-[5px] p-4 transition hover:shadow-md`}
>
<div className="mb-2 flex items-center justify-between gap-2">
<span className="text-xs font-medium text-[#6b7280]">
{item.label}
</span>

<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-[#111111]/[0.08] text-[#111111]">
{item.icon}
</div>
</div>

<h2 className="text-[24px] font-black leading-none tracking-[-0.03em] text-[#0A0D17] sm:text-[28px]">
{item.value}
</h2>
</div>
))}
</div>
</div>

<div className={`${panelBg} mb-4 rounded-[5px] p-4 sm:p-5`}>
<div className="grid grid-cols-1 items-end gap-3 xl:grid-cols-[1fr_220px_190px]">
<div>
<p className={labelClass}>Search Records</p>

<div className="relative mt-2">
<FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#0A0D17]/35"/>

<input
type="text"
placeholder="Search name, ID, email, SKU, category, branch, order, status..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
className="w-full rounded-[5px] border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm text-[#0A0D17] outline-none focus:border-black"
/>
</div>
</div>

<div>
<p className={labelClass}>Type</p>

<select
value={typeFilter}
onChange={(e)=>setTypeFilter(e.target.value)}
className={`${inputClass} mt-2`}
>
{availableTypes.map((type)=>(
<option key={type} value={type}>
{type==="ALL"?"All Types":type==="ORDER"?"Delivered Orders":type}
</option>
))}
</select>
</div>

<div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] px-4 py-3">
<p className={labelClass}>Showing</p>

<p className="mt-1 text-sm font-black text-[#0A0D17]">
{filteredTrash.length===0
?"0 / 0"
:`${indexOfFirstItem+1}-${Math.min(indexOfLastItem,filteredTrash.length)} / ${filteredTrash.length}`}
</p>
</div>
</div>
</div>

<div className={`${panelBg} overflow-hidden rounded-[5px]`}>
<div className="border-b border-black/10 px-4 py-5 sm:px-5">
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
<div>
<p className={labelClass}>Archive Table</p>

<h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
Records
</h3>
</div>

<p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">
Page {currentPage} of {totalPages}
</p>
</div>
</div>

<div className="space-y-4 bg-[#FAFAF8] p-4 sm:p-5">
{currentTrash.length===0?(
<div className="rounded-[5px] border border-dashed border-black/15 bg-white p-12 text-center text-gray-500">
<div className="flex flex-col items-center justify-center">
<div className="flex h-14 w-14 items-center justify-center rounded-[5px] border border-black/5 bg-[#f3f3f1] text-lg font-black text-[#0A0D17]/35">
<FaTrash/>
</div>

<p className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-[#0A0D17]/45">
No Records
</p>

<p className="mt-2 text-xs text-[#0A0D17]/35">
No records found for the selected filter.
</p>
</div>
</div>
):(
Object.entries(groupedCurrentTrash).map(([type,items])=>(
<div
key={type}
className="overflow-hidden rounded-[5px] border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
>
<div className="flex flex-col gap-3 border-b border-black/10 bg-[#0A0D17] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
<div className="flex items-center gap-2">
<span
className={`inline-flex items-center gap-2 rounded-[5px] border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getTypeClass(type)}`}
>
{getTypeIcon(type)}
{type==="ORDER"?"DELIVERED ORDERS":type}
</span>

<p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
{items.length} record{items.length>1?"s":""}
</p>
</div>

<p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
{type==="ORDER"?"Completed Orders":"Deleted Records Group"}
</p>
</div>

<div className="divide-y divide-black/10">
{items.map((item)=>{
const raw=item.raw||{};
const orderRecord=isOrder(item);
const imageUrl=getMediaUrl(item.image);
const recordCode=getRecordCode(item);
const recordBranch=getRecordBranch(item);
const recordStatus=getRecordStatus(item);
const secondary=getRecordSecondary(item);

return(
<div
key={`${item.type}-${item._id}`}
className="p-4 transition hover:bg-[#FAFAF8]"
>
<div className={`grid grid-cols-1 gap-4 ${orderRecord?"xl:grid-cols-[1.25fr_1fr_180px]":"xl:grid-cols-[1.25fr_1fr_160px_260px]"} xl:items-center`}>
<div className="flex min-w-0 items-start gap-3">
<div className="h-16 w-14 shrink-0 overflow-hidden rounded-[5px] border border-black/10 bg-[#f5f5f4]">
{imageUrl?(
<img
src={imageUrl}
alt={item.name||item.type}
className={`h-full w-full object-cover ${orderRecord?"":"grayscale opacity-80"}`}
onError={(e)=>{
e.currentTarget.style.display="none";
}}
/>
):(
<div className="flex h-full w-full items-center justify-center text-[#0A0D17]/30">
{getTypeIcon(item.type)}
</div>
)}
</div>

<div className="min-w-0">
<p className="truncate text-sm font-black uppercase text-[#0A0D17]">
{item.name||"Unnamed Record"}
</p>

<p className="mt-1 break-all text-[10px] font-semibold text-[#0A0D17]/45">
{secondary||item._id}
</p>

<div className="mt-2 flex flex-wrap gap-1.5">
<span
className={`inline-flex items-center gap-1.5 rounded-[5px] border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${getTypeClass(item.type)}`}
>
{getTypeIcon(item.type)}
{item.type}
</span>

{orderRecord?(
<span className="inline-flex items-center gap-1.5 rounded-[5px] border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-700">
<FaCheckCircle/>
Delivered
</span>
):(
<span className="inline-flex rounded-[5px] border border-red-100 bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-red-600">
Deleted
</span>
)}
</div>
</div>
</div>

<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
<div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
<p className={labelClass}>
{item.type==="USER"||item.type==="EMPLOYEE"
?"Account"
:item.type==="ORDER"
?"Order Ref"
:item.type==="CATEGORY"
?"Category Code"
:"Code"}
</p>

<p className="mt-1 break-all text-xs font-black text-[#0A0D17]">
{recordCode}
</p>
</div>

<div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
<p className={labelClass}>Branch</p>

<p className="mt-1 break-all text-xs font-black text-[#0A0D17]">
{recordBranch}
</p>
</div>

<div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
<p className={labelClass}>
{item.type==="USER"||item.type==="EMPLOYEE"
?"Role / Status"
:item.type==="PRODUCT"
?"Category"
:"Status"}
</p>

<p className="mt-1 break-all text-xs font-black text-[#0A0D17]">
{recordStatus}
</p>
</div>
</div>

<div className={`rounded-[5px] border p-3 ${orderRecord?"border-emerald-100 bg-emerald-50/50":"border-black/10 bg-[#FAFAF8]"}`}>
<p className={labelClass}>
{orderRecord?"Completed":"Deleted"}
</p>

<p className="mt-1 text-xs font-black text-[#0A0D17]">
{formatDate(item.deletedAt)}
</p>

<p className="mt-1 text-[10px] font-bold uppercase text-[#0A0D17]/40">
{formatTime(item.deletedAt)||"No time"}
</p>

{orderRecord?(
<p className="mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-700">
<FaCheckCircle/>
Completed Order
</p>
):(
<p className="mt-2 truncate text-[10px] font-bold text-[#0A0D17]/45">
By {raw.deletedBy||"Admin"}
</p>
)}
</div>

{!orderRecord&&(
<div className="flex flex-wrap gap-2 xl:justify-end">
<button
type="button"
onClick={()=>restoreItem(item)}
disabled={actionLoading===`restore-${item.type}-${item._id}`}
className={buttonDark}
>
<FaUndo/>
{actionLoading===`restore-${item.type}-${item._id}`
?"Restoring..."
:"Restore"}
</button>

<button
type="button"
onClick={()=>permanentDeleteItem(item)}
disabled={actionLoading===`delete-${item.type}-${item._id}`}
className={buttonDanger}
>
<FaExclamationTriangle/>
{actionLoading===`delete-${item.type}-${item._id}`
?"Deleting..."
:"Permanent Delete"}
</button>
</div>
)}
</div>

{item.type==="ORDER"&&(
<div className="mt-4 grid grid-cols-2 gap-2 border-t border-black/10 pt-4 md:grid-cols-4">
<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Payment</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.paymentMethod||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Payment Status</p>
<p className="mt-1 text-xs font-black capitalize text-[#0A0D17]">
{raw.paymentStatus||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Amount</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
₱{Number(raw.amount||0).toLocaleString()}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Items</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{Array.isArray(raw.items)?raw.items.reduce((total,orderItem)=>total+Number(orderItem?.quantity||1),0):0}
</p>
</div>
</div>
)}

{item.type==="ORDER"&&(
<div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Courier</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.courier||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Tracking Number</p>
<p className="mt-1 break-all text-xs font-black text-[#0A0D17]">
{raw.jntTrackingNumber||raw.trackingNumber||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Delivery Proof</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.deliveryProofImage?"Submitted":"Not Submitted"}
</p>
</div>
</div>
)}

{item.type==="ORDER"&&Array.isArray(raw.items)&&raw.items.length>0&&(
<div className="mt-2 rounded-[5px] border border-black/10 bg-[#FAFAF8] p-3">
<p className={labelClass}>Order Items</p>

<div className="mt-3 space-y-2">
{raw.items.map((orderItem,index)=>(
<div
key={`${item._id}-order-item-${index}`}
className="flex items-center justify-between gap-3 rounded-[5px] bg-white p-3"
>
<div className="min-w-0">
<p className="truncate text-xs font-black text-[#0A0D17]">
{orderItem.name||"Product"}
</p>

<p className="mt-1 text-[10px] font-semibold uppercase text-[#0A0D17]/45">
{orderItem.size||"—"} • {orderItem.branch||"—"} • Qty {Number(orderItem.quantity||1)}
</p>
</div>

<p className="shrink-0 text-xs font-black text-[#0A0D17]">
₱{Number(orderItem.price||0).toLocaleString()}
</p>
</div>
))}
</div>
</div>
)}

{(item.type==="USER"||item.type==="EMPLOYEE")&&(
<div className="mt-4 grid grid-cols-1 gap-2 border-t border-black/10 pt-4 sm:grid-cols-3">
<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Email</p>
<p className="mt-1 break-all text-xs font-black text-[#0A0D17]">
{raw.email||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Phone</p>
<p className="mt-1 break-all text-xs font-black text-[#0A0D17]">
{raw.phone||raw.phoneNumber||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Role</p>
<p className="mt-1 text-xs font-black uppercase text-[#0A0D17]">
{raw.role||item.type}
</p>
</div>
</div>
)}

{item.type==="PRODUCT"&&(
<div className="mt-4 grid grid-cols-2 gap-2 border-t border-black/10 pt-4 md:grid-cols-4">
<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>SKU</p>
<p className="mt-1 break-all text-xs font-black text-[#0A0D17]">
{raw.sku||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Group</p>
<p className="mt-1 break-all text-xs font-black text-[#0A0D17]">
{raw.groupCode||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Category</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.category||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Price</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
₱{Number(raw.price||0).toLocaleString()}
</p>
</div>
</div>
)}

{item.type==="CATEGORY"&&(
<div className="mt-4 grid grid-cols-1 gap-2 border-t border-black/10 pt-4 sm:grid-cols-3">
<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Section</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.section||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Active</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.isActive===true?"Yes":"No"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Matches</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{Array.isArray(raw.matchWith)&&raw.matchWith.length
?raw.matchWith.join(", ")
:"—"}
</p>
</div>
</div>
)}

{item.type==="BRANCH"&&(
<div className="mt-4 grid grid-cols-1 gap-2 border-t border-black/10 pt-4 sm:grid-cols-3">
<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Address</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.address||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Contact</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.contactNumber||raw.phone||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Manager</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{getRawValue(raw,"managerName","manager")||"—"}
</p>
</div>
</div>
)}

{item.type==="POLICY"&&(
<div className="mt-4 border-t border-black/10 pt-4">
<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Policy</p>
<p className="mt-1 line-clamp-3 text-xs font-semibold leading-5 text-[#0A0D17]">
{raw.text||raw.content||raw.description||"—"}
</p>
</div>
</div>
)}

{item.type==="HERO"&&(
<div className="mt-4 grid grid-cols-1 gap-2 border-t border-black/10 pt-4 sm:grid-cols-3">
<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Title</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.title||raw.heading||item.name||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Subtitle</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.subtitle||raw.subheading||"—"}
</p>
</div>

<div className="rounded-[5px] bg-[#FAFAF8] p-3">
<p className={labelClass}>Active</p>
<p className="mt-1 text-xs font-black text-[#0A0D17]">
{raw.isActive===true?"Yes":"No"}
</p>
</div>
</div>
)}
</div>
);
})}
</div>
</div>
))
)}
</div>
</div>

{filteredTrash.length>pageSize&&(
<div className={`${panelBg} mt-4 rounded-[5px] px-4 py-4`}>
<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
Page Control
</p>

<p className="mt-1 text-xs font-semibold text-[#6b7280]">
Showing {indexOfFirstItem+1} - {Math.min(indexOfLastItem,filteredTrash.length)} of {filteredTrash.length} records
</p>
</div>

<Pagination
className="saint-pagination"
current={currentPage}
pageSize={pageSize}
total={filteredTrash.length}
showSizeChanger
pageSizeOptions={["8","16","32","64"]}
responsive
showTotal={(total,range)=>`${range[0]}-${range[1]} of ${total} records`}
onChange={(page,size)=>{
setCurrentPage(page);
setPageSize(size);
}}
onShowSizeChange={(_,size)=>{
setCurrentPage(1);
setPageSize(size);
}}
/>
</div>
</div>
)}
</div>
</div>
);
};

export default Trash;