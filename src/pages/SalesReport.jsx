import React,{useEffect,useMemo,useRef,useState}from"react";
import axios from"axios";
import{Line,Bar,Doughnut}from"react-chartjs-2";
import{useNavigate}from"react-router-dom";
import{backendUrl,currency}from"../App";
import{FaPrint,FaSyncAlt,FaChartLine,FaShoppingCart,FaBoxOpen,FaUsers,FaMoneyBillWave,FaExclamationTriangle,FaChevronLeft,FaChevronRight}from"react-icons/fa";
import{Chart as ChartJS,CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Tooltip,Legend,Filler}from"chart.js";

ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Tooltip,Legend,Filler);

const FIXED_CATEGORIES=["Tshirt","Long Sleeve","Jorts","Mesh Shorts","Crop Jersey"];
const PAGE_SIZE=10;
const RANGE_OPTIONS=[
{value:"today",label:"Today"},
{value:"week",label:"Week"},
{value:"month",label:"Month"},
{value:"year",label:"Year"}
];

const normalizeCategory=(value)=>{
const raw=String(value||"").trim().toLowerCase();
if(!raw)return"Unknown";
if(["tshirt","t-shirt","tee","tees"].includes(raw))return"Tshirt";
if(["long sleeve","longsleeve","long sleeves"].includes(raw))return"Long Sleeve";
if(raw==="jorts")return"Jorts";
if(["mesh short","mesh shorts"].includes(raw))return"Mesh Shorts";
if(["crop jersey","cropjersey"].includes(raw))return"Crop Jersey";
return String(value||"Unknown");
};

const isPaidOrder=(order)=>{
const paymentMethod=String(order?.paymentMethod||"").trim().toLowerCase();
const paymentStatus=String(order?.paymentStatus||"").trim().toLowerCase();
const orderStatus=String(order?.status||"").trim().toLowerCase();

if(paymentMethod==="cod"){
return paymentStatus==="paid"||orderStatus==="delivered";
}

return paymentStatus==="paid"||order?.payment===true||order?.payment==="true";
};

