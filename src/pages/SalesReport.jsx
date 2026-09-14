import React,{useEffect,useMemo,useState}from"react";
import axios from"axios";
import{Line,Bar,Doughnut}from"react-chartjs-2";
import{useNavigate}from"react-router-dom";
import{backendUrl,currency}from"../App";
import{FaArrowUp,FaArrowDown,FaPrint,FaSyncAlt,FaChartLine,FaShoppingCart,FaBoxOpen,FaUsers,FaMoneyBillWave}from"react-icons/fa";
import{Chart as ChartJS,CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Title,Tooltip,Legend,Filler}from"chart.js";

ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Title,Tooltip,Legend,Filler);

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

return value;
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

const[overviewRange,setOverviewRange]=useState("month");
const[salesTrendRange,setSalesTrendRange]=useState("week");
const[revenueProfitRange,setRevenueProfitRange]=useState("year");
const[categoryRange,setCategoryRange]=useState("month");
const[topProductsRange,setTopProductsRange]=useState("month");
const[lowStockRange]=useState("month");
const[recentOrdersRange,setRecentOrdersRange]=useState("month");

const[rawProducts,setRawProducts]=useState([]);
const[rawOrders,setRawOrders]=useState([]);
const[rawUsersCount,setRawUsersCount]=useState(0);

const[stats,setStats]=useState({
totalRevenue:0,
totalOrders:0,
totalProducts:0,
totalUsers:0,
netProfit:0,
netProfitMargin:0,
lowStockCount:0,
});

const[displayStats,setDisplayStats]=useState(stats);
const[weeklySales,setWeeklySales]=useState({labels:[],data:[]});
const[monthlySales,setMonthlySales]=useState({labels:[],revenue:[],netProfit:[]});
const[categorySales,setCategorySales]=useState({labels:[],data:[]});
const[topProducts,setTopProducts]=useState([]);
const[lowStockProducts,setLowStockProducts]=useState([]);
const[recentOrders,setRecentOrders]=useState([]);
const[loading,setLoading]=useState(true);
const[refreshing,setRefreshing]=useState(false);
const[lastUpdated,setLastUpdated]=useState(null);

const panelBg="bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
const softPanelBg="bg-[#FAFAF8] border border-black/10";
const labelClass="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";

useEffect(()=>{
fetchData(false);

const interval=setInterval(()=>{
fetchData(true);
},600000);

return()=>clearInterval(interval);
},[]);

useEffect(()=>{
buildReportSections();
},[
rawProducts,
rawOrders,
rawUsersCount,
overviewRange,
salesTrendRange,
revenueProfitRange,
categoryRange,
topProductsRange,
lowStockRange,
recentOrdersRange,
]);

useEffect(()=>{
const duration=700;
const start=performance.now();

const animate=(time)=>{
const progress=Math.min((time-start)/duration,1);

setDisplayStats({
totalRevenue:Math.floor(progress*stats.totalRevenue),
totalOrders:Math.floor(progress*stats.totalOrders),
totalProducts:Math.floor(progress*stats.totalProducts),
totalUsers:Math.floor(progress*stats.totalUsers),
netProfit:Math.floor(progress*stats.netProfit),
netProfitMargin:stats.netProfitMargin,
lowStockCount:Math.floor(progress*stats.lowStockCount),
});

if(progress<1)requestAnimationFrame(animate);
};

requestAnimationFrame(animate);
},[stats]);

const getProductTotalStock=(product)=>{
if(!product?.stock)return 0;
if(typeof product.stock==="number")return product.stock;

if(typeof product.stock==="object"){
return Object.values(product.stock).reduce((sum,qty)=>sum+(Number(qty)||0),0);
}

return 0;
};

