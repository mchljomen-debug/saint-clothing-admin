import React,{useEffect,useMemo,useRef,useState}from"react";
import axios from"axios";
import{Line,Bar,Doughnut}from"react-chartjs-2";
import{useNavigate}from"react-router-dom";
import{backendUrl,currency}from"../App";
import{FaPrint,FaSyncAlt,FaChartLine,FaShoppingCart,FaBoxOpen,FaUsers,FaMoneyBillWave,FaExclamationTriangle}from"react-icons/fa";
import{Chart as ChartJS,CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Tooltip,Legend,Filler}from"chart.js";

ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Tooltip,Legend,Filler);

const FIXED_CATEGORIES=["Tshirt","Long Sleeve","Jorts","Mesh Shorts","Crop Jersey"];

const RANGE_OPTIONS=[
{value:"today",label:"Today"},
{value:"week",label:"Week"},
{value:"month",label:"Month"},
{value:"year",label:"Year"},
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

const[rawProducts,setRawProducts]=useState([]);
const[rawOrders,setRawOrders]=useState([]);
const[rawUsersCount,setRawUsersCount]=useState(0);
const[loading,setLoading]=useState(true);
const[refreshing,setRefreshing]=useState(false);
const[lastUpdated,setLastUpdated]=useState(null);

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
end:new Date(now.getFullYear(),now.getMonth()+1,1),
};
};

const filterOrdersByRange=(orders,range)=>{
const{start,end}=getDateWindowForRange(range);

return orders.filter((order)=>{
const date=new Date(order.date||order.createdAt);
return!Number.isNaN(date.getTime())&&date>=start&&date<end;
});
};

const fetchData=async(silent=false)=>{
try{
if(!silent)setLoading(true);
setRefreshing(true);

const token=localStorage.getItem("token")||"";
const role=localStorage.getItem("role")||"";
const branch=localStorage.getItem("branch")||"";

const[productRes,ordersRes,usersRes]=await Promise.all([
axios.get(`${backendUrl}/api/product/list`),
axios.get(`${backendUrl}/api/order/list`,{
headers:{Authorization:`Bearer ${token}`},
}),
role==="admin"
?axios.get(`${backendUrl}/api/admin/users`,{
headers:{Authorization:`Bearer ${token}`},
}).catch(()=>({data:{users:[]}}))
:Promise.resolve({data:{users:[]}}),
]);

let products=productRes?.data?.success?productRes.data.products||[]:[];
let orders=ordersRes?.data?.success?ordersRes.data.orders||[]:[];
const users=usersRes?.data?.users||[];

if(role!=="admin"&&branch){
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

console.log("[SALES REPORT] Products:",products.length);
console.log("[SALES REPORT] Orders:",orders.length);
console.log("[SALES REPORT] Users:",users.length);
console.log("[SALES REPORT] Product response:",productRes?.data);
console.log("[SALES REPORT] Order response:",ordersRes?.data);

setRawProducts(products);
setRawOrders(orders);
setRawUsersCount(users.length);
setLastUpdated(new Date());
}catch(error){
console.error("[SALES REPORT] FETCH ERROR:",error?.response?.data||error?.message||error);
}finally{
if(!silent)setLoading(false);
setRefreshing(false);
}
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
const totalRevenue=overviewPaidOrders.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

const totalUnitsSold=overviewPaidOrders.reduce((sum,order)=>{
return sum+(order.items||[]).reduce((itemSum,item)=>itemSum+(Number(item.quantity)||0),0);
},0);

const netProfit=Math.floor(totalRevenue*0.3);

return{
totalRevenue,
totalOrders:overviewOrders.length,
paidOrders:overviewPaidOrders.length,
totalUnitsSold,
totalProducts:rawProducts.length,
totalUsers:rawUsersCount,
netProfit,
netProfitMargin:totalRevenue>0?Math.round((netProfit/totalRevenue)*100):0,
lowStockCount:rawProducts.filter((product)=>getProductTotalStock(product)<=5).length,
};
},[overviewOrders,overviewPaidOrders,rawProducts,rawUsersCount]);