const SalesReport=()=>{
const navigate=useNavigate();
const insightRequestRef=useRef("");

const[overviewRange,setOverviewRange]=useState("month");
const[salesTrendRange,setSalesTrendRange]=useState("month");
const[revenueProfitRange,setRevenueProfitRange]=useState("year");
const[categoryRange,setCategoryRange]=useState("month");
const[productRange,setProductRange]=useState("month");
const[recentOrdersRange,setRecentOrdersRange]=useState("month");

const[productPage,setProductPage]=useState(1);
const[lowStockPage,setLowStockPage]=useState(1);
const[recentOrdersPage,setRecentOrdersPage]=useState(1);

const[rawProducts,setRawProducts]=useState([]);
const[rawOrders,setRawOrders]=useState([]);
const[rawUsersCount,setRawUsersCount]=useState(0);

const[loading,setLoading]=useState(true);
const[refreshing,setRefreshing]=useState(false);
const[lastUpdated,setLastUpdated]=useState(null);
const[fetchError,setFetchError]=useState("");

const[salesInsight,setSalesInsight]=useState("");
const[insightLoading,setInsightLoading]=useState(false);
const[insightError,setInsightError]=useState("");

const panelBg="bg-white border border-black/10 shadow-[0_8px_28px_rgba(10,13,23,0.06)]";
const labelClass="text-[9px] font-black uppercase tracking-[0.26em] text-[#0A0D17]/40";

const formatMoney=(value)=>`${currency}${Number(value||0).toLocaleString(undefined,{maximumFractionDigits:2})}`;

const getProductTotalStock=(product)=>{
if(!product?.stock)return 0;
if(typeof product.stock==="number")return Number(product.stock)||0;
if(typeof product.stock==="object"){
return Object.values(product.stock).reduce((sum,qty)=>sum+(Number(qty)||0),0);
}
return 0;
};

const getDateWindowForRange=(range)=>{
const now=new Date();
now.setHours(0,0,0,0);

if(range==="today"){
const end=new Date(now);
end.setDate(end.getDate()+1);
return{start:new Date(now),end};
}

if(range==="week"){
const start=new Date(now);
start.setDate(start.getDate()-6);
const end=new Date(now);
end.setDate(end.getDate()+1);
return{start,end};
}

if(range==="month"){
const start=new Date(now);
start.setDate(start.getDate()-29);
const end=new Date(now);
end.setDate(end.getDate()+1);
return{start,end};
}

return{
start:new Date(now.getFullYear(),now.getMonth()-11,1),
end:new Date(now.getFullYear(),now.getMonth()+1,1)
};
};

const filterOrdersByRange=(orders,range)=>{
const{start,end}=getDateWindowForRange(range);

return orders.filter((order)=>{
const value=order?.date||order?.createdAt;
if(!value)return false;
const date=new Date(value);
return!Number.isNaN(date.getTime())&&date>=start&&date<end;
});
};

const extractArray=(response,keys=[])=>{
const data=response?.data;

for(const key of keys){
if(Array.isArray(data?.[key]))return data[key];
}

if(Array.isArray(data?.data))return data.data;

for(const key of keys){
if(Array.isArray(data?.data?.[key]))return data.data[key];
}

return[];
};

const findProductForItem=(item)=>{
const itemProductId=String(
item?.productId?._id||
item?.productId||
item?.product?._id||
item?.product||
""
);

const itemName=String(
item?.name||
item?.productName||
item?.productId?.name||
item?.product?.name||
""
).trim();

let product=null;

if(itemProductId){
product=rawProducts.find((p)=>String(p._id)===itemProductId);
}

if(!product&&itemName){
product=rawProducts.find((p)=>{
return String(p?.name||"").trim().toLowerCase()===itemName.toLowerCase();
});
}

return{product,itemProductId,itemName};
};

const fetchData=async(silent=false)=>{
if(!silent)setLoading(true);
setRefreshing(true);
setFetchError("");

const token=localStorage.getItem("token")||"";
const role=localStorage.getItem("role")||"";
const branch=localStorage.getItem("branch")||"";

let products=[];
let orders=[];
let users=[];
const errors=[];

console.log("[SALES REPORT] BACKEND:",backendUrl);
console.log("[SALES REPORT] TOKEN:",token?"FOUND":"MISSING");
console.log("[SALES REPORT] ROLE:",role);
console.log("[SALES REPORT] BRANCH:",branch);

try{
const productRes=await axios.get(`${backendUrl}/api/product/list`);
products=extractArray(productRes,["products"]);
console.log("[SALES REPORT] PRODUCTS FOUND:",products.length);
}catch(error){
console.error("[SALES REPORT] PRODUCT ERROR:",error?.response?.status,error?.response?.data||error?.message);
errors.push(`Products: ${error?.response?.status||""} ${error?.response?.data?.message||error?.message||"Request failed"}`);
}

try{
const orderRes=await axios.get(`${backendUrl}/api/order/list`,{
headers:{Authorization:`Bearer ${token}`}
});
orders=extractArray(orderRes,["orders"]);
console.log("[SALES REPORT] ORDERS FOUND:",orders.length);
}catch(error){
console.error("[SALES REPORT] ORDER ERROR:",error?.response?.status,error?.response?.data||error?.message);
errors.push(`Orders: ${error?.response?.status||""} ${error?.response?.data?.message||error?.message||"Request failed"}`);
}

if(role==="admin"){
try{
const usersRes=await axios.get(`${backendUrl}/api/admin/users`,{
headers:{Authorization:`Bearer ${token}`}
});
users=extractArray(usersRes,["users"]);
console.log("[SALES REPORT] USERS FOUND:",users.length);
}catch(error){
console.error("[SALES REPORT] USER ERROR:",error?.response?.status,error?.response?.data||error?.message);
errors.push(`Users: ${error?.response?.status||""} ${error?.response?.data?.message||error?.message||"Request failed"}`);
}
}

if(role!=="admin"&&branch&&branch!=="all"){
const normalizedBranch=String(branch).trim().toLowerCase();

products=products.filter((product)=>{
const productBranch=String(product?.branch||"").trim().toLowerCase();
return!productBranch||productBranch===normalizedBranch;
});

orders=orders.filter((order)=>{
if(String(order?.branch||"").trim().toLowerCase()===normalizedBranch)return true;
return(order.items||[]).some((item)=>{
return String(item?.branch||"").trim().toLowerCase()===normalizedBranch;
});
});
}

console.log("[SALES REPORT] FINAL PRODUCTS:",products.length);
console.log("[SALES REPORT] FINAL ORDERS:",orders.length);
console.log("[SALES REPORT] FINAL USERS:",users.length);

setRawProducts(products);
setRawOrders(orders);
setRawUsersCount(users.length);
setLastUpdated(new Date());

if(errors.length)setFetchError(errors.join(" | "));

if(!silent)setLoading(false);
setRefreshing(false);
};

useEffect(()=>{
fetchData(false);
const interval=setInterval(()=>fetchData(true),600000);
return()=>clearInterval(interval);
},[]);

const overviewOrders=useMemo(()=>{
return filterOrdersByRange(rawOrders,overviewRange);
},[rawOrders,overviewRange]);

const overviewPaidOrders=useMemo(()=>{
return overviewOrders.filter(isPaidOrder);
},[overviewOrders]);

const stats=useMemo(()=>{
const totalRevenue=overviewPaidOrders.reduce((sum,order)=>{
return sum+(Number(order?.amount)||0);
},0);

const totalUnitsSold=overviewPaidOrders.reduce((sum,order)=>{
return sum+(order.items||[]).reduce((itemSum,item)=>{
return itemSum+(Number(item?.quantity??item?.qty??1)||0);
},0);
},0);

const netProfit=Math.floor(totalRevenue*.3);

return{
totalRevenue,
totalOrders:overviewOrders.length,
paidOrders:overviewPaidOrders.length,
totalUnitsSold,
totalProducts:rawProducts.length,
totalUsers:rawUsersCount,
netProfit,
netProfitMargin:totalRevenue>0?Math.round(netProfit/totalRevenue*100):0,
lowStockCount:rawProducts.filter((product)=>getProductTotalStock(product)<=5).length
};
},[overviewOrders,overviewPaidOrders,rawProducts,rawUsersCount]);

const productPerformance=useMemo(()=>{
const rangedOrders=filterOrdersByRange(rawOrders,productRange).filter(isPaidOrder);
const map={};

rawProducts.forEach((product)=>{
map[String(product._id)]={
_id:product._id,
name:product.name||"Unnamed Product",
category:normalizeCategory(product.category),
price:Number(product.price)||0,
stock:getProductTotalStock(product),
sold:0,
revenue:0
};
});

rangedOrders.forEach((order)=>{
(order.items||[]).forEach((item)=>{
const itemProductId=String(
item?.productId?._id||
item?.productId||
item?.product?._id||
item?.product||
""
);

const itemName=String(
item?.name||
item?.productName||
item?.productId?.name||
item?.product?.name||
""
).trim();

let product=null;

if(itemProductId){
product=rawProducts.find((p)=>String(p._id)===itemProductId);
}

if(!product&&itemName){
product=rawProducts.find((p)=>String(p?.name||"").trim().toLowerCase()===itemName.toLowerCase());
}

const key=product?String(product._id):itemProductId||`name-${itemName}`;
if(!key)return;

if(!map[key]){
map[key]={
_id:key,
name:itemName||"Unknown Product",
category:normalizeCategory(item?.category||"Unknown"),
price:Number(item?.price)||0,
stock:0,
sold:0,
revenue:0
};
}

const qty=Number(item?.quantity??item?.qty??1)||0;
const price=Number(item?.price??product?.price??map[key].price)||0;

map[key].sold+=qty;
map[key].revenue+=qty*price;
});
});

return Object.values(map).sort((a,b)=>b.revenue-a.revenue||b.sold-a.sold);
},[rawProducts,rawOrders,productRange]);

const categoryPerformance=useMemo(()=>{
const rangedOrders=filterOrdersByRange(rawOrders,categoryRange).filter(isPaidOrder);
const map={};

FIXED_CATEGORIES.forEach((category)=>{
map[category]={
category,
unitsSold:0,
revenue:0,
products:rawProducts.filter((p)=>normalizeCategory(p.category)===category).length
};
});

rawProducts.forEach((product)=>{
const category=normalizeCategory(product.category);

if(!map[category]){
map[category]={category,unitsSold:0,revenue:0,products:0};
}

if(!FIXED_CATEGORIES.includes(category)){
map[category].products+=1;
}
});

rangedOrders.forEach((order)=>{
(order.items||[]).forEach((item)=>{
const itemProductId=String(
item?.productId?._id||
item?.productId||
item?.product?._id||
item?.product||
""
);

const itemName=String(
item?.name||
item?.productName||
item?.productId?.name||
item?.product?.name||
""
).trim();

let product=rawProducts.find((p)=>String(p._id)===itemProductId);

if(!product&&itemName){
product=rawProducts.find((p)=>String(p?.name||"").trim().toLowerCase()===itemName.toLowerCase());
}

const category=normalizeCategory(
product?.category||
item?.category||
item?.productId?.category||
item?.product?.category||
"Unknown"
);

if(!map[category]){
map[category]={category,unitsSold:0,revenue:0,products:0};
}

const qty=Number(item?.quantity??item?.qty??1)||0;
const price=Number(item?.price??product?.price)||0;

map[category].unitsSold+=qty;
map[category].revenue+=qty*price;
});
});

return Object.values(map);
},[rawOrders,rawProducts,categoryRange]);

const lowStockProducts=useMemo(()=>{
return rawProducts
.map((product)=>({
_id:product._id,
name:product.name||"Unnamed Product",
category:normalizeCategory(product.category),
stock:getProductTotalStock(product),
price:Number(product.price)||0
}))
.filter((product)=>product.stock<=5)
.sort((a,b)=>a.stock-b.stock);
},[rawProducts]);

const recentOrders=useMemo(()=>{
return[...filterOrdersByRange(rawOrders,recentOrdersRange)]
.sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
},[rawOrders,recentOrdersRange]);

const salesTrend=useMemo(()=>{
const paidOrders=filterOrdersByRange(rawOrders,salesTrendRange).filter(isPaidOrder);
const labels=[];
const data=[];
const now=new Date();

if(salesTrendRange==="today"){
for(let i=0;i<24;i++){
labels.push(`${i}:00`);
data.push(
paidOrders.filter((order)=>new Date(order.date||order.createdAt).getHours()===i)
.reduce((sum,order)=>sum+(Number(order.amount)||0),0)
);
}
}else if(salesTrendRange==="week"){
for(let i=6;i>=0;i--){
const d=new Date(now);
d.setDate(now.getDate()-i);
labels.push(d.toLocaleDateString("en-US",{weekday:"short"}));

data.push(
paidOrders.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getFullYear()===d.getFullYear()&&od.getMonth()===d.getMonth()&&od.getDate()===d.getDate();
}).reduce((sum,order)=>sum+(Number(order.amount)||0),0)
);
}
}else if(salesTrendRange==="month"){
for(let i=29;i>=0;i--){
const d=new Date(now);
d.setDate(now.getDate()-i);
labels.push(d.toLocaleDateString("en-US",{month:"short",day:"numeric"}));

data.push(
paidOrders.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getFullYear()===d.getFullYear()&&od.getMonth()===d.getMonth()&&od.getDate()===d.getDate();
}).reduce((sum,order)=>sum+(Number(order.amount)||0),0)
);
}
}else{
for(let i=11;i>=0;i--){
const d=new Date(now.getFullYear(),now.getMonth()-i,1);
labels.push(d.toLocaleDateString("en-US",{month:"short"}));

data.push(
paidOrders.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getMonth()===d.getMonth()&&od.getFullYear()===d.getFullYear();
}).reduce((sum,order)=>sum+(Number(order.amount)||0),0)
);
}
}