const getDateWindowForRange=(range)=>{
const now=new Date();
now.setHours(0,0,0,0);

if(range==="today"){
const start=new Date(now);
const end=new Date(now);
end.setDate(end.getDate()+1);
return{start,end};
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

if(range==="year"){
const start=new Date(now.getFullYear(),now.getMonth()-11,1);
const end=new Date(now.getFullYear(),now.getMonth()+1,1);

return{start,end};
}

return{
start:new Date(0),
end:new Date(8640000000000000),
};
};

const filterOrdersByRange=(orders,range)=>{
const{start,end}=getDateWindowForRange(range);

return orders.filter((order)=>{
const dateValue=order.date||order.createdAt;
if(!dateValue)return false;

const orderDate=new Date(dateValue);
if(Number.isNaN(orderDate.getTime()))return false;

return orderDate>=start&&orderDate<end;
});
};

const getTrend=(current,previous)=>{
if(!previous||previous===0){
return{
percent:current>0?100:0,
isUp:current>=previous,
};
}

const change=((current-previous)/previous)*100;

return{
percent:Math.abs(change).toFixed(1),
isUp:change>=0,
};
};

const fetchData=async(silent=false)=>{
try{
if(!silent)setLoading(true);
setRefreshing(true);

const token=localStorage.getItem("token")||"";

const[productRes,ordersRes,usersRes]=await Promise.all([
axios.get(`${backendUrl}/api/product/list`),

axios.get(`${backendUrl}/api/order/list`,{
headers:{Authorization:`Bearer ${token}`},
}),

axios.get(`${backendUrl}/api/admin/users`,{
headers:{Authorization:`Bearer ${token}`},
}).catch(()=>({data:{users:[]}})),
]);

const products=productRes?.data?.success?productRes.data.products||[]:[];
const orders=ordersRes?.data?.success?ordersRes.data.orders||[]:[];
const users=usersRes?.data?.users||[];

console.log("[SALES REPORT] PRODUCTS:",products.length);
console.log("[SALES REPORT] ORDERS:",orders.length);
console.log("[SALES REPORT] USERS:",users.length);
console.log("[SALES REPORT] ORDER RESPONSE:",ordersRes?.data);

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

const buildOverviewStats=()=>{
const filteredOrders=filterOrdersByRange(rawOrders,overviewRange);
const paidOrders=filteredOrders.filter(isPaidOrder);

const totalRevenue=paidOrders.reduce((sum,order)=>sum+(Number(order.amount)||0),0);
const totalOrders=filteredOrders.length;
const totalProducts=rawProducts.length;
const totalUsers=rawUsersCount;
const netProfit=Math.floor(totalRevenue*0.3);
const netProfitMargin=totalRevenue>0?Math.floor((netProfit/totalRevenue)*100):0;

const lowStockCount=rawProducts.filter((product)=>getProductTotalStock(product)<=5).length;

setStats({
totalRevenue,
totalOrders,
totalProducts,
totalUsers,
netProfit,
netProfitMargin,
lowStockCount,
});
};

const buildSalesTrend=()=>{
const paidOrders=filterOrdersByRange(rawOrders,salesTrendRange).filter(isPaidOrder);

const labels=[];
const data=[];
const now=new Date();

if(salesTrendRange==="today"){
for(let i=0;i<24;i++){
const label=`${i}:00`;

const total=paidOrders
.filter((order)=>{
const date=new Date(order.date||order.createdAt);
return!Number.isNaN(date.getTime())&&date.getHours()===i;
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(label);
data.push(total);
}
}else if(salesTrendRange==="week"){
for(let i=6;i>=0;i--){
const d=new Date(now);
d.setDate(now.getDate()-i);

const label=d.toLocaleDateString("en-US",{weekday:"short"});

const total=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);

return od.getFullYear()===d.getFullYear()&&od.getMonth()===d.getMonth()&&od.getDate()===d.getDate();
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(label);
data.push(total);
}
}else if(salesTrendRange==="month"){
for(let i=29;i>=0;i--){
const d=new Date(now);
d.setDate(now.getDate()-i);

const label=d.toLocaleDateString("en-US",{
month:"short",
day:"numeric",
});

const total=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);

return od.getFullYear()===d.getFullYear()&&od.getMonth()===d.getMonth()&&od.getDate()===d.getDate();
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(label);
data.push(total);
}
}else{
for(let i=11;i>=0;i--){
const d=new Date(now.getFullYear(),now.getMonth()-i,1);
const label=d.toLocaleDateString("en-US",{month:"short"});
const month=d.getMonth();
const year=d.getFullYear();

const total=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getMonth()===month&&od.getFullYear()===year;
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(label);
data.push(total);
}
}

setWeeklySales({labels,data});
};

const buildRevenueProfit=()=>{
const paidOrders=filterOrdersByRange(rawOrders,revenueProfitRange).filter(isPaidOrder);

const labels=[];
const revenue=[];
const netProfit=[];
const now=new Date();

if(revenueProfitRange==="today"){
for(let i=0;i<24;i++){
const label=`${i}:00`;

const amount=paidOrders
.filter((order)=>{
const date=new Date(order.date||order.createdAt);
return!Number.isNaN(date.getTime())&&date.getHours()===i;
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(label);
revenue.push(amount);
netProfit.push(Math.floor(amount*0.3));
}
}else if(revenueProfitRange==="week"){
for(let i=6;i>=0;i--){
const d=new Date(now);
d.setDate(now.getDate()-i);

const label=d.toLocaleDateString("en-US",{weekday:"short"});

const amount=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);

return od.getFullYear()===d.getFullYear()&&od.getMonth()===d.getMonth()&&od.getDate()===d.getDate();
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(label);
revenue.push(amount);
netProfit.push(Math.floor(amount*0.3));
}
}else if(revenueProfitRange==="month"){
for(let i=3;i>=0;i--){
const weekEnd=new Date(now);
weekEnd.setHours(23,59,59,999);
weekEnd.setDate(now.getDate()-i*7);

const weekStart=new Date(weekEnd);
weekStart.setHours(0,0,0,0);
weekStart.setDate(weekEnd.getDate()-6);

const label=`Week ${4-i}`;

const amount=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od>=weekStart&&od<=weekEnd;
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(label);
revenue.push(amount);
netProfit.push(Math.floor(amount*0.3));
}
}else{
for(let i=11;i>=0;i--){
const d=new Date(now.getFullYear(),now.getMonth()-i,1);
const label=d.toLocaleDateString("en-US",{month:"short"});
const month=d.getMonth();
const year=d.getFullYear();

const amount=paidOrders
.filter((order)=>{
const od=new Date(order.date||order.createdAt);
return od.getMonth()===month&&od.getFullYear()===year;
})
.reduce((sum,order)=>sum+(Number(order.amount)||0),0);

labels.push(label);
revenue.push(amount);
netProfit.push(Math.floor(amount*0.3));
}
}

setMonthlySales({labels,revenue,netProfit});
};

const buildCategoryOverview=()=>{
const rangedOrders=filterOrdersByRange(rawOrders,categoryRange).filter(isPaidOrder);
const soldCategoryMap={};

FIXED_CATEGORIES.forEach((category)=>{
soldCategoryMap[category]=0;
});

rangedOrders.forEach((order)=>{
(order.items||[]).forEach((item)=>{
const product=rawProducts.find((p)=>String(p._id)===String(item.productId));

const category=normalizeCategory(product?.category||item.category||"Unknown");
const qty=Number(item.quantity)||0;

if(soldCategoryMap[category]===undefined){
soldCategoryMap[category]=0;
}

soldCategoryMap[category]+=qty;
});
});

setCategorySales({
labels:FIXED_CATEGORIES,
data:FIXED_CATEGORIES.map((category)=>soldCategoryMap[category]||0),
});
};

const buildTopProducts=()=>{
const rangedOrders=filterOrdersByRange(rawOrders,topProductsRange).filter(isPaidOrder);
const productSoldMap={};

rangedOrders.forEach((order)=>{
(order.items||[]).forEach((item)=>{
const key=item.name||item.productName||"Unknown Product";
const qty=Number(item.quantity)||0;
const amount=(Number(item.price)||0)*qty;

if(!productSoldMap[key]){
productSoldMap[key]={
name:key,
sold:0,
revenue:0,
};
}

productSoldMap[key].sold+=qty;
productSoldMap[key].revenue+=amount;
});
});

setTopProducts(
Object.values(productSoldMap)
.sort((a,b)=>b.sold-a.sold)
.slice(0,5)
);
};

const buildLowStock=()=>{
setLowStockProducts(
rawProducts
.filter((product)=>getProductTotalStock(product)<=5)
.map((product)=>({
_id:product._id,
name:product.name,
category:normalizeCategory(product.category),
branch:product.branch||"Main",
stock:getProductTotalStock(product),
price:product.price||0,
}))
.sort((a,b)=>a.stock-b.stock)
);
};

const buildRecentOrders=()=>{
const rangedOrders=filterOrdersByRange(rawOrders,recentOrdersRange);

setRecentOrders(
[...rangedOrders].sort((a,b)=>{
const dateA=new Date(a.date||a.createdAt);
const dateB=new Date(b.date||b.createdAt);
return dateB-dateA;
})
);
};

const buildReportSections=()=>{
buildOverviewStats();
buildSalesTrend();
buildRevenueProfit();
buildCategoryOverview();
buildTopProducts();
buildLowStock();
buildRecentOrders();
};

const handlePrint=()=>{
const params=new URLSearchParams({
overview:overviewRange,
salesTrend:salesTrendRange,
revenueProfit:revenueProfitRange,
category:categoryRange,
topProducts:topProductsRange,
recentOrders:recentOrdersRange,
});

navigate(`/sales-report-print?${params.toString()}`);
};

const formatMoney=(value)=>`${currency}${Number(value||0).toLocaleString()}`;

const formatCompactNumber=(value)=>{
const numValue=Number(value||0);

if(numValue>=1000000000)return`${Math.round(numValue/1000000000)}b`;
if(numValue>=1000000)return`${Math.round(numValue/1000000)}m`;
if(numValue>=1000)return`${Math.round(numValue/1000)}k`;

return numValue.toLocaleString();
};

const formatCompactCurrency=(value)=>{
const numValue=Number(value||0);

if(numValue>=1000000000)return`${currency}${Math.round(numValue/1000000000)}b`;
if(numValue>=1000000)return`${currency}${Math.round(numValue/1000000)}m`;
if(numValue>=1000)return`${currency}${Math.round(numValue/1000)}k`;

return`${currency}${numValue.toLocaleString()}`;
};

const lastMonthRevenue=monthlySales.revenue.at(-1)||0;
const prevMonthRevenue=monthlySales.revenue.at(-2)||0;
const lastMonthProfit=monthlySales.netProfit.at(-1)||0;
const prevMonthProfit=monthlySales.netProfit.at(-2)||0;
const todaySales=weeklySales.data.at(-1)||0;
const yesterdaySales=weeklySales.data.at(-2)||0;

const revenueTrend=getTrend(lastMonthRevenue,prevMonthRevenue);
const profitTrend=getTrend(lastMonthProfit,prevMonthProfit);
const dailyTrend=getTrend(todaySales,yesterdaySales);

const doughnutOptions=useMemo(()=>({
cutout:"72%",
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{display:false},
},
}),[]);

const lineOptions=useMemo(()=>({
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{
display:true,
labels:{color:"#111827"},
},
},
scales:{
y:{
beginAtZero:true,
ticks:{color:"#6b7280"},
grid:{color:"rgba(0,0,0,0.06)"},
},
x:{
ticks:{color:"#6b7280"},
grid:{display:false},
},
},
}),[]);

const barOptions=useMemo(()=>({
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{
labels:{color:"#111827"},
},
},
scales:{
y:{
beginAtZero:true,
ticks:{color:"#6b7280"},
grid:{color:"rgba(0,0,0,0.06)"},
},
x:{
ticks:{color:"#6b7280"},
grid:{display:false},
},
},
}),[]);

const RangeSelect=({value,onChange})=>(
<select
value={value}
onChange={(e)=>onChange(e.target.value)}
className="min-w-[110px] rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm font-black text-[#0A0D17] outline-none transition focus:border-black"
>
{RANGE_OPTIONS.map((option)=>(
<option key={option.value} value={option.value}>
{option.label}
</option>
))}
</select>
);

const renderSectionHeader=(title,subtitle,range,setRange,showFilter=true)=>(
<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className={labelClass}>Report Section</p>
<h2 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
{title}
</h2>
<p className="mt-1 text-xs text-[#6b7280]">{subtitle}</p>
</div>

{showFilter&&(
<div className="print:hidden">
<RangeSelect value={range} onChange={setRange}/>
</div>
)}
</div>
);

const ValueDisplay=({compact,full,className=""})=>(
<>
<span className={`print:hidden ${className}`}>{compact}</span>
<span className={`hidden print:inline ${className}`}>{full}</span>
</>
);

const renderCategoryChart=(labels,data)=>{
const hasActualData=data.some((value)=>Number(value)>0);
const safeLabels=labels.length?labels:["No Data"];
const safeData=hasActualData?data:[1];

return(
<div className="grid grid-cols-1 gap-6 items-center lg:grid-cols-[220px_1fr] print:grid-cols-1">
<div className="mx-auto h-[220px] w-full max-w-[220px] print:h-[180px] print:max-w-[180px]">
<Doughnut
data={{
labels:safeLabels,
datasets:[
{
data:safeData,
backgroundColor:hasActualData
?["#0A0D17","#374151","#b89a6b","#d6c2a1","#9ca3af"]
:["#e5e7eb"],
borderWidth:0,
},
],
}}
options={doughnutOptions}
/>
</div>

<div className="space-y-2">
{safeLabels.map((label,index)=>(
<div
key={`${label}-${index}`}
className="flex items-center justify-between rounded-[5px] border border-black/10 bg-[#FAFAF8] px-4 py-3 print:rounded-none print:border print:bg-white print:px-3 print:py-2"
>
<span className="font-semibold text-gray-800">{label}</span>
<span className="font-black text-gray-900">{data[index]||0}</span>
</div>
))}
</div>
</div>
);
};

if(loading){
return(
<div className="min-h-screen bg-transparent p-3 pt-24 font-['Montserrat']">
<div className="animate-pulse space-y-3">
<div className="h-24 rounded-[5px] bg-white/70"/>
<div className="grid grid-cols-1 md:grid-cols-5 gap-3">
{[...Array(5)].map((_,i)=>(
<div key={i} className="h-28 rounded-[5px] bg-white/70"/>
))}
</div>
<div className="h-80 rounded-[5px] bg-white/70"/>
<div className="h-80 rounded-[5px] bg-white/70"/>
</div>
</div>
);
}

return(
<div className="min-h-screen bg-transparent px-2.5 sm:px-3 pt-20 sm:pt-24 pb-4 font-['Montserrat'] print:bg-white print:p-0">
<div className="max-w-[1500px] mx-auto space-y-4 print:max-w-none print:space-y-3 print:px-0">

<div className="rounded-[5px] bg-[#0A0D17] p-5 sm:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] text-white border border-black/10 overflow-hidden relative print:bg-white print:text-black print:shadow-none print:rounded-none">
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
<div className="min-w-0">
<p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/50 mb-2 print:text-gray-500">
Saint Clothing Admin
</p>

<div className="flex items-center gap-3">
<div className="w-11 h-11 rounded-[5px] bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm print:bg-white print:border-black/10">
<FaChartLine className="text-sm"/>
</div>

<div className="min-w-0">
<h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
Sales Report
</h1>

<p className="text-[11px] sm:text-sm text-white/65 mt-1 print:text-gray-500">
Generated: {new Date().toLocaleString()}
</p>

{lastUpdated&&(
<p className="text-[10px] text-white/40 mt-1 print:text-gray-500">
Last synced: {lastUpdated.toLocaleString()}
</p>
)}
</div>
</div>
</div>

<div className="flex flex-wrap gap-2 print:hidden">
<button
type="button"
onClick={()=>fetchData(false)}
disabled={refreshing}
className="inline-flex items-center gap-2 rounded-[5px] bg-white/10 border border-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20 disabled:opacity-50"
>
<FaSyncAlt className={refreshing?"animate-spin":""}/>
{refreshing?"Refreshing...":"Refresh"}
</button>

<button
type="button"
onClick={handlePrint}
className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm"
>
<FaPrint/>
Print Report
</button>
</div>
</div>
</div>

<div className={`${panelBg} rounded-[5px] p-4 sm:p-5 print:rounded-none print:shadow-none`}>
{renderSectionHeader(
"Overview",
"Summary cards for the selected time period",
overviewRange,
setOverviewRange
)}

<div className="grid grid-cols-1 gap-3 md:grid-cols-5 print:grid-cols-5 print:gap-2">
{[
{
title:"Total Sales",
value:<ValueDisplay compact={formatCompactCurrency(displayStats.totalRevenue)} full={formatMoney(stats.totalRevenue)}/>,
subtitle:`${dailyTrend.percent}% vs previous period`,
icon:<FaMoneyBillWave/>,
trend:dailyTrend,
},
{
title:"Orders",
value:<ValueDisplay compact={formatCompactNumber(displayStats.totalOrders)} full={stats.totalOrders.toLocaleString()}/>,
subtitle:"Total orders",
icon:<FaShoppingCart/>,
},
{
title:"Net Profit",
value:<ValueDisplay compact={formatCompactCurrency(displayStats.netProfit)} full={formatMoney(stats.netProfit)}/>,
subtitle:`Margin: ${displayStats.netProfitMargin}%`,
icon:<FaChartLine/>,
trend:profitTrend,
},
{
title:"Inventory",
value:<ValueDisplay compact={formatCompactNumber(displayStats.totalProducts)} full={stats.totalProducts.toLocaleString()}/>,
subtitle:`${displayStats.lowStockCount} low stock`,
icon:<FaBoxOpen/>,
},
{
title:"Users",
value:<ValueDisplay compact={formatCompactNumber(displayStats.totalUsers)} full={stats.totalUsers.toLocaleString()}/>,
subtitle:`${revenueTrend.percent}% revenue trend`,
icon:<FaUsers/>,
},
].map((item)=>(
<div
key={item.title}
className={`${softPanelBg} rounded-[5px] p-4 min-w-0 overflow-hidden transition hover:shadow-md print:rounded-none print:shadow-none`}
>
<div className="flex items-start justify-between gap-3">
<div className="min-w-0">
<p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]/45">
{item.title}
</p>

<div className="mt-2 text-[23px] font-black leading-none tracking-[-0.04em] text-[#0A0D17] break-words">
{item.value}
</div>
</div>

<div className="w-9 h-9 rounded-[5px] bg-[#111111]/8 flex items-center justify-center text-[#111111] shrink-0">
{item.icon}
</div>
</div>

<div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#6b7280]">
{item.trend&&(
item.trend.isUp
?<FaArrowUp className="text-emerald-600"/>
:<FaArrowDown className="text-red-600"/>
)}
<span>{item.subtitle}</span>
</div>
</div>
))}
</div>
</div>

<div className="grid grid-cols-1 gap-4 xl:grid-cols-3 print:grid-cols-1 print:gap-3">
<div className={`${panelBg} rounded-[5px] p-4 sm:p-5 xl:col-span-2 print:rounded-none print:shadow-none`}>
{renderSectionHeader(
"Sales Trend",
"Paid sales performance over the selected period",
salesTrendRange,
setSalesTrendRange
)}

<div className="h-[320px] print:h-[240px]">
<Line
options={lineOptions}
data={{
labels:weeklySales.labels.length?weeklySales.labels:["No Data"],
datasets:[
{
label:"Sales",
data:weeklySales.data.length?weeklySales.data:[0],
borderColor:"#0A0D17",
backgroundColor:"rgba(184,154,107,0.18)",
fill:true,
tension:0.4,
pointRadius:3,
},
],
}}
/>
</div>
</div>

<div className={`${panelBg} rounded-[5px] p-4 sm:p-5 print:rounded-none print:shadow-none`}>
{renderSectionHeader(
"Top Products",
"Best-performing products from paid orders",
topProductsRange,
setTopProductsRange
)}

<div className="space-y-2">
{topProducts.length?(
topProducts.map((item,index)=>(
<div
key={`${item.name}-${index}`}
className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4 print:rounded-none print:bg-white print:p-3"
>
<div className="flex items-center justify-between gap-3">
<div className="min-w-0">
<p className="truncate font-black text-[#0A0D17] print:whitespace-normal">
{item.name}
</p>
<p className="text-xs text-[#6b7280]">
{item.sold} units sold
</p>
</div>

<p className="shrink-0 font-black text-[#0A0D17]">
{formatMoney(item.revenue)}
</p>
</div>
</div>
))
):(
<div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4 text-sm text-gray-500">
No paid product sales for this range.
</div>
)}
</div>
</div>
</div>

<div className={`${panelBg} rounded-[5px] p-4 sm:p-5 print:rounded-none print:shadow-none`}>
{renderSectionHeader(
"Revenue & Profit",
"Paid order revenue and estimated profit",
revenueProfitRange,
setRevenueProfitRange
)}

<div className="h-[340px] print:h-[240px]">
<Bar
options={barOptions}
data={{
labels:monthlySales.labels,
datasets:[
{
label:"Revenue",
data:monthlySales.revenue,
backgroundColor:"#0A0D17",
borderRadius:5,
},
{
label:"Profit",
data:monthlySales.netProfit,
backgroundColor:"#b89a6b",
borderRadius:5,
},
],
}}
/>
</div>
</div>

<div className="grid grid-cols-1 gap-4 xl:grid-cols-2 print:grid-cols-1 print:gap-3">
<div className={`${panelBg} rounded-[5px] p-4 sm:p-5 print:rounded-none print:shadow-none`}>
{renderSectionHeader(
"Category Overview",
"Sold quantity from paid orders by category",
categoryRange,
setCategoryRange
)}

{renderCategoryChart(categorySales.labels,categorySales.data)}
</div>

<div className={`${panelBg} rounded-[5px] p-4 sm:p-5 print:rounded-none print:shadow-none`}>
{renderSectionHeader(
"Low Stock Alert",
"Products with total stock of 5 or below",
lowStockRange,
()=>{},
false
)}

<div className="space-y-2">
{lowStockProducts.length?(
lowStockProducts.map((item)=>(
<div
key={item._id}
className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4 print:rounded-none print:bg-white print:p-3"
>
<div className="flex items-center justify-between gap-3">
<div className="min-w-0">
<p className="truncate font-black text-[#0A0D17]">
{item.name}
</p>

<p className="text-xs text-[#6b7280]">
{item.category} • {item.branch}
</p>
</div>

<div className="shrink-0 text-right">
<p className="font-black text-red-600">
{item.stock} left
</p>

<p className="text-xs text-[#6b7280]">
{formatMoney(item.price)}
</p>
</div>
</div>
</div>
))
):(
<div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4 text-sm text-gray-500">
No low stock products right now.
</div>
)}
</div>
</div>
</div>

<div className={`${panelBg} rounded-[5px] overflow-hidden print:rounded-none print:shadow-none`}>
<div className="px-4 sm:px-5 py-5 border-b border-black/10">
{renderSectionHeader(
"Recent Orders",
"Latest order activity for the selected period",
recentOrdersRange,
setRecentOrdersRange
)}
</div>

<div className="overflow-x-auto">
<table className="w-full min-w-[900px] border-collapse text-left print:min-w-0">
<thead>
<tr className="bg-[#0A0D17] text-white">
<th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em]">
Order ID
</th>
<th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em]">
Customer
</th>
<th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em]">
Amount
</th>
<th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em]">
Payment
</th>
<th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em]">
Status
</th>
<th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em]">
Date
</th>
</tr>
</thead>