const productPerformance=useMemo(()=>{
const paidOrders=filterOrdersByRange(rawOrders,productRange).filter(isPaidOrder);
const map={};

rawProducts.forEach((product)=>{
map[String(product._id)]={
_id:product._id,
name:product.name||"Unnamed Product",
category:normalizeCategory(product.category),
price:Number(product.price)||0,
stock:getProductTotalStock(product),
sold:0,
revenue:0,
};
});

paidOrders.forEach((order)=>{
(order.items||[]).forEach((item)=>{
const itemProductId=String(item.productId||item.product||"");
const itemName=String(item.name||item.productName||"").trim();

let product=null;

if(itemProductId){
product=rawProducts.find((p)=>String(p._id)===itemProductId);
}

if(!product&&itemName){
product=rawProducts.find((p)=>String(p.name||"").trim().toLowerCase()===itemName.toLowerCase());
}

const key=product?String(product._id):itemProductId||`name-${itemName}`;

if(!key)return;

if(!map[key]){
map[key]={
_id:key,
name:itemName||"Unknown Product",
category:normalizeCategory(item.category||"Unknown"),
price:Number(item.price)||0,
stock:0,
sold:0,
revenue:0,
};
}

const qty=Number(item.quantity)||0;
const price=Number(item.price??product?.price??map[key].price)||0;

map[key].sold+=qty;
map[key].revenue+=qty*price;
});
});

return Object.values(map).sort((a,b)=>b.revenue-a.revenue||b.sold-a.sold);
},[rawProducts,rawOrders,productRange]);