return{labels,data};
},[rawOrders,salesTrendRange]);

const revenueProfit=useMemo(()=>{
const paidOrders=filterOrdersByRange(rawOrders,revenueProfitRange).filter(isPaidOrder);
const labels=[];
const revenue=[];
const profit=[];
const now=new Date();

if(revenueProfitRange==="today"){
for(let i=0;i<24;i++){
const amount=paidOrders.filter((order)=>new Date(order.date||order.createdAt).getHours()===i)
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(`${i}:00`);
revenue.push(amount);
profit.push(Math.floor(amount*.3));
}
}else if(revenueProfitRange==="week"){
for(let i=6;i>=0;i--){
const d=new Date(now);
d.setDate(now.getDate()-i);

const amount=paidOrders.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getFullYear()===d.getFullYear()&&od.getMonth()===d.getMonth()&&od.getDate()===d.getDate();
}).reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(d.toLocaleDateString("en-US",{weekday:"short"}));
revenue.push(amount);
profit.push(Math.floor(amount*.3));
}
}else if(revenueProfitRange==="month"){
for(let i=3;i>=0;i--){
const end=new Date(now);
end.setHours(23,59,59,999);
end.setDate(now.getDate()-i*7);

const start=new Date(end);
start.setHours(0,0,0,0);
start.setDate(end.getDate()-6);

const amount=paidOrders.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od>=start&&od<=end;
}).reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(`Week ${4-i}`);
revenue.push(amount);
profit.push(Math.floor(amount*.3));
}
}else{
for(let i=11;i>=0;i--){
const d=new Date(now.getFullYear(),now.getMonth()-i,1);

const amount=paidOrders.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getMonth()===d.getMonth()&&od.getFullYear()===d.getFullYear();
}).reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(d.toLocaleDateString("en-US",{month:"short"}));
revenue.push(amount);
profit.push(Math.floor(amount*.3));
}
}

