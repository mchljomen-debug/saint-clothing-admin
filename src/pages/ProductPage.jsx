import React,{useEffect,useMemo,useState}from"react";
import{assets}from"../assets/assets";
import axios from"axios";
import{backendUrl,currency}from"../App";
import{toast}from"react-toastify";
import{Pagination}from"antd";
import"antd/dist/reset.css";
import{
FaBoxes,
FaPlus,
FaSearch,
FaTrash,
FaEdit,
FaImage,
FaTags,
FaExclamationTriangle,
FaFire,
FaPalette,
FaCubes,
FaSyncAlt
}from"react-icons/fa";

const getMediaUrl=(value,backendUrl)=>{
if(!value)return"";
const stringValue=String(value).trim();
if(stringValue.startsWith("http://")||stringValue.startsWith("https://")||stringValue.startsWith("data:"))return stringValue;
return`${backendUrl}/uploads/${stringValue.replace(/^\/+/,"")}`;
};

const ProductPage=({token})=>{
const role=localStorage.getItem("role")||"";
const userBranch=localStorage.getItem("branch")||"branch1";

const[list,setList]=useState([]);
const[branches,setBranches]=useState([]);
const[loading,setLoading]=useState(true);
const[saving,setSaving]=useState(false);
const[refreshing,setRefreshing]=useState(false);
const[currentPage,setCurrentPage]=useState(1);
const[pageSize,setPageSize]=useState(10);
const[showForm,setShowForm]=useState(false);
const[editId,setEditId]=useState(null);
const[search,setSearch]=useState("");
const[categoryFilter,setCategoryFilter]=useState("all");

const[images,setImages]=useState([null,null,null,null]);
const[oldImages,setOldImages]=useState([]);
const[outfitImage,setOutfitImage]=useState(null);
const[oldOutfitImage,setOldOutfitImage]=useState("");
const[model3d,setModel3d]=useState(null);
const[oldModel3d,setOldModel3d]=useState("");

const[name,setName]=useState("");
const[description,setDescription]=useState("");
const[price,setPrice]=useState("");
const[sku,setSku]=useState("");
const[groupCode,setGroupCode]=useState("");
const[colorHex,setColorHex]=useState("#000000");
const[category,setCategory]=useState("");
const[branch,setBranch]=useState("");

const[bestseller,setBestseller]=useState(false);
const[newArrival,setNewArrival]=useState(false);
const[onSale,setOnSale]=useState(false);
const[salePercent,setSalePercent]=useState("");

const[sizes,setSizes]=useState([]);
const SIZE_OPTIONS=["S","M","L","XL","2XL","3XL"];

const[stock,setStock]=useState({
S:0,
M:0,
L:0,
XL:0,
"2XL":0,
"3XL":0
});

const[sizeChartImage,setSizeChartImage]=useState(null);
const[oldSizeChartImage,setOldSizeChartImage]=useState("");
const[colors,setColors]=useState([]);
const[colorInput,setColorInput]=useState("");
const[fitType,setFitType]=useState("Regular");
const[styleVibe,setStyleVibe]=useState("Streetwear");
const[recommendationSection,setRecommendationSection]=useState("none");
const[styleTags,setStyleTags]=useState([]);
const[styleTagInput,setStyleTagInput]=useState("");
const[matchWith,setMatchWith]=useState([]);
const[categoriesData,setCategoriesData]=useState([]);

const axiosConfig={
headers:{
Authorization:`Bearer ${token}`,
token
}
};

const panelBg="bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
const softPanelBg="bg-[#FAFAF8] border border-black/10";
const inputClass="w-full rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm text-[#0A0D17] outline-none transition focus:border-black";
const labelClass="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";
const buttonDark="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937] disabled:opacity-50";
const buttonLight="inline-flex items-center justify-center gap-2 rounded-[5px] border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#0A0D17] transition hover:bg-[#FAFAF8]";

const CATEGORY_OPTIONS=useMemo(()=>{
const fromBackend=categoriesData.map((item)=>item.name).filter(Boolean);
const fromProducts=Array.isArray(list)?list.map((item)=>item.category).filter(Boolean):[];
return Array.from(new Set([...fromBackend,...fromProducts]));
},[categoriesData,list]);

const predefinedColors=[
{name:"Black",hex:"#000000"},
{name:"White",hex:"#ffffff"},
{name:"Red",hex:"#ff0000"},
{name:"Green",hex:"#008000"},
{name:"Blue",hex:"#0000ff"},
{name:"Yellow",hex:"#ffff00"},
{name:"Orange",hex:"#ffa500"},
{name:"Purple",hex:"#800080"},
{name:"Pink",hex:"#ffc0cb"},
{name:"Brown",hex:"#8b4513"},
{name:"Gray",hex:"#808080"},
{name:"Grey",hex:"#808080"},
{name:"Navy",hex:"#000080"},
{name:"Maroon",hex:"#800000"},
{name:"Olive",hex:"#808000"},
{name:"Teal",hex:"#008080"},
{name:"Silver",hex:"#c0c0c0"},
{name:"Beige",hex:"#f5f5dc"},
{name:"Cream",hex:"#fffdd0"},
{name:"Khaki",hex:"#c3b091"}
];

const hexToRgb=(hex)=>{
const safeHex=(hex||"").replace("#","").trim();
if(!/^[0-9A-Fa-f]{6}$/.test(safeHex))return null;
return{
r:parseInt(safeHex.slice(0,2),16),
g:parseInt(safeHex.slice(2,4),16),
b:parseInt(safeHex.slice(4,6),16)
};
};

const getColorNameFromHex=(hex)=>{
const rgb=hexToRgb(hex);
if(!rgb)return"Unknown";
let closestName="Unknown";
let closestDistance=Infinity;

for(const item of predefinedColors){
const itemRgb=hexToRgb(item.hex);
if(!itemRgb)continue;

const distance=
Math.pow(rgb.r-itemRgb.r,2)+
Math.pow(rgb.g-itemRgb.g,2)+
Math.pow(rgb.b-itemRgb.b,2);

if(distance<closestDistance){
closestDistance=distance;
closestName=item.name;
}
}

return closestName;
};

const autoColorName=useMemo(()=>getColorNameFromHex(colorHex),[colorHex]);

const activeBranches=useMemo(()=>branches.filter((b)=>b.isActive),[branches]);

useEffect(()=>{
if(role==="admin"){
if(!branch&&activeBranches.length>0)setBranch(activeBranches[0].code);
}else{
setBranch(userBranch);
}
},[role,userBranch,activeBranches,branch]);

const fetchCategories=async()=>{
try{
const res=await axios.get(`${backendUrl}/api/category/list`);

if(res.data.success){
const loadedCategories=Array.isArray(res.data.categories)?res.data.categories:[];
setCategoriesData(loadedCategories);

if(!category&&loadedCategories.length>0){
setCategory(loadedCategories[0].name);
}
}
}catch(err){
toast.error(err.response?.data?.message||"Failed to load categories");
}
};

const fetchBranches=async()=>{
try{
const res=await axios.get(`${backendUrl}/api/branch/list`,axiosConfig);

if(res.data.success){
setBranches(res.data.branches||[]);
}else{
setBranches([]);
}
}catch{
setBranches([]);
}
};

const fetchList=async(silent=false)=>{
if(!silent)setLoading(true);
setRefreshing(true);

try{
const res=await axios.get(`${backendUrl}/api/product/admin-list`,axiosConfig);

if(res.data.success){
const products=Array.isArray(res.data.products)
?res.data.products
:Array.isArray(res.data.product)
?res.data.product
:[];

setList([...products].reverse());
}else{
toast.error(res.data.message);
setList([]);
}
}catch(err){
toast.error(err.response?.data?.message||err.message);
setList([]);
}finally{
if(!silent)setLoading(false);
setRefreshing(false);
}
};

const fetchProduct=async(id)=>{
try{
const res=await axios.get(`${backendUrl}/api/product/single/${id}`);

if(res.data.success){
const p=res.data.product;

setEditId(p._id);
setName(p.name||"");
setDescription(p.description||"");
setPrice(p.price||"");
setSku(p.sku||"");
setGroupCode(p.groupCode||"");
setColorHex(p.colorHex||"#000000");
setCategory(p.category||"");

setBranch(
p.branch||
(role==="admin"?activeBranches[0]?.code||"":userBranch)
);

setBestseller(!!p.bestseller);
setNewArrival(!!p.newArrival);
setOnSale(!!p.onSale);

setSalePercent(
p.salePercent!==undefined&&p.salePercent!==null
?String(p.salePercent)
:""
);

setSizes(Array.isArray(p.sizes)?p.sizes:[]);

setStock({
S:Number(p.stock?.S??0),
M:Number(p.stock?.M??0),
L:Number(p.stock?.L??0),
XL:Number(p.stock?.XL??0),
"2XL":Number(p.stock?.["2XL"]??0),
"3XL":Number(p.stock?.["3XL"]??0)
});

setOldSizeChartImage(p.sizeChartImage||"");
setSizeChartImage(null);

setOldOutfitImage(p.outfitImage||"");
setOutfitImage(null);

let safeColors=[];

try{
const raw=p.colors;

if(Array.isArray(raw)){
safeColors=raw;
}else if(typeof raw==="string"){
const parsed=JSON.parse(raw);
safeColors=Array.isArray(parsed)?parsed:Object.values(parsed||{});
}else if(raw&&typeof raw==="object"){
safeColors=Object.values(raw);
}

safeColors=safeColors.map((c)=>String(c).trim()).filter(Boolean);
}catch{
safeColors=[];
}

setColors(safeColors);
setFitType(p.fitType||"Regular");
setStyleVibe(p.styleVibe||"Streetwear");
setRecommendationSection(p.recommendationSection||"none");
setStyleTags(Array.isArray(p.styleTags)?p.styleTags:[]);
setMatchWith(Array.isArray(p.matchWith)?p.matchWith:[]);
setOldImages(Array.isArray(p.images)?p.images:[]);
setImages([null,null,null,null]);

setOldModel3d(p.model3d||"");
setModel3d(null);

setShowForm(true);
window.scrollTo({top:0,behavior:"smooth"});
}
}catch(err){
toast.error(err.response?.data?.message||"Failed to load product");
}
};

const resetForm=()=>{
setName("");
setDescription("");
setPrice("");
setSku("");
setGroupCode("");
setColorHex("#000000");
setCategory(CATEGORY_OPTIONS[0]||"");
setBranch(role==="admin"?activeBranches[0]?.code||"":userBranch);
setBestseller(false);
setNewArrival(false);
setOnSale(false);
setSalePercent("");
setSizes([]);

setStock({
S:0,
M:0,
L:0,
XL:0,
"2XL":0,
"3XL":0
});

setSizeChartImage(null);
setOldSizeChartImage("");
setOutfitImage(null);
setOldOutfitImage("");
setColors([]);
setColorInput("");
setFitType("Regular");
setStyleVibe("Streetwear");
setRecommendationSection("none");
setStyleTags([]);
setStyleTagInput("");
setMatchWith([]);
setImages([null,null,null,null]);
setOldImages([]);
setModel3d(null);
setOldModel3d("");
setEditId(null);
};

const onSubmitHandler=async(e)=>{
e.preventDefault();

if(!token)return toast.error("Admin not logged in!");
if(!name.trim())return toast.error("Product name is required");
if(!sku.trim())return toast.error("SKU is required");
if(!category.trim())return toast.error("Category is required");

const numericPrice=Number(price);

if(!Number.isFinite(numericPrice)||numericPrice<=0){
return toast.error("Please enter a valid price");
}

if(onSale){
const percent=Number(salePercent);

if(!salePercent||!Number.isFinite(percent)||percent<=0||percent>100){
return toast.error("Please enter a valid sale percentage from 1 to 100");
}
}

const finalBranch=role==="admin"?branch:userBranch;

if(!finalBranch){
return toast.error("Please select a branch");
}

setSaving(true);

try{
const formData=new FormData();

if(sizeChartImage)formData.append("sizeChartImage",sizeChartImage);
if(outfitImage)formData.append("outfitImage",outfitImage);

formData.append("name",name.trim());
formData.append("description",description||"");
formData.append("price",numericPrice);
formData.append("sku",sku.trim());
formData.append("groupCode",groupCode.trim());
formData.append("colorHex",colorHex||"#000000");
formData.append("color",getColorNameFromHex(colorHex));
formData.append("category",category);
formData.append("branch",finalBranch);
formData.append("bestseller",String(bestseller));
formData.append("newArrival",String(newArrival));
formData.append("onSale",String(onSale));
formData.append("salePercent",onSale?String(Number(salePercent)):"0");
formData.append("sizes",JSON.stringify(sizes));
formData.append("stock",JSON.stringify(stock));
formData.append("colors",JSON.stringify(colors));
formData.append("fitType",fitType);
formData.append("styleVibe",styleVibe);
formData.append("recommendationSection",recommendationSection);
formData.append("styleTags",JSON.stringify(styleTags));
formData.append("matchWith",JSON.stringify(matchWith));

images.forEach((img,i)=>{
if(img instanceof File){
formData.append(`image${i+1}`,img);
}
});

if(model3d instanceof File){
formData.append("model3d",model3d);
}

const response=editId
?await axios.put(
`${backendUrl}/api/product/update/${editId}`,
formData,
{
headers:{
Authorization:`Bearer ${token}`,
token,
"Content-Type":"multipart/form-data"
}
}
)
:await axios.post(
`${backendUrl}/api/product/add`,
formData,
{
headers:{
Authorization:`Bearer ${token}`,
token,
"Content-Type":"multipart/form-data"
}
}
);

if(response.data.success){
toast.success(
response.data.message||
(editId?"Product updated":"Product added")
);

resetForm();
setShowForm(false);
setCurrentPage(1);
await fetchList(true);
}else{
toast.error(response.data.message||"Something went wrong");
}
}catch(err){
console.error("PRODUCT SUBMIT ERROR:",err);
console.log("PRODUCT SUBMIT RESPONSE:",err?.response?.data);

toast.error(
err?.response?.data?.message||
err?.message||
"Failed to save product"
);
}finally{
setSaving(false);
}
};

const removeProduct=async(id)=>{
if(!window.confirm("Move this item to trash?"))return;

try{
const res=await axios.post(
`${backendUrl}/api/product/remove`,
{id},
axiosConfig
);

if(res.data.success){
toast.success("Item moved to trash");
fetchList(true);
}else{
toast.error(res.data.message);
}
}catch(err){
toast.error(err.response?.data?.message||err.message);
}
};

const getDiscountedPrice=(originalPrice,percent)=>{
const p=Number(originalPrice||0);
const d=Number(percent||0);
return(p-(p*d)/100).toFixed(2);
};

const getBranchLabel=(branchCode)=>{
const normalized=String(branchCode||"").trim().toLowerCase();

if(normalized==="all")return"All Branches";

const match=activeBranches.find(
(b)=>String(b.code).trim().toLowerCase()===normalized
);

return match?.name||branchCode||"Unassigned";
};

const getPreviewLabel=(fileName)=>{
const value=String(fileName||"").toLowerCase();

if(!value)return"";

if(
value.endsWith(".mp4")||
value.endsWith(".webm")||
value.endsWith(".ogg")
){
return"Video Preview";
}

return"3D Ready";
};

const getProductTotalStock=(product)=>{
if(!product?.stock)return 0;
if(typeof product.stock==="number")return product.stock;

if(typeof product.stock==="object"){
return Object.values(product.stock).reduce(
(sum,qty)=>sum+(Number(qty)||0),
0
);
}

return 0;
};

const filteredList=useMemo(()=>{
let data=[...list];

if(categoryFilter!=="all"){
data=data.filter((item)=>item.category===categoryFilter);
}

const term=search.trim().toLowerCase();

if(!term)return data;

return data.filter((item)=>{
return(
String(item.name||"").toLowerCase().includes(term)||
String(item.sku||"").toLowerCase().includes(term)||
String(item.groupCode||"").toLowerCase().includes(term)||
String(item.category||"").toLowerCase().includes(term)||
String(item.branch||"").toLowerCase().includes(term)
);
});
},[list,search,categoryFilter]);

useEffect(()=>{
setCurrentPage(1);
},[search,categoryFilter]);

const totalProducts=filteredList.length;

const onSaleCount=filteredList.filter(
(item)=>item.onSale&&Number(item.salePercent)>0
).length;

const newArrivalCount=filteredList.filter(
(item)=>item.newArrival
).length;

const lowStockCount=filteredList.filter((item)=>{
const total=getProductTotalStock(item);
return total<=5;
}).length;

const modelReadyCount=filteredList.filter(
(item)=>Boolean(item.model3d)
).length;

const modelPendingCount=filteredList.filter(
(item)=>!item.model3d
).length;

const indexOfLastItem=currentPage*pageSize;
const indexOfFirstItem=indexOfLastItem-pageSize;
const currentItems=filteredList.slice(indexOfFirstItem,indexOfLastItem);
const totalPages=Math.ceil(filteredList.length/pageSize);

useEffect(()=>{
if(currentPage>totalPages&&totalPages>0){
setCurrentPage(totalPages);
}
},[currentPage,totalPages]);

useEffect(()=>{
if(token){
fetchList();
fetchBranches();
fetchCategories();
}
},[token]);

if(loading){
return(
<div className="min-h-screen bg-transparent p-3 pt-24 font-['Montserrat']">
<div className="animate-pulse space-y-3">
<div className="h-24 rounded-[5px] bg-white/70"/>
<div className="grid grid-cols-1 gap-3 md:grid-cols-4">
{[...Array(4)].map((_,i)=>(
<div key={i} className="h-28 rounded-[5px] bg-white/70"/>
))}
</div>
<div className="h-96 rounded-[5px] bg-white/70"/>
</div>
</div>
);
}

return(
<div className="min-h-screen bg-transparent px-2.5 pb-4 pt-20 font-['Montserrat'] sm:px-3 sm:pt-24">
<div className="mx-auto max-w-[1500px]">
<main className="min-w-0">
<div className="relative mb-4 overflow-hidden rounded-[5px] border border-black/10 bg-[#0A0D17] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:p-6">
<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
<div className="min-w-0">
<p className="mb-2 text-[10px] font-black uppercase tracking-[0.34em] text-white/50">
Inventory Management
</p>

<div className="flex items-center gap-3">
<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[5px] border border-white/10 bg-white/10 backdrop-blur-sm">
<FaCubes className="text-sm"/>
</div>

<div className="min-w-0">
<h1 className="truncate text-[22px] font-black uppercase tracking-[-0.03em] sm:text-[30px]">
Product Inventory
</h1>

<p className="mt-1 text-[11px] text-white/65 sm:text-sm">
Manage products, stocks, branches, media, and optional 3D previews.
</p>
</div>
</div>
</div>

<div className="flex flex-wrap gap-2">
<button
type="button"
onClick={()=>fetchList(false)}
disabled={refreshing}
className="inline-flex items-center gap-2 rounded-[5px] border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20 disabled:opacity-50"
>
<FaSyncAlt className={refreshing?"animate-spin":""}/>
Refresh
</button>

<button
type="button"
onClick={()=>{
if(!showForm)resetForm();
setShowForm((prev)=>!prev);
}}
className="inline-flex items-center gap-2 rounded-[5px] bg-white px-4 py-2.5 text-sm font-black text-[#111111] shadow-sm transition hover:bg-[#ececec]"
>
<FaPlus/>
{showForm?"Close Form":"Add Product"}
</button>
</div>
</div>
</div>

<div className={`${panelBg} mb-4 rounded-[5px] p-4 sm:p-5`}>
<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
<div>
<h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#0A0D17] sm:text-[17px]">
Overview
</h3>

<p className="mt-0.5 text-[11px] text-[#6b7280] sm:text-xs">
Product summary for selected category and branch access.
</p>
</div>
</div>

<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
{[
{
label:"Total Products",
value:totalProducts,
icon:<FaBoxes/>,
note:"Filtered inventory"
},
{
label:"On Sale",
value:onSaleCount,
icon:<FaFire/>,
note:"Active discount items"
},
{
label:"New Arrival",
value:newArrivalCount,
icon:<FaTags/>,
note:"Fresh collection"
},
{
label:"Low Stock",
value:lowStockCount,
icon:<FaExclamationTriangle/>,
note:"Needs restock",
danger:true
},
{
label:"3D Ready",
value:modelReadyCount,
icon:<FaCubes/>,
note:"Preview attached"
},
{
label:"3D Pending",
value:modelPendingCount,
icon:<FaCubes/>,
note:"Optional preview"
}
].map((item)=>(
<div
key={item.label}
className={`${softPanelBg} min-w-0 overflow-hidden rounded-[5px] p-4 transition hover:shadow-md`}
>
<div className="mb-2 flex items-center justify-between gap-2">
<span className="text-xs font-medium text-[#6b7280]">
{item.label}
</span>

<div
className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] ${
item.danger
?"bg-red-500/10 text-red-600"
:"bg-[#111111]/8 text-[#111111]"
}`}
>
{item.icon}
</div>
</div>

<h2
className={`text-[26px] font-black leading-none tracking-[-0.03em] sm:text-[30px] ${
item.danger?"text-red-500":"text-[#0A0D17]"
}`}
>
{item.value}
</h2>

<p className="mt-1 text-[10px] text-gray-400">
{item.note}
</p>
</div>
))}
</div>
</div>

{showForm&&(
<form
onSubmit={onSubmitHandler}
className={`${panelBg} mb-4 rounded-[5px] p-4 sm:p-5`}
>
<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className={labelClass}>Product Form</p>

<h3 className="mt-1 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
{editId?"Edit Product":"Add New Product"}
</h3>

<p className="mt-1 text-sm text-[#6b7280]">
Fill product information, stock, sale status, style setup, and media uploads.
</p>
</div>

<button
type="button"
onClick={()=>{
resetForm();
setShowForm(false);
}}
className={buttonLight}
>
Cancel
</button>
</div>

<div className="grid grid-cols-1 gap-3 xl:grid-cols-[360px_1fr]">
<div className="space-y-3">
<div className={`${softPanelBg} rounded-[5px] p-4`}>
<div className="mb-3 flex items-center gap-2">
<FaImage className="text-[#0A0D17]/45"/>
<p className={labelClass}>Product Images</p>
</div>

<div className="grid grid-cols-4 gap-2">
{images.map((img,i)=>{
const hasImage=img||oldImages[i];

return(
<label key={i} className="block cursor-pointer">
<img
className={`aspect-[3/4] w-full rounded-[5px] border border-black/10 bg-white ${
hasImage
?"object-cover"
:"object-contain p-2 opacity-50"
}`}
src={
img
?URL.createObjectURL(img)
:oldImages[i]
?getMediaUrl(oldImages[i],backendUrl)
:assets.upload_area
}
alt=""
/>

<input
type="file"
accept="image/*"
hidden
onChange={(e)=>{
const file=e.target.files?.[0]||null;

setImages((prev)=>{
const copy=[...prev];
copy[i]=file;
return copy;
});
}}
/>
</label>
);
})}
</div>
</div>

<div className={`${softPanelBg} rounded-[5px] p-4`}>
<div className="mb-3 flex items-center gap-2">
<FaImage className="text-[#0A0D17]/45"/>
<p className={labelClass}>Outfit Builder Image</p>
</div>

<label className="block cursor-pointer">
<img
className={`h-44 w-full rounded-[5px] border border-black/10 bg-white ${
outfitImage||oldOutfitImage
?"object-contain"
:"object-contain p-3 opacity-50"
}`}
src={
outfitImage
?URL.createObjectURL(outfitImage)
:oldOutfitImage
?getMediaUrl(oldOutfitImage,backendUrl)
:assets.upload_area
}
alt="Outfit builder"
/>

<input
type="file"
accept="image/png,image/jpeg,image/webp"
hidden
onChange={(e)=>setOutfitImage(e.target.files?.[0]||null)}
/>
</label>

<p className="mt-2 text-xs text-[#6b7280]">
Best for 2D outfit builder: transparent PNG.
</p>
</div>

<div className={`${softPanelBg} rounded-[5px] p-4`}>
<div className="mb-3 flex items-center gap-2">
<FaImage className="text-[#0A0D17]/45"/>
<p className={labelClass}>Size Chart</p>
</div>

<label className="block cursor-pointer">
<img
className={`h-44 w-full rounded-[5px] border border-black/10 bg-white ${
sizeChartImage||oldSizeChartImage
?"object-cover"
:"object-contain p-3 opacity-50"
}`}
src={
sizeChartImage
?URL.createObjectURL(sizeChartImage)
:oldSizeChartImage
?getMediaUrl(oldSizeChartImage,backendUrl)
:assets.upload_area
}
alt="Size chart"
/>

<input
type="file"
accept="image/*"
hidden
onChange={(e)=>setSizeChartImage(e.target.files?.[0]||null)}
/>
</label>
</div>

<div className={`${softPanelBg} rounded-[5px] p-4`}>
<div className="mb-3 flex items-center justify-between gap-3">
<div className="flex items-center gap-2">
<FaCubes className="text-[#0A0D17]/45"/>
<p className={labelClass}>3D Model / Preview</p>
</div>

<span className="rounded-[5px] border border-black/10 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#0A0D17]/45">
Optional
</span>
</div>

<input
type="file"
accept=".glb,.gltf,.usdz,.mp4,.webm,.ogg"
onChange={(e)=>setModel3d(e.target.files?.[0]||null)}
className={inputClass}
/>

<p className="mt-2 text-xs font-semibold text-[#6b7280]">
You can add this product without a 3D model and upload one later by editing the product.
</p>

<p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0A0D17]/35">
Supported: GLB, GLTF, USDZ, MP4, WEBM, OGG
</p>

{oldModel3d&&!model3d&&(
<div className="mt-3 rounded-[5px] border border-green-100 bg-green-50 px-3 py-2">
<p className="text-[10px] font-black uppercase tracking-[0.12em] text-green-700">
3D Preview Available
</p>

<p className="mt-1 break-all text-xs font-semibold text-green-700">
{oldModel3d}
</p>
</div>
)}

{model3d&&(
<div className="mt-3 rounded-[5px] border border-blue-100 bg-blue-50 px-3 py-2">
<p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
New 3D Preview Selected
</p>

<p className="mt-1 break-all text-xs font-semibold text-blue-700">
{model3d.name}
</p>
</div>
)}

{!oldModel3d&&!model3d&&(
<div className="mt-3 rounded-[5px] border border-dashed border-black/10 bg-white px-3 py-3">
<div className="flex items-center gap-2">
<FaCubes className="text-[#0A0D17]/35"/>

<p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#0A0D17]/45">
3D Coming Soon
</p>
</div>

<p className="mt-1 text-xs text-[#6b7280]">
This does not prevent the product from being added to the store.
</p>
</div>
)}
</div>
</div>

<div className="space-y-3">
<div className={`${softPanelBg} rounded-[5px] p-4`}>
<p className={labelClass}>Basic Information</p>

<div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
<input
value={name}
onChange={(e)=>setName(e.target.value)}
placeholder="Product Name"
className={inputClass}
required
/>

<input
type="number"
value={price}
onChange={(e)=>setPrice(e.target.value)}
placeholder="Price"
className={inputClass}
required
/>

<input
value={sku}
onChange={(e)=>setSku(e.target.value)}
placeholder="SKU Code (e.g. SKU-001)"
className={inputClass}
required
/>

<input
value={groupCode}
onChange={(e)=>setGroupCode(e.target.value)}
placeholder="Group Code (example: SHIRT-001)"
className={inputClass}
/>

<select
value={category}
onChange={(e)=>setCategory(e.target.value)}
className={inputClass}
required
>
<option value="" disabled>Select Category</option>

{CATEGORY_OPTIONS.map((cat)=>(
<option key={cat} value={cat}>
{cat}
</option>
))}
</select>

{role==="admin"?(
<select
value={branch}
onChange={(e)=>setBranch(e.target.value)}
className={inputClass}
required
>
<option value="">Select Branch</option>
<option value="all">All Branches</option>

{activeBranches.length>0?(
activeBranches.map((b)=>(
<option key={b._id||b.code} value={b.code}>
{b.name}
</option>
))
):(
<option value="" disabled>No active branches found</option>
)}
</select>
):(
<input
type="text"
value={getBranchLabel(userBranch)}
disabled
className={`${inputClass} bg-gray-100 text-gray-500`}
/>
)}
</div>

{CATEGORY_OPTIONS.length===0&&(
<p className="mt-2 text-xs font-semibold text-amber-600">
No categories are available. Add a category from the Category page first.
</p>
)}

<textarea
value={description}
onChange={(e)=>setDescription(e.target.value)}
placeholder="Description"
className={`${inputClass} mt-3 h-24 resize-none`}
/>
</div>

<div className={`${softPanelBg} rounded-[5px] p-4`}>
<div className="mb-3 flex items-center gap-2">
<FaPalette className="text-[#0A0D17]/45"/>
<p className={labelClass}>Color Setup</p>
</div>

<div className="flex items-center gap-2">
<input
type="color"
value={colorHex}
onChange={(e)=>setColorHex(e.target.value)}
className="h-10 w-12 cursor-pointer rounded-[5px] border border-black/10 bg-white"
/>

<input
value={colorHex}
readOnly
className={inputClass}
/>
</div>

<p className="mt-2 text-xs text-[#6b7280]">
Auto color name:{" "}
<span className="font-black text-[#0A0D17]">
{autoColorName}
</span>
</p>

<div className="mt-3 flex gap-2">
<input
value={colorInput}
onChange={(e)=>setColorInput(e.target.value)}
className={inputClass}
placeholder="Other color"
/>

<button
type="button"
onClick={()=>{
const trimmed=colorInput.trim();

if(!trimmed)return;

const exists=colors.some(
(c)=>c.toLowerCase()===trimmed.toLowerCase()
);

if(exists){
toast.error("Color already added");
return;
}

setColors((prev)=>[...prev,trimmed]);
setColorInput("");
}}
className={buttonDark}
>
Add
</button>
</div>

<div className="mt-3 flex flex-wrap gap-2">
{colors.map((c,i)=>(
<div
key={i}
className="flex items-center gap-1 rounded-[5px] border border-black/10 bg-white px-2 py-1 text-xs"
>
<span>{c}</span>

<button
type="button"
onClick={()=>setColors((prev)=>prev.filter((_,x)=>x!==i))}
className="font-bold text-red-600 hover:text-red-800"
>
✕
</button>
</div>
))}
</div>
</div>

<div className={`${softPanelBg} rounded-[5px] p-4`}>
<p className={labelClass}>Sizes and Stock</p>

<div className="mt-3 flex flex-wrap gap-2">
{SIZE_OPTIONS.map((size)=>(
<span
key={size}
onClick={()=>
setSizes((prev)=>
prev.includes(size)
?prev.filter((s)=>s!==size)
:[...prev,size]
)
}
className={`cursor-pointer rounded-[5px] border px-3 py-2 text-sm font-black transition ${
sizes.includes(size)
?"border-[#0A0D17] bg-[#0A0D17] text-white"
:"border-black/10 bg-white text-[#0A0D17]"
}`}
>
{size}
</span>
))}
</div>

<div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-6">
{SIZE_OPTIONS.map((size)=>(
<div key={size} className="flex flex-col">
<span className="mb-1 text-[10px] font-black text-[#6b7280]">
{size}
</span>

<input
type="number"
min="0"
value={stock[size]===0?"":stock[size]}
onChange={(e)=>
setStock((prev)=>({
...prev,
[size]:
e.target.value===""
?0
:Math.max(0,Number(e.target.value))
}))
}
className="w-full rounded-[5px] border border-black/10 bg-white py-2.5 text-center outline-none"
/>
</div>
))}
</div>
</div>

<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
<div className={`${softPanelBg} rounded-[5px] p-4`}>
<p className={labelClass}>Sale Status</p>

<label className="mt-3 flex items-center gap-2 font-semibold text-[#0A0D17]">
<input
type="checkbox"
checked={onSale}
onChange={()=>{
setOnSale((prev)=>!prev);
if(onSale)setSalePercent("");
}}
/>
Put this product on sale
</label>

{onSale&&(
<div className="mt-3 flex items-center gap-2">
<input
type="number"
min="1"
max="100"
value={salePercent}
onChange={(e)=>setSalePercent(e.target.value)}
placeholder="Discount %"
className={inputClass}
/>

<span className="font-black text-[#6b7280]">
%
</span>
</div>
)}

<div className="mt-4 space-y-2">
<label className="flex items-center gap-2 font-semibold text-[#0A0D17]">
<input
type="checkbox"
checked={bestseller}
onChange={()=>setBestseller(!bestseller)}
/>
Bestseller
</label>

<label className="flex items-center gap-2 font-semibold text-[#0A0D17]">
<input
type="checkbox"
checked={newArrival}
onChange={()=>setNewArrival(!newArrival)}
/>
New Arrival
</label>
</div>
</div>

<div className={`${softPanelBg} rounded-[5px] p-4`}>
<p className={labelClass}>Style Setup</p>

<div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
<select
value={fitType}
onChange={(e)=>setFitType(e.target.value)}
className={inputClass}
>
<option value="Regular">Regular</option>
<option value="Oversized">Oversized</option>
<option value="Boxy">Boxy</option>
<option value="Slim">Slim</option>
</select>

<select
value={styleVibe}
onChange={(e)=>setStyleVibe(e.target.value)}
className={inputClass}
>
<option value="Streetwear">Streetwear</option>
<option value="Minimal">Minimal</option>
<option value="Sporty">Sporty</option>
<option value="Clean">Clean</option>
<option value="Graphic">Graphic</option>
</select>
</div>

<div className="mt-4 flex flex-wrap gap-2">
{["top","bottom","both","none"].map((pos)=>(
<span
key={pos}
onClick={()=>setRecommendationSection(pos)}
className={`cursor-pointer rounded-[5px] border px-3 py-1.5 text-xs font-black ${
recommendationSection===pos
?"border-[#0A0D17] bg-[#0A0D17] text-white"
:"border-black/10 bg-white text-[#0A0D17]"
}`}
>
{pos.toUpperCase()}
</span>
))}
</div>
</div>
</div>

<div className={`${softPanelBg} rounded-[5px] p-4`}>
<p className={labelClass}>Recommendation Tags</p>

<div className="mt-3 flex gap-2">
<input
value={styleTagInput}
onChange={(e)=>setStyleTagInput(e.target.value)}
className={inputClass}
placeholder="Add tag (example: minimal)"
/>

<button
type="button"
onClick={()=>{
const trimmed=styleTagInput.trim();

if(!trimmed)return;

const exists=styleTags.some(
(tag)=>tag.toLowerCase()===trimmed.toLowerCase()
);

if(exists){
toast.error("Style tag already added");
return;
}

setStyleTags((prev)=>[...prev,trimmed]);
setStyleTagInput("");
}}
className={buttonDark}
>
Add
</button>
</div>

<div className="mt-3 flex flex-wrap gap-2">
{styleTags.map((tag,i)=>(
<div
key={i}
className="flex items-center gap-1 rounded-[5px] border border-black/10 bg-white px-2 py-1 text-xs"
>
<span>{tag}</span>

<button
type="button"
onClick={()=>setStyleTags((prev)=>prev.filter((_,x)=>x!==i))}
className="font-bold text-red-600 hover:text-red-800"
>
✕
</button>
</div>
))}
</div>

<p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
Match With
</p>

<div className="mt-2 flex flex-wrap gap-2">
{CATEGORY_OPTIONS.map((item)=>(
<span
key={item}
onClick={()=>
setMatchWith((prev)=>
prev.includes(item)
?prev.filter((x)=>x!==item)
:[...prev,item]
)
}
className={`cursor-pointer rounded-[5px] border px-3 py-1.5 text-xs font-black ${
matchWith.includes(item)
?"border-[#0A0D17] bg-[#0A0D17] text-white"
:"border-black/10 bg-white text-[#0A0D17]"
}`}
>
{item}
</span>
))}
</div>
</div>

<div className="flex flex-wrap gap-2">
<button
disabled={saving}
className={buttonDark}
>
{saving
?editId
?"Updating..."
:"Adding..."
:editId
?"Update Product"
:"Add Product"}
</button>

<button
type="button"
onClick={resetForm}
className={buttonLight}
>
Reset
</button>
</div>
</div>
</div>
</form>
)}

<div className={`${panelBg} overflow-hidden rounded-[5px]`}>
<div className="border-b border-black/10 px-4 py-5 sm:px-5">
<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
<div>
<p className={labelClass}>Inventory Table</p>

<h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
Product List
</h3>
</div>

<div className="flex flex-col gap-2 sm:flex-row">
<div className="relative">
<FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#0A0D17]/35"/>

<input
value={search}
onChange={(e)=>setSearch(e.target.value)}
placeholder="Search name, SKU, group code, category"
className="w-full rounded-[5px] border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black sm:min-w-[300px]"
/>
</div>

<select
value={categoryFilter}
onChange={(e)=>setCategoryFilter(e.target.value)}
className="rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
>
<option value="all">All Categories</option>

{CATEGORY_OPTIONS.map((cat)=>(
<option key={cat} value={cat}>
{cat}
</option>
))}
</select>
</div>
</div>
</div>

<div className="overflow-auto">
<div className="min-w-[980px]">
<div className="grid grid-cols-[90px_2.1fr_1fr_1fr_1fr_150px] bg-[#0A0D17] px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white">
<span>Image</span>
<span>Product</span>
<span>Category</span>
<span>Branch</span>
<span>Price</span>
<span>Actions</span>
</div>

{currentItems.length>0?(
currentItems.map((item,index)=>(
<div
key={item._id}
className={`grid grid-cols-[90px_2.1fr_1fr_1fr_1fr_150px] items-center gap-3 border-b border-[#ecece6] px-5 py-4 ${
index%2===0?"bg-white":"bg-[#fcfcfb]"
}`}
>
<img
src={
item.images?.[0]
?getMediaUrl(item.images[0],backendUrl)
:assets.upload_area
}
className="h-20 w-16 rounded-[5px] border border-black/10 bg-white object-cover"
alt={item.name}
/>

<div className="min-w-0">
<p className="truncate font-black text-[#0A0D17]">
{item.name}
</p>

<div className="mt-1 flex flex-wrap gap-1.5">
{item.sku&&(
<span className="rounded-[5px] border border-black/10 bg-[#FAFAF8] px-2 py-1 text-[10px] font-black uppercase text-[#6b7280]">
SKU: {item.sku}
</span>
)}

{item.groupCode&&(
<span className="rounded-[5px] border border-black/10 bg-[#FAFAF8] px-2 py-1 text-[10px] font-black uppercase text-[#6b7280]">
Group: {item.groupCode}
</span>
)}

{item.outfitImage&&(
<span className="rounded-[5px] border border-green-100 bg-green-50 px-2 py-1 text-[10px] font-black uppercase text-green-700">
Outfit Ready
</span>
)}

{item.model3d?(
<span className="rounded-[5px] border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
{getPreviewLabel(item.model3d)}
</span>
):(
<span className="rounded-[5px] border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
3D Coming Soon
</span>
)}

{item.onSale&&Number(item.salePercent)>0&&(
<span className="rounded-[5px] border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-black uppercase text-red-600">
{item.salePercent}% OFF
</span>
)}
</div>

{(item.color||item.colorHex)&&(
<div className="mt-2 flex items-center gap-2">
{item.colorHex&&(
<span
className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
style={{backgroundColor:item.colorHex}}
/>
)}

<p className="truncate text-[10px] font-semibold uppercase text-[#6b7280]">
{item.color||getColorNameFromHex(item.colorHex)}{" "}
{item.colorHex?`(${item.colorHex})`:""}
</p>
</div>
)}

{(item.fitType||item.styleVibe)&&(
<p className="mt-1 truncate text-[10px] font-semibold uppercase text-[#6b7280]">
{item.fitType?`Fit: ${item.fitType}`:""}{" "}
{item.styleVibe?`• Vibe: ${item.styleVibe}`:""}
</p>
)}
</div>

<p className="text-[11px] font-black uppercase text-[#6b7280]">
{item.category}
</p>

<p className="text-[11px] font-black uppercase text-blue-600">
{getBranchLabel(item.branch)}
</p>

<div>
<p className="font-black text-[#0A0D17]">
{currency}
{Number(item.price).toFixed(2)}
</p>

{item.onSale&&Number(item.salePercent)>0&&(
<p className="mt-1 text-xs font-bold text-red-500">
{currency}
{getDiscountedPrice(item.price,item.salePercent)}
</p>
)}

<p
className={`mt-1 text-[10px] font-black uppercase ${
getProductTotalStock(item)<=5
?"text-red-500"
:"text-[#6b7280]"
}`}
>
Stock: {getProductTotalStock(item)}
</p>
</div>

<div className="flex flex-wrap gap-2">
<button
onClick={()=>fetchProduct(item._id)}
className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#0A0D17] px-3 py-2 text-xs font-black text-white transition hover:bg-[#1d2433]"
>
<FaEdit/>
Edit
</button>

<button
onClick={()=>removeProduct(item._id)}
className="inline-flex items-center gap-1.5 rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-500 hover:text-white"
>
<FaTrash/>
Trash
</button>
</div>
</div>
))
):(
<div className="bg-white p-10 text-center font-semibold text-[#6b7280]">
No products found
</div>
)}
</div>
</div>
</div>

{filteredList.length>0&&(
<div className={`${panelBg} mt-4 rounded-[5px] px-4 py-4`}>
<style>
{`
.saint-pagination .ant-pagination-item{
border-radius:5px!important;
border-color:rgba(0,0,0,0.12)!important;
font-weight:900!important;
}
.saint-pagination .ant-pagination-item-active{
background:#0A0D17!important;
border-color:#0A0D17!important;
}
.saint-pagination .ant-pagination-item-active a{
color:#ffffff!important;
}
.saint-pagination .ant-pagination-prev button,
.saint-pagination .ant-pagination-next button{
border-radius:5px!important;
border-color:rgba(0,0,0,0.12)!important;
font-weight:900!important;
}
.saint-pagination .ant-select-selector{
border-radius:5px!important;
border-color:rgba(0,0,0,0.12)!important;
font-weight:800!important;
}
.saint-pagination .ant-pagination-total-text{
color:#6b7280!important;
font-size:12px!important;
font-weight:800!important;
text-transform:uppercase!important;
letter-spacing:0.08em!important;
}
`}
</style>

<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
Page Control
</p>

<p className="mt-1 text-xs font-semibold text-[#6b7280]">
Showing {indexOfFirstItem+1} - {Math.min(indexOfLastItem,filteredList.length)} of {filteredList.length} products
</p>
</div>

<Pagination
className="saint-pagination"
current={currentPage}
pageSize={pageSize}
total={filteredList.length}
showSizeChanger
pageSizeOptions={["5","10","20","50"]}
responsive
showTotal={(total,range)=>`${range[0]}-${range[1]} of ${total} items`}
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
</main>
</div>
</div>
);
};

export default ProductPage;