const categoryPerformance=useMemo(()=>{
const paidOrders=filterOrdersByRange(rawOrders,categoryRange).filter(isPaidOrder);
const map={};

FIXED_CATEGORIES.forEach((category)=>{
map[category]={category,unitsSold:0,revenue:0};
});

paidOrders.forEach((order)=>{
(order.items||[]).forEach((item)=>{
const itemProductId=String(item.productId||item.product||"");
const itemName=String(item.name||item.productName||"").trim();

let product=rawProducts.find((p)=>String(p._id)===itemProductId);

if(!product&&itemName){
product=rawProducts.find((p)=>String(p.name||"").trim().toLowerCase()===itemName.toLowerCase());
}

const category=normalizeCategory(product?.category||item.category||"Unknown");
const qty=Number(item.quantity)||0;
const price=Number(item.price??product?.price)||0;

if(!map[category]){
map[category]={category,unitsSold:0,revenue:0};
}

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
price:Number(product.price)||0,
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

const amount=paidOrders
.filter((order)=>new Date(order.date||order.createdAt).getHours()===i)
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

data.push(amount);
}
}else if(salesTrendRange==="week"){
for(let i=6;i>=0;i--){
const d=new Date(now);
d.setDate(now.getDate()-i);

labels.push(d.toLocaleDateString("en-US",{weekday:"short"}));

const amount=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getFullYear()===d.getFullYear()&&od.getMonth()===d.getMonth()&&od.getDate()===d.getDate();
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

data.push(amount);
}
}else if(salesTrendRange==="month"){
for(let i=29;i>=0;i--){
const d=new Date(now);
d.setDate(now.getDate()-i);

labels.push(d.toLocaleDateString("en-US",{month:"short",day:"numeric"}));

const amount=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getFullYear()===d.getFullYear()&&od.getMonth()===d.getMonth()&&od.getDate()===d.getDate();
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

data.push(amount);
}
}else{
for(let i=11;i>=0;i--){
const d=new Date(now.getFullYear(),now.getMonth()-i,1);

labels.push(d.toLocaleDateString("en-US",{month:"short"}));

const amount=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getMonth()===d.getMonth()&&od.getFullYear()===d.getFullYear();
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

data.push(amount);
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
const amount=paidOrders
.filter((order)=>new Date(order.date||order.createdAt).getHours()===i)
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(`${i}:00`);
revenue.push(amount);
profit.push(Math.floor(amount*0.3));
}
}else if(revenueProfitRange==="week"){
for(let i=6;i>=0;i--){
const d=new Date(now);
d.setDate(now.getDate()-i);

const amount=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getFullYear()===d.getFullYear()&&od.getMonth()===d.getMonth()&&od.getDate()===d.getDate();
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(d.toLocaleDateString("en-US",{weekday:"short"}));
revenue.push(amount);
profit.push(Math.floor(amount*0.3));
}
}else if(revenueProfitRange==="month"){
for(let i=3;i>=0;i--){
const end=new Date(now);
end.setHours(23,59,59,999);
end.setDate(now.getDate()-i*7);

const start=new Date(end);
start.setHours(0,0,0,0);
start.setDate(end.getDate()-6);

const amount=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od>=start&&od<=end;
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(`Week ${4-i}`);
revenue.push(amount);
profit.push(Math.floor(amount*0.3));
}
}else{
for(let i=11;i>=0;i--){
const d=new Date(now.getFullYear(),now.getMonth()-i,1);

const amount=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getMonth()===d.getMonth()&&od.getFullYear()===d.getFullYear();
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(d.toLocaleDateString("en-US",{month:"short"}));
revenue.push(amount);
profit.push(Math.floor(amount*0.3));
}
}

return{labels,revenue,profit};
},[rawOrders,revenueProfitRange]);

const categoryChart=useMemo(()=>{
const labels=FIXED_CATEGORIES;
const data=labels.map((category)=>{
return categoryPerformance.find((item)=>item.category===category)?.unitsSold||0;
});

return{labels,data};
},[categoryPerformance]);

const createFingerprint=()=>{
const products=rawProducts.map((product)=>({
id:product._id,
name:product.name,
category:product.category,
price:product.price,
stock:getProductTotalStock(product),
updatedAt:product.updatedAt||"",
}));

const orders=rawOrders.map((order)=>({
id:order._id,
amount:order.amount,
payment:order.payment,
paymentStatus:order.paymentStatus,
paymentMethod:order.paymentMethod,
status:order.status,
updatedAt:order.updatedAt||"",
items:(order.items||[]).map((item)=>({
productId:item.productId||item.product,
name:item.name||item.productName,
quantity:item.quantity,
price:item.price,
})),
}));

const text=JSON.stringify({products,orders});
let hash=0;

for(let i=0;i<text.length;i++){
hash=(hash*31+text.charCodeAt(i))|0;
}

return String(hash);
};

useEffect(()=>{
if(loading)return;
if(!rawProducts.length&&!rawOrders.length)return;

const fingerprint=createFingerprint();
const cacheKey="saintSalesInsight";

try{
const cached=JSON.parse(localStorage.getItem(cacheKey)||"null");

if(cached?.fingerprint===fingerprint&&cached?.insight){
setSalesInsight(cached.insight);
setInsightError("");
return;
}
}catch(error){
console.error("[SALES INSIGHT CACHE]",error);
}

if(insightRequestRef.current===fingerprint)return;
insightRequestRef.current=fingerprint;

const generateInsight=async()=>{
try{
setInsightLoading(true);
setInsightError("");

const token=localStorage.getItem("token")||"";

const response=await axios.post(
`${backendUrl}/api/ai/sales-insight`,
{
overview:stats,
productPerformance:productPerformance.map((item)=>({
name:item.name,
category:item.category,
unitsSold:item.sold,
revenue:item.revenue,
stock:item.stock,
price:item.price,
})),
categoryPerformance,
lowStockProducts:lowStockProducts.map((item)=>({
name:item.name,
category:item.category,
stock:item.stock,
price:item.price,
})),
salesTrend,
},
{
headers:{Authorization:`Bearer ${token}`},
timeout:60000,
}
);

if(!response.data?.success){
throw new Error(response.data?.message||"Unable to generate Sales Insight.");
}

const insight=String(response.data.insight||"").trim();

if(!insight){
throw new Error("No Sales Insight was returned.");
}

setSalesInsight(insight);

localStorage.setItem(cacheKey,JSON.stringify({
fingerprint,
insight,
generatedAt:response.data.generatedAt||new Date().toISOString(),
}));
}catch(error){
console.error("[SALES INSIGHT]",error?.response?.data||error);

try{
const cached=JSON.parse(localStorage.getItem("saintSalesInsight")||"null");
if(cached?.insight)setSalesInsight(cached.insight);
}catch{}

setInsightError(error?.response?.data?.message||"Sales Insight is temporarily unavailable.");
}finally{
setInsightLoading(false);
}
};

generateInsight();
},[
loading,
rawProducts,
rawOrders,
stats.totalRevenue,
stats.totalOrders,
stats.totalUnitsSold,
productPerformance,
categoryPerformance,
lowStockProducts,
salesTrend
]);

const handlePrint=()=>{
const cachedInsight=localStorage.getItem("saintSalesInsight");

if(cachedInsight){
sessionStorage.setItem("saintSalesInsight",cachedInsight);
}

const params=new URLSearchParams({
overview:overviewRange,
salesTrend:salesTrendRange,
revenueProfit:revenueProfitRange,
category:categoryRange,
product:productRange,
recentOrders:recentOrdersRange,
});

navigate(`/sales-report-print?${params.toString()}`);
};

const RangeSelect=({value,onChange})=>(
<select
value={value}
onChange={(e)=>onChange(e.target.value)}
className="rounded-[4px] border border-black/10 bg-[#FAFAF8] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#0A0D17] outline-none"
>
{RANGE_OPTIONS.map((item)=>(
<option key={item.value} value={item.value}>{item.label}</option>
))}
</select>
);

const lineOptions={
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{display:false},
tooltip:{
backgroundColor:"#0A0D17",
titleColor:"#d4b483",
bodyColor:"#fff",
},
},
scales:{
y:{
beginAtZero:true,
grid:{color:"rgba(10,13,23,.06)"},
ticks:{color:"#6b7280",font:{size:10}},
},
x:{
grid:{display:false},
ticks:{color:"#6b7280",font:{size:9},maxRotation:0,autoSkip:true,maxTicksLimit:8},
},
},
};

const barOptions={
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{
position:"bottom",
labels:{boxWidth:10,usePointStyle:true,font:{size:10}},
},
},
scales:{
y:{beginAtZero:true,grid:{color:"rgba(10,13,23,.06)"}},
x:{grid:{display:false}},
},
};