return{labels,revenue,profit};
},[rawOrders,revenueProfitRange]);

const categoryChart=useMemo(()=>{
return{
labels:categoryPerformance.map((item)=>item.category),
data:categoryPerformance.map((item)=>item.unitsSold)
};
},[categoryPerformance]);

const productTotalPages=Math.max(1,Math.ceil(productPerformance.length/PAGE_SIZE));
const lowStockTotalPages=Math.max(1,Math.ceil(lowStockProducts.length/PAGE_SIZE));
const recentOrdersTotalPages=Math.max(1,Math.ceil(recentOrders.length/PAGE_SIZE));

const paginatedProducts=useMemo(()=>{
const start=(productPage-1)*PAGE_SIZE;
return productPerformance.slice(start,start+PAGE_SIZE);
},[productPerformance,productPage]);

const paginatedLowStock=useMemo(()=>{
const start=(lowStockPage-1)*PAGE_SIZE;
return lowStockProducts.slice(start,start+PAGE_SIZE);
},[lowStockProducts,lowStockPage]);

const paginatedRecentOrders=useMemo(()=>{
const start=(recentOrdersPage-1)*PAGE_SIZE;
return recentOrders.slice(start,start+PAGE_SIZE);
},[recentOrders,recentOrdersPage]);

useEffect(()=>{
setProductPage(1);
},[productRange]);

useEffect(()=>{
setRecentOrdersPage(1);
},[recentOrdersRange]);

useEffect(()=>{
if(productPage>productTotalPages)setProductPage(productTotalPages);
},[productPage,productTotalPages]);

useEffect(()=>{
if(lowStockPage>lowStockTotalPages)setLowStockPage(lowStockTotalPages);
},[lowStockPage,lowStockTotalPages]);

useEffect(()=>{
if(recentOrdersPage>recentOrdersTotalPages)setRecentOrdersPage(recentOrdersTotalPages);
},[recentOrdersPage,recentOrdersTotalPages]);

const dataFingerprint=useMemo(()=>{
if(!rawProducts.length&&!rawOrders.length)return"";

const products=rawProducts.map((product)=>({
id:String(product._id||""),
name:product.name||"",
category:product.category||"",
price:Number(product.price)||0,
stock:getProductTotalStock(product),
updatedAt:product.updatedAt||""
})).sort((a,b)=>a.id.localeCompare(b.id));

const orders=rawOrders.map((order)=>({
id:String(order._id||""),
amount:Number(order.amount)||0,
payment:order.payment,
paymentStatus:order.paymentStatus||"",
paymentMethod:order.paymentMethod||"",
status:order.status||"",
updatedAt:order.updatedAt||"",
items:(order.items||[]).map((item)=>({
productId:String(item?.productId?._id||item?.productId||item?.product?._id||item?.product||""),
name:item?.name||item?.productName||"",
quantity:Number(item?.quantity??item?.qty??1)||0,
price:Number(item?.price)||0
}))
})).sort((a,b)=>a.id.localeCompare(b.id));

const text=JSON.stringify({products,orders,users:rawUsersCount});
let hash=2166136261;

for(let i=0;i<text.length;i++){
hash^=text.charCodeAt(i);
hash=Math.imul(hash,16777619);
}

return(hash>>>0).toString(16);
},[rawProducts,rawOrders,rawUsersCount]);