<tbody>
{recentOrders.length?(
recentOrders.map((order,i)=>(
<tr
key={order._id}
className={`border-b border-[#ecece6] ${i%2===0?"bg-white":"bg-[#fcfcfb]"}`}
>
<td className="px-5 py-4 text-xs font-black text-[#0A0D17]">
#{order._id?.slice(-6)?.toUpperCase()}
</td>

<td className="px-5 py-4 text-xs font-semibold text-[#0A0D17]/70">
{`${order.address?.firstName||""} ${order.address?.lastName||""}`.trim()||"Customer"}
</td>

<td className="px-5 py-4 text-xs font-black text-[#0A0D17]">
{formatMoney(order.amount)}
</td>

<td className="px-5 py-4 text-xs font-bold text-[#0A0D17]/70">
{order.paymentMethod||"COD"}
</td>

<td className="px-5 py-4">
<span className="inline-flex rounded-[5px] border border-black/10 bg-[#FAFAF8] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#0A0D17]/70">
{order.status||"Pending"}
</span>
</td>

<td className="px-5 py-4 text-xs font-semibold text-[#6b7280]">
{order.date||order.createdAt
?new Date(order.date||order.createdAt).toLocaleString()
:"No date"}
</td>
</tr>
))
):(
<tr>
<td colSpan="6" className="px-4 py-8 text-center text-gray-500">
No recent orders available for this range.
</td>
</tr>
)}
</tbody>
</table>
</div>
</div>

<style>
{`
@media print {
.print-no-scroll {
max-height:none !important;
overflow:visible !important;
}

.print-full-width {
overflow:visible !important;
}

canvas {
max-height:240px !important;
}

body {
background:white !important;
}
}
`}
</style>

</div>
</div>
);
};

export default SalesReport;