const doughnutOptions={
responsive:true,
maintainAspectRatio:false,
cutout:"68%",
plugins:{
legend:{
position:"bottom",
labels:{boxWidth:9,usePointStyle:true,font:{size:9}},
},
},
};

if(loading){
return(
<div className="min-h-screen bg-[#F3F2EE] pt-24 flex items-center justify-center font-['Montserrat']">
<div className="text-center">
<div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#0A0D17]/15 border-t-[#0A0D17]"/>
<p className="text-xs font-black uppercase tracking-[0.2em] text-[#0A0D17]">Loading Sales Report</p>
</div>
</div>
);
}

return(
<div className="min-h-screen bg-[#F3F2EE] px-3 pt-24 pb-10 font-['Montserrat'] text-[#0A0D17]">
<div className="mx-auto max-w-[1500px] space-y-4">

<div className="relative overflow-hidden rounded-[6px] bg-[#0A0D17] px-6 py-7 text-white">
<div className="absolute right-0 top-0 h-full w-1 bg-[#d4b483]"/>

<div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
<div>
<div className="flex items-center gap-3">
<div className="h-[2px] w-8 bg-[#d4b483]"/>
<p className="text-[9px] font-black uppercase tracking-[0.34em] text-[#d4b483]">Saint Clothing</p>
</div>

<h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.03em] md:text-4xl">
Sales Report
</h1>

<p className="mt-2 max-w-xl text-xs leading-5 text-white/45">
Sales performance, product movement, inventory status and order activity.
</p>

<p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-white/30">
Last Updated: {lastUpdated?lastUpdated.toLocaleString():"-"}
</p>
</div>

<div className="flex flex-wrap gap-2">
<button
onClick={()=>fetchData(false)}
disabled={refreshing}
className="flex items-center gap-2 rounded-[4px] border border-white/15 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition hover:bg-white/10 disabled:opacity-50"
>
<FaSyncAlt className={refreshing?"animate-spin":""}/>
{refreshing?"Refreshing":"Refresh"}
</button>

<button
onClick={handlePrint}
className="flex items-center gap-2 rounded-[4px] bg-[#d4b483] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#0A0D17] transition hover:bg-[#e0c69e]"
>
<FaPrint/>
Export Sales Report
</button>
</div>
</div>
</div>

<div className={`${panelBg} overflow-hidden rounded-[6px]`}>
<div className="flex items-center justify-between border-b border-black/10 bg-[#FAFAF8] px-5 py-4">
<div>
<p className={labelClass}>Performance Analysis</p>
<h2 className="mt-1 text-lg font-black uppercase tracking-tight">Sales Insight</h2>
</div>

<div className="h-8 w-1 bg-[#d4b483]"/>
</div>