useEffect(()=>{
if(loading||!dataFingerprint)return;

const cacheKey="saintSalesInsightV2";

try{
const cached=JSON.parse(localStorage.getItem(cacheKey)||"null");

if(cached?.fingerprint===dataFingerprint&&cached?.insight){
setSalesInsight(cached.insight);
setInsightError("");
return;
}
}catch(error){
console.error("[SALES INSIGHT CACHE]",error);
}

if(insightRequestRef.current===dataFingerprint)return;
insightRequestRef.current=dataFingerprint;

const generateInsight=async()=>{
try{
setInsightLoading(true);
setInsightError("");

const token=localStorage.getItem("token")||"";

const response=await axios.post(
`${backendUrl}/api/ai/sales-insight`,
{
fingerprint:dataFingerprint,
overview:stats,
productPerformance:productPerformance.map((item)=>({
name:item.name,
category:item.category,
unitsSold:item.sold,
revenue:item.revenue,
stock:item.stock,
price:item.price
})),
categoryPerformance,
lowStockProducts,
salesTrend
},
{
headers:{Authorization:`Bearer ${token}`},
timeout:60000
}
);

if(!response?.data?.success){
throw new Error(response?.data?.message||"Unable to generate Sales Insight.");
}

const returned=response.data.insight;
let insight="";

if(typeof returned==="string"){
insight=returned.trim();
}else if(returned&&typeof returned==="object"){
if(returned.executiveSummary){
insight=String(returned.executiveSummary).trim();
}else{
const pieces=[
...(Array.isArray(returned.keyInsights)?returned.keyInsights:[]),
...(Array.isArray(returned.inventoryInsights)?returned.inventoryInsights:[]),
...(Array.isArray(returned.recommendations)?returned.recommendations:[])
];
insight=pieces.join(" ");
}
}

if(!insight)throw new Error("No Sales Insight was returned.");

setSalesInsight(insight);

localStorage.setItem(cacheKey,JSON.stringify({
fingerprint:dataFingerprint,
insight,
generatedAt:response.data.generatedAt||new Date().toISOString()
}));
}catch(error){
console.error("[SALES INSIGHT]",error?.response?.data||error);
setInsightError(error?.response?.data?.message||"Sales Insight is currently unavailable.");
}finally{
setInsightLoading(false);
}
};

generateInsight();
},[loading,dataFingerprint,stats,productPerformance,categoryPerformance,lowStockProducts,salesTrend]);

const handlePrint=()=>{
const params=new URLSearchParams({
overview:overviewRange,
salesTrend:salesTrendRange,
revenueProfit:revenueProfitRange,
category:categoryRange,
product:productRange,
recentOrders:recentOrdersRange
});

navigate(`/sales-report-print?${params.toString()}`);
};

const RangeSelect=({value,onChange})=>(
<select
value={value}
onChange={(e)=>onChange(e.target.value)}
className="rounded-[5px] border border-black/10 bg-[#FAFAF8] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#0A0D17] outline-none"
>
{RANGE_OPTIONS.map((item)=>(
<option key={item.value} value={item.value}>{item.label}</option>
))}
</select>
);

const Pagination=({page,totalPages,totalItems,onChange})=>{
if(!totalItems)return null;

const pages=[];
let start=Math.max(1,page-2);
let end=Math.min(totalPages,start+4);

if(end-start<4){
start=Math.max(1,end-4);
}

for(let i=start;i<=end;i++){
pages.push(i);
}

const first=(page-1)*PAGE_SIZE+1;
const last=Math.min(page*PAGE_SIZE,totalItems);

return(
<div className="flex flex-col gap-3 border-t border-black/10 bg-[#FAFAF8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
<p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0A0D17]/45">
Showing {first}-{last} of {totalItems}
</p>

<div className="flex flex-wrap items-center gap-1.5">
<button
type="button"
disabled={page===1}
onClick={()=>onChange(page-1)}
className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-black/10 bg-white text-[#0A0D17] transition hover:bg-[#0A0D17] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
>
<FaChevronLeft size={9}/>
</button>

{start>1&&(
<>
<button
type="button"
onClick={()=>onChange(1)}
className="h-8 min-w-8 rounded-[4px] border border-black/10 bg-white px-2 text-[9px] font-black"
>
1
</button>
{start>2&&<span className="px-1 text-[9px] text-gray-400">...</span>}
</>
)}

{pages.map((number)=>(
<button
key={number}
type="button"
onClick={()=>onChange(number)}
className={`h-8 min-w-8 rounded-[4px] border px-2 text-[9px] font-black transition ${
number===page
?"border-[#0A0D17] bg-[#0A0D17] text-white"
:"border-black/10 bg-white text-[#0A0D17] hover:bg-black/5"
}`}
>
{number}
</button>
))}

{end<totalPages&&(
<>
{end<totalPages-1&&<span className="px-1 text-[9px] text-gray-400">...</span>}
<button
type="button"
onClick={()=>onChange(totalPages)}
className="h-8 min-w-8 rounded-[4px] border border-black/10 bg-white px-2 text-[9px] font-black"
>
{totalPages}
</button>
</>
)}

<button
type="button"
disabled={page===totalPages}
onClick={()=>onChange(page+1)}
className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-black/10 bg-white text-[#0A0D17] transition hover:bg-[#0A0D17] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
>
<FaChevronRight size={9}/>
</button>
</div>
</div>
);
};

const lineOptions={
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{display:false},
tooltip:{backgroundColor:"#0A0D17",titleColor:"#d4b483",bodyColor:"#fff"}
},
scales:{
y:{beginAtZero:true,grid:{color:"rgba(10,13,23,.06)"},ticks:{color:"#6b7280",font:{size:10}}},
x:{grid:{display:false},ticks:{color:"#6b7280",font:{size:9},maxRotation:0,autoSkip:true,maxTicksLimit:8}}
}
};