<div className="px-5 py-5">
{insightLoading&&!salesInsight?(
<div className="flex items-center gap-3">
<div className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-[#0A0D17]"/>
<p className="text-sm font-medium text-gray-500">Analyzing the latest sales and inventory data...</p>
</div>
):salesInsight?(
<p className="max-w-[1250px] text-sm font-medium leading-7 text-[#0A0D17]/70">{salesInsight}</p>
):(
<p className="text-sm font-medium text-gray-500">{insightError||"Sales Insight is currently unavailable."}</p>
)}
</div>
</div>

<div className={`${panelBg} rounded-[6px] p-5`}>
<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
<div>
<p className={labelClass}>Business Performance</p>
<h2 className="mt-1 text-xl font-black uppercase tracking-tight">Overall Sales Performance</h2>
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
["Users",stats.totalUsers,<FaUsers/>],
].map(([title,value,icon],index)=>(
<div key={title} className={`relative overflow-hidden rounded-[5px] border border-black/10 p-4 ${index===0?"bg-[#0A0D17] text-white":"bg-[#FAFAF8]"}`}>
<div className="flex items-center justify-between">
<p className={`text-[8px] font-black uppercase tracking-[0.16em] ${index===0?"text-white/45":"text-[#0A0D17]/40"}`}>{title}</p>
<span className={index===0?"text-[#d4b483]":"text-[#0A0D17]/30"}>{icon}</span>
</div>

<p className="mt-4 truncate text-lg font-black tracking-tight">{value}</p>

{index===0&&<div className="absolute bottom-0 left-0 h-[3px] w-full bg-[#d4b483]"/>}
</div>
))}
</div>
</div>

<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
<div className={`${panelBg} rounded-[6px] p-5`}>
<div className="mb-5 flex items-center justify-between">
<div>
<p className={labelClass}>Revenue Movement</p>
<h2 className="mt-1 text-lg font-black uppercase">Sales Trend</h2>
</div>
<RangeSelect value={salesTrendRange} onChange={setSalesTrendRange}/>
</div>

<div className="h-[300px]">
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
tension:.35,
}]}}
/>
</div>
</div>

<div className={`${panelBg} rounded-[6px] p-5`}>
<div className="mb-5 flex items-center justify-between">
<div>
<p className={labelClass}>Financial Performance</p>
<h2 className="mt-1 text-lg font-black uppercase">Revenue & Profit</h2>
</div>
<RangeSelect value={revenueProfitRange} onChange={setRevenueProfitRange}/>
</div>

<div className="h-[300px]">
<Bar
options={barOptions}
data={{
labels:revenueProfit.labels,
datasets:[
{
label:"Revenue",
data:revenueProfit.revenue,
backgroundColor:"#0A0D17",
borderRadius:2,
},
{
label:"Estimated Profit",
data:revenueProfit.profit,
backgroundColor:"#d4b483",
borderRadius:2,
},
]}}
/>
</div>
</div>
</div>

<div className={`${panelBg} overflow-hidden rounded-[6px]`}>
<div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#FAFAF8] px-5 py-4">
<div>
<p className={labelClass}>Product Movement</p>
<h2 className="mt-1 text-xl font-black uppercase tracking-tight">Product Sales Performance</h2>
<p className="mt-1 text-[10px] font-medium text-gray-500">All active products remain visible even when they have no sales.</p>
</div>

<RangeSelect value={productRange} onChange={setProductRange}/>
</div>

<div className="max-h-[560px] overflow-auto">
<table className="w-full min-w-[950px] border-collapse text-left">
<thead className="sticky top-0 z-10 bg-[#0A0D17] text-white">
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
{productPerformance.length?productPerformance.map((item,index)=>(
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
<td colSpan="6" className="px-5 py-10 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
No products found
</td>
</tr>
)}
</tbody>
</table>
</div>
</div>

<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
<div className={`${panelBg} rounded-[6px] p-5`}>
<div className="mb-5 flex items-center justify-between">
<div>
<p className={labelClass}>Category Performance</p>
<h2 className="mt-1 text-lg font-black uppercase">Sales By Category</h2>
</div>

<RangeSelect value={categoryRange} onChange={setCategoryRange}/>
</div>

<div className="grid grid-cols-1 items-center gap-5 md:grid-cols-2">
<div className="h-[250px]">
<Doughnut
options={doughnutOptions}
data={{
labels:categoryChart.labels,
datasets:[{
data:categoryChart.data.some((value)=>value>0)?categoryChart.data:[1,0,0,0,0],
backgroundColor:["#0A0D17","#d4b483","#4b4e58","#9d825d","#d9d7d1"],
borderWidth:0,
}]}}
/>
</div>

<div className="overflow-hidden rounded-[4px] border border-black/10">
<table className="w-full text-xs">
<thead>
<tr className="bg-[#0A0D17] text-white">
<th className="px-3 py-2.5 text-left text-[8px] font-black uppercase tracking-wider">Category</th>
<th className="px-3 py-2.5 text-right text-[8px] font-black uppercase tracking-wider">Units</th>
<th className="px-3 py-2.5 text-right text-[8px] font-black uppercase tracking-wider">Revenue</th>
</tr>
</thead>

<tbody>
{categoryPerformance.map((item,index)=>(
<tr key={item.category} className={index%2===0?"bg-white":"bg-[#FAFAF8]"}>
<td className="border-b border-black/5 px-3 py-2.5 font-bold">{item.category}</td>
<td className="border-b border-black/5 px-3 py-2.5 text-right font-black">{item.unitsSold}</td>
<td className="border-b border-black/5 px-3 py-2.5 text-right font-black">{formatMoney(item.revenue)}</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
</div>

<div className={`${panelBg} rounded-[6px] p-5`}>
<div className="mb-5">
<p className={labelClass}>Inventory Monitoring</p>
<div className="mt-1 flex items-center gap-2">
<h2 className="text-lg font-black uppercase">Low Stock Alert</h2>
{lowStockProducts.length>0&&<FaExclamationTriangle className="text-[#d4b483]"/>}
</div>
</div>

<div className="max-h-[320px] overflow-auto rounded-[4px] border border-black/10">
<table className="w-full text-xs">
<thead className="sticky top-0 bg-[#0A0D17] text-white">
<tr>
<th className="px-3 py-2.5 text-left text-[8px] font-black uppercase tracking-wider">Product</th>
<th className="px-3 py-2.5 text-left text-[8px] font-black uppercase tracking-wider">Category</th>
<th className="px-3 py-2.5 text-right text-[8px] font-black uppercase tracking-wider">Stock</th>
</tr>
</thead>

<tbody>
{lowStockProducts.length?lowStockProducts.map((item,index)=>(
<tr key={item._id} className={index%2===0?"bg-white":"bg-[#FAFAF8]"}>
<td className="border-b border-black/5 px-3 py-2.5 font-black">{item.name}</td>
<td className="border-b border-black/5 px-3 py-2.5 font-medium text-gray-500">{item.category}</td>
<td className="border-b border-black/5 px-3 py-2.5 text-right">
<span className="rounded-[3px] bg-red-50 px-2 py-1 text-[9px] font-black text-red-600">{item.stock}</span>
</td>
</tr>
)):(
<tr>
<td colSpan="3" className="px-3 py-8 text-center text-xs font-bold text-gray-400">
No low stock products.
</td>
</tr>
)}
</tbody>
</table>
</div>
</div>
</div>

<div className={`${panelBg} overflow-hidden rounded-[6px]`}>
<div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#FAFAF8] px-5 py-4">
<div>
<p className={labelClass}>Order Activity</p>
<h2 className="mt-1 text-lg font-black uppercase">Recent Orders</h2>
</div>

<RangeSelect value={recentOrdersRange} onChange={setRecentOrdersRange}/>
</div>

<div className="max-h-[500px] overflow-auto">
<table className="w-full min-w-[950px] text-left text-xs">
<thead className="sticky top-0 bg-[#0A0D17] text-white">
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
{recentOrders.length?recentOrders.map((order,index)=>(
<tr key={order._id} className={index%2===0?"bg-white":"bg-[#FAFAF8]"}>
<td className="border-b border-black/5 px-4 py-3 font-black">#{String(order._id||"").slice(-6).toUpperCase()}</td>
<td className="border-b border-black/5 px-4 py-3 font-semibold">
{`${order.address?.firstName||""} ${order.address?.lastName||""}`.trim()||"Customer"}
</td>
<td className="border-b border-black/5 px-4 py-3 text-right font-black">{formatMoney(order.amount)}</td>
<td className="border-b border-black/5 px-4 py-3 font-semibold">{order.paymentMethod||"COD"}</td>
<td className="border-b border-black/5 px-4 py-3">
<span className={`rounded-[3px] px-2 py-1 text-[8px] font-black uppercase ${isPaidOrder(order)?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>
{isPaidOrder(order)?"Paid":"Pending"}
</span>
</td>
<td className="border-b border-black/5 px-4 py-3 font-semibold">{order.status||"Pending"}</td>
<td className="border-b border-black/5 px-4 py-3 text-[10px] text-gray-500">
{new Date(order.date||order.createdAt).toLocaleString()}
</td>
</tr>
)):(
<tr>
<td colSpan="7" className="px-4 py-10 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
No orders found
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

export default SalesReport;