const barOptions={
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{position:"bottom",labels:{boxWidth:10,usePointStyle:true,font:{size:10}}}
},
scales:{
y:{beginAtZero:true,grid:{color:"rgba(10,13,23,.06)"}},
x:{grid:{display:false}}
}
};

const doughnutOptions={
responsive:true,
maintainAspectRatio:false,
cutout:"68%",
plugins:{
legend:{
position:"bottom",
labels:{boxWidth:9,usePointStyle:true,font:{size:9},padding:12}
}
}
};

if(loading){
return(
<div className="flex min-h-screen items-center justify-center bg-[#F3F2EE] pt-24 font-['Montserrat']">
<div className="text-center">
<div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#0A0D17]/15 border-t-[#0A0D17]"/>
<p className="text-xs font-black uppercase tracking-[0.2em] text-[#0A0D17]">Loading Sales Report</p>
</div>
</div>
);
}

return(
<div className="min-w-0 bg-transparent px-2.5 pb-5 pt-20 font-['Montserrat'] text-[#0A0D17] sm:px-3 sm:pt-24">
<div className="mx-auto max-w-[1600px] space-y-4">

<div className="relative overflow-hidden rounded-[5px] bg-[#0A0D17] px-5 py-6 text-white shadow-[0_18px_60px_rgba(0,0,0,.08)] sm:px-7 sm:py-7">
<div className="absolute right-0 top-0 h-full w-1 bg-[#d4b483]"/>

<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-[9px] font-black uppercase tracking-[0.34em] text-white/45">Saint Clothing Admin</p>
<h1 className="mt-3 text-[28px] font-black uppercase tracking-[-0.04em] sm:text-[36px]">Sales Report</h1>
<p className="mt-1 text-[11px] text-white/45">Last updated: {lastUpdated?lastUpdated.toLocaleString():"-"}</p>
</div>

<div className="flex flex-wrap gap-2">
<button
type="button"
onClick={()=>fetchData(false)}
disabled={refreshing}
className="inline-flex items-center gap-2 rounded-[5px] border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black transition hover:bg-white/20 disabled:opacity-50"
>
<FaSyncAlt className={refreshing?"animate-spin":""}/>
{refreshing?"Refreshing...":"Refresh"}
</button>

<button
type="button"
onClick={handlePrint}
className="inline-flex items-center gap-2 rounded-[5px] bg-white px-4 py-2.5 text-sm font-black text-[#0A0D17] transition hover:bg-[#F2F2F2]"
>
<FaPrint/>
Export Sales Report
</button>
</div>
</div>
</div>

{fetchError&&(
<div className="rounded-[5px] border border-red-200 bg-red-50 px-4 py-3">
<p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-700">Some report data could not be loaded</p>
<p className="mt-1 text-xs font-semibold leading-5 text-red-600">{fetchError}</p>
</div>
)}

<div className={`${panelBg} overflow-hidden rounded-[5px]`}>
<div className="bg-[#0A0D17] px-5 py-3.5">
<h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">Sales Insight</h2>
</div>

<div className="px-5 py-5">
{insightLoading&&!salesInsight?(
<div className="flex items-center gap-3">
<div className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-[#0A0D17]"/>
<p className="text-sm font-semibold text-gray-500">Analyzing current sales and inventory data...</p>
</div>
):salesInsight?(
<p className="text-sm font-medium leading-7 text-[#0A0D17]/70">{salesInsight}</p>
):(
<p className="text-sm font-medium text-gray-500">
{insightError||(rawProducts.length||rawOrders.length?"Sales Insight is currently unavailable.":"Sales Insight will appear when report data is available.")}
</p>
)}
</div>
</div>

<div className={`${panelBg} rounded-[5px] p-5`}>
<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
<div>
<p className={labelClass}>Overall Performance</p>
<h2 className="mt-1 text-xl font-black uppercase tracking-tight">Sales Overview</h2>
</div>
<RangeSelect value={overviewRange} onChange={setOverviewRange}/>
</div>

<div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
{[
["Revenue",formatMoney(stats.totalRevenue),<FaMoneyBillWave/>],
["Orders",stats.totalOrders,<FaShoppingCart/>],
["Paid Orders",stats.paidOrders,<FaShoppingCart/>],
["Units Sold",stats.totalUnitsSold,<FaChartLine/>],
["Net Profit",formatMoney(stats.netProfit),<FaMoneyBillWave/>],
["Products",stats.totalProducts,<FaBoxOpen/>],
["Users",stats.totalUsers,<FaUsers/>]
].map(([title,value,icon],index)=>(
<div key={title} className={`relative min-w-0 overflow-hidden rounded-[5px] border border-black/10 p-4 ${index===0?"bg-[#0A0D17] text-white":"bg-[#FAFAF8]"}`}>
<div className="flex items-center justify-between gap-2">
<p className={`truncate text-[8px] font-black uppercase tracking-[0.16em] ${index===0?"text-white/45":"text-[#0A0D17]/40"}`}>{title}</p>
<span className={index===0?"text-[#d4b483]":"text-[#0A0D17]/35"}>{icon}</span>
</div>
<p className="mt-4 truncate text-lg font-black tracking-tight">{value}</p>
{index===0&&<div className="absolute bottom-0 left-0 h-[3px] w-full bg-[#d4b483]"/>}
</div>
))}
</div>
</div>

<div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
<div className={`${panelBg} min-w-0 rounded-[5px] p-5`}>
<div className="mb-5 flex items-center justify-between gap-3">
<div>
<p className={labelClass}>Revenue Movement</p>
<h2 className="mt-1 text-lg font-black uppercase">Sales Trend</h2>
</div>
<RangeSelect value={salesTrendRange} onChange={setSalesTrendRange}/>
</div>

<div className="h-[300px] min-w-0">
<Line
options={lineOptions}
data={{
labels:salesTrend.labels,
datasets:[{
label:"Sales",
data:salesTrend.data,
borderColor:"#0A0D17",
backgroundColor:"rgba(212,180,131,.20)",
pointBackgroundColor:"#d4b483",
pointBorderColor:"#0A0D17",
pointRadius:2,
borderWidth:2,
fill:true,
tension:.35
}]
}}
/>
</div>
</div>

<div className={`${panelBg} min-w-0 rounded-[5px] p-5`}>
<div className="mb-5 flex items-center justify-between gap-3">
<div>
<p className={labelClass}>Financial Performance</p>
<h2 className="mt-1 text-lg font-black uppercase">Revenue & Profit</h2>
</div>
<RangeSelect value={revenueProfitRange} onChange={setRevenueProfitRange}/>
</div>

<div className="h-[300px] min-w-0">
<Bar
options={barOptions}
data={{
labels:revenueProfit.labels,
datasets:[
{label:"Revenue",data:revenueProfit.revenue,backgroundColor:"#0A0D17",borderRadius:2},
{label:"Estimated Profit",data:revenueProfit.profit,backgroundColor:"#d4b483",borderRadius:2}
]
}}
/>
</div>
</div>
</div>

<div className={`${panelBg} overflow-hidden rounded-[5px]`}>
<div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#FAFAF8] px-5 py-4">
<div>
<p className={labelClass}>Product Movement</p>
<h2 className="mt-1 text-xl font-black uppercase tracking-tight">Product Sales Performance</h2>
<p className="mt-1 text-[10px] font-semibold text-gray-500">All products are displayed, including products with zero sales.</p>
</div>
<RangeSelect value={productRange} onChange={setProductRange}/>
</div>

<div className="w-full overflow-x-auto">
<table className="w-full min-w-[850px] border-collapse text-left">
<thead className="bg-[#0A0D17] text-white">
<tr>
<th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider">Product</th>
<th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider">Category</th>
<th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-wider">Price</th>
<th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-wider">Units Sold</th>
<th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-wider">Revenue</th>
<th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-wider">Stock</th>
</tr>
</thead>

<tbody>
{paginatedProducts.length?paginatedProducts.map((item,index)=>(
<tr key={item._id||index} className={index%2===0?"bg-white":"bg-[#FAFAF8]"}>
<td className="border-b border-black/5 px-5 py-3 text-xs font-black">{item.name}</td>
<td className="border-b border-black/5 px-5 py-3 text-xs font-medium text-gray-500">{item.category}</td>
<td className="border-b border-black/5 px-5 py-3 text-right text-xs font-bold">{formatMoney(item.price)}</td>
<td className="border-b border-black/5 px-5 py-3 text-right text-xs font-black">{item.sold}</td>
<td className="border-b border-black/5 px-5 py-3 text-right text-xs font-black">{formatMoney(item.revenue)}</td>
<td className="border-b border-black/5 px-5 py-3 text-right">
<span className={`inline-flex min-w-[38px] justify-center rounded-[3px] px-2 py-1 text-[9px] font-black ${item.stock<=5?"bg-red-50 text-red-600":"bg-[#0A0D17]/5 text-[#0A0D17]"}`}>
{item.stock}
</span>
</td>
</tr>
)):(
<tr>
<td colSpan="6" className="px-5 py-10 text-center text-xs font-bold uppercase tracking-wider text-gray-400">No products found</td>
</tr>
)}
</tbody>
</table>
</div>

<Pagination page={productPage} totalPages={productTotalPages} totalItems={productPerformance.length} onChange={setProductPage}/>
</div>

<div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
<div className={`${panelBg} min-w-0 overflow-hidden rounded-[5px]`}>
<div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#FAFAF8] px-5 py-4">
<div>
<p className={labelClass}>Category Performance</p>
<h2 className="mt-1 text-lg font-black uppercase">Sales By Category</h2>
</div>
<RangeSelect value={categoryRange} onChange={setCategoryRange}/>
</div>

<div className="grid min-w-0 grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(220px,.8fr)_minmax(0,1.2fr)] lg:items-center">
<div className="mx-auto h-[260px] w-full max-w-[320px]">
<Doughnut
options={doughnutOptions}
data={{
labels:categoryChart.labels.length?categoryChart.labels:["No Data"],
datasets:[{
data:categoryChart.data.some((value)=>value>0)?categoryChart.data:[1],
backgroundColor:["#0A0D17","#d4b483","#4b4e58","#9d825d","#d9d7d1","#6b7280"],
borderWidth:0
}]
}}
/>
</div>

<div className="min-w-0 overflow-x-auto rounded-[5px] border border-black/10">
<table className="w-full min-w-[430px] text-xs">
<thead>
<tr className="bg-[#0A0D17] text-white">
<th className="px-3 py-2.5 text-left text-[8px] font-black uppercase tracking-wider">Category</th>
<th className="px-3 py-2.5 text-right text-[8px] font-black uppercase tracking-wider">Products</th>
<th className="px-3 py-2.5 text-right text-[8px] font-black uppercase tracking-wider">Units</th>
<th className="px-3 py-2.5 text-right text-[8px] font-black uppercase tracking-wider">Revenue</th>
</tr>
</thead>

<tbody>
{categoryPerformance.map((item,index)=>(
<tr key={item.category} className={index%2===0?"bg-white":"bg-[#FAFAF8]"}>
<td className="border-b border-black/5 px-3 py-3 font-bold">{item.category}</td>
<td className="border-b border-black/5 px-3 py-3 text-right font-black">{item.products}</td>
<td className="border-b border-black/5 px-3 py-3 text-right font-black">{item.unitsSold}</td>
<td className="border-b border-black/5 px-3 py-3 text-right font-black">{formatMoney(item.revenue)}</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
</div>

<div className={`${panelBg} min-w-0 overflow-hidden rounded-[5px]`}>
<div className="border-b border-black/10 bg-[#FAFAF8] px-5 py-4">
<p className={labelClass}>Inventory Monitoring</p>
<div className="mt-1 flex items-center gap-2">
<h2 className="text-lg font-black uppercase">Low Stock Alert</h2>
{lowStockProducts.length>0&&<FaExclamationTriangle className="text-[#d4b483]"/>}
</div>
</div>

<div className="w-full overflow-x-auto">
<table className="w-full min-w-[500px] text-xs">
<thead className="bg-[#0A0D17] text-white">
<tr>
<th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-wider">Product</th>
<th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-wider">Category</th>
<th className="px-4 py-3 text-right text-[8px] font-black uppercase tracking-wider">Stock</th>
</tr>
</thead>

<tbody>
{paginatedLowStock.length?paginatedLowStock.map((item,index)=>(
<tr key={item._id} className={index%2===0?"bg-white":"bg-[#FAFAF8]"}>
<td className="border-b border-black/5 px-4 py-3 font-black">{item.name}</td>
<td className="border-b border-black/5 px-4 py-3 font-medium text-gray-500">{item.category}</td>
<td className="border-b border-black/5 px-4 py-3 text-right">
<span className="rounded-[3px] bg-red-50 px-2 py-1 text-[9px] font-black text-red-600">{item.stock}</span>
</td>
</tr>
)):(
<tr>
<td colSpan="3" className="px-4 py-10 text-center text-xs font-bold text-gray-400">No products are currently low in stock.</td>
</tr>
)}
</tbody>
</table>
</div>

<Pagination page={lowStockPage} totalPages={lowStockTotalPages} totalItems={lowStockProducts.length} onChange={setLowStockPage}/>
</div>
</div>

<div className={`${panelBg} overflow-hidden rounded-[5px]`}>
<div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#FAFAF8] px-5 py-4">
<div>
<p className={labelClass}>Order Activity</p>
<h2 className="mt-1 text-lg font-black uppercase">Recent Orders</h2>
</div>
<RangeSelect value={recentOrdersRange} onChange={setRecentOrdersRange}/>
</div>

<div className="w-full overflow-x-auto">
<table className="w-full min-w-[950px] text-left text-xs">
<thead className="bg-[#0A0D17] text-white">
<tr>
<th className="px-4 py-3 text-[8px] font-black uppercase tracking-wider">Order ID</th>
<th className="px-4 py-3 text-[8px] font-black uppercase tracking-wider">Customer</th>
<th className="px-4 py-3 text-right text-[8px] font-black uppercase tracking-wider">Amount</th>
<th className="px-4 py-3 text-[8px] font-black uppercase tracking-wider">Payment</th>
<th className="px-4 py-3 text-[8px] font-black uppercase tracking-wider">Payment Status</th>
<th className="px-4 py-3 text-[8px] font-black uppercase tracking-wider">Order Status</th>
<th className="px-4 py-3 text-[8px] font-black uppercase tracking-wider">Date</th>
</tr>
</thead>

<tbody>
{paginatedRecentOrders.length?paginatedRecentOrders.map((order,index)=>(
<tr key={order._id||index} className={index%2===0?"bg-white":"bg-[#FAFAF8]"}>
<td className="border-b border-black/5 px-4 py-3 font-black">#{String(order._id||"").slice(-6).toUpperCase()}</td>
<td className="border-b border-black/5 px-4 py-3 font-semibold">
{`${order.address?.firstName||""} ${order.address?.lastName||""}`.trim()||order.customerName||order.userId?.name||"Customer"}
</td>
<td className="border-b border-black/5 px-4 py-3 text-right font-black">{formatMoney(order.amount)}</td>
<td className="border-b border-black/5 px-4 py-3 font-semibold">{order.paymentMethod||"COD"}</td>
<td className="border-b border-black/5 px-4 py-3">
<span className={`rounded-[3px] px-2 py-1 text-[8px] font-black uppercase ${isPaidOrder(order)?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>
{isPaidOrder(order)?"Paid":order.paymentStatus||"Pending"}
</span>
</td>
<td className="border-b border-black/5 px-4 py-3 font-semibold">{order.status||"Pending"}</td>
<td className="border-b border-black/5 px-4 py-3 text-[10px] text-gray-500">
{order.date||order.createdAt?new Date(order.date||order.createdAt).toLocaleString():"-"}
</td>
</tr>
)):(
<tr>
<td colSpan="7" className="px-4 py-10 text-center text-xs font-bold uppercase tracking-wider text-gray-400">No orders in the selected period</td>
</tr>
)}
</tbody>
</table>
</div>

<Pagination page={recentOrdersPage} totalPages={recentOrdersTotalPages} totalItems={recentOrders.length} onChange={setRecentOrdersPage}/>
</div>

</div>
</div>
);
};

export default SalesReport;