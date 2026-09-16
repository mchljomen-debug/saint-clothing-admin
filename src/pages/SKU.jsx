import React,{useEffect,useMemo,useState}from"react";
import axios from"axios";
import{backendUrl}from"../App";
import{toast}from"react-toastify";
import{Pagination}from"antd";
import"antd/dist/reset.css";
import{FaBoxes,FaSearch,FaSyncAlt,FaEdit,FaHistory,FaTrash,FaStore,FaExclamationTriangle,FaClipboardList,FaCalendarAlt,FaFileExcel}from"react-icons/fa";
import ExcelJS from"exceljs";
import{saveAs}from"file-saver";

const sizesList=["S","M","L","XL","2XL","3XL"];
const DEFAULT_ITEMS_PER_PAGE=20;
const DEFAULT_LOGS_PER_PAGE=10;
const FIXED_CATEGORIES=["All","Tshirt","Long Sleeve","Jorts","Mesh Short","Crop Jersey"];

const normalizeCategory=(value="")=>{
const clean=String(value).trim().toLowerCase();
if(clean==="jorts")return"Jorts";
if(clean==="crop jersey"||clean==="cropjersey")return"Crop Jersey";
if(clean==="mesh short"||clean==="mesh shorts")return"Mesh Short";
if(clean==="long sleeve"||clean==="longsleeve")return"Long Sleeve";
if(clean==="tshirt"||clean==="t-shirt"||clean==="tee")return"Tshirt";
return String(value).trim();
};

const extractImage=(input)=>{
if(!input)return"";
if(Array.isArray(input)){
for(const item of input){
const found=extractImage(item);
if(found)return found;
}
return"";
}
if(typeof input==="object")return input.secure_url||input.url||input.image||input.src||input.path||input.filename||"";
return String(input).trim();
};

const getStock=(stock,size)=>{
if(!stock)return 0;
const key=String(size||"").toUpperCase();
if(typeof stock.get==="function")return Number(stock.get(key)||0);
return Number(stock[key]||0);
};

const getTotalStock=(stock)=>sizesList.reduce((sum,size)=>sum+getStock(stock,size),0);
const getAdminName=()=>localStorage.getItem("adminName")||localStorage.getItem("name")||localStorage.getItem("username")||localStorage.getItem("email")||localStorage.getItem("role")||"Admin";

const formatDateInput=(dateValue)=>{
if(!dateValue)return"";
try{
return new Date(dateValue).toISOString().slice(0,10);
}catch{
return"";
}
};

const getLogId=(log)=>log?._id||log?.id||`${log?.productId}-${log?.size}-${log?.createdAt}`;
const getLogDate=(log)=>log?.createdAt||log?.updatedAt||"";

const getLogProductId=(log)=>{
if(!log?.productId)return"";
if(typeof log.productId==="object")return String(log.productId._id||"");
return String(log.productId);
};

const SKU=({token})=>{
const[products,setProducts]=useState([]);
const[filteredProducts,setFilteredProducts]=useState([]);
const[loading,setLoading]=useState(true);
const[refreshing,setRefreshing]=useState(false);
const[stockUpdates,setStockUpdates]=useState({});
const[preorderUpdates,setPreorderUpdates]=useState({});
const[preorderEnabled,setPreorderEnabled]=useState(true);
const[preorderThreshold,setPreorderThreshold]=useState(5);
const[preorderAutoGenerate,setPreorderAutoGenerate]=useState(true);
const[preorderAutoStock,setPreorderAutoStock]=useState(20);
const[preorderRestockDate,setPreorderRestockDate]=useState("");
const[preorderNote,setPreorderNote]=useState("");
const[selectedProduct,setSelectedProduct]=useState(null);
const[categoryFilter,setCategoryFilter]=useState("All");
const[stockFilter,setStockFilter]=useState("All");
const[search,setSearch]=useState("");
const[currentPage,setCurrentPage]=useState(1);
const[pageSize,setPageSize]=useState(DEFAULT_ITEMS_PER_PAGE);
const[inventoryLogs,setInventoryLogs]=useState([]);
const[inventoryLogPage,setInventoryLogPage]=useState(1);
const[inventoryLogPageSize,setInventoryLogPageSize]=useState(DEFAULT_LOGS_PER_PAGE);
const[saving,setSaving]=useState(false);
const[exportingExcel,setExportingExcel]=useState(false);

const axiosConfig={headers:{Authorization:`Bearer ${token}`}};

const panelBg="bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
const softPanelBg="bg-[#FAFAF8] border border-black/10";
const inputClass="w-full rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm text-[#0A0D17] outline-none transition focus:border-black";
const labelClass="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";
const buttonDark="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937] disabled:opacity-50";
const buttonLight="inline-flex items-center justify-center gap-2 rounded-[5px] border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#0A0D17] transition hover:bg-[#FAFAF8] disabled:opacity-50";

const getCardImage=(product)=>{
const img=extractImage(product?.images);
if(!img)return"";
if(img.startsWith("http://")||img.startsWith("https://")||img.startsWith("data:"))return img;
if(img.startsWith("/uploads/"))return`${backendUrl}${img}`;
if(img.startsWith("uploads/"))return`${backendUrl}/${img}`;
return`${backendUrl}/uploads/${img}`;
};

const getProductPreorderThreshold=(product)=>Number(product?.preorderThreshold??5);

const getProductStatus=(product)=>{
const actualTotal=getTotalStock(product?.stock);
const preorderTotal=getTotalStock(product?.preorderStock);
const threshold=getProductPreorderThreshold(product);
const enabled=product?.preorderEnabled!==false;
if(actualTotal===0&&(!enabled||preorderTotal<=0))return"Out";
if(enabled&&actualTotal<=threshold&&preorderTotal>0)return"Pre-order";
if(actualTotal<=5)return"Critical";
if(actualTotal<=10)return"Low";
return"Healthy";
};

const getInventoryStatusClass=(status)=>{
if(status==="Out")return"bg-red-50 text-red-700 border-red-200";
if(status==="Pre-order")return"bg-orange-50 text-orange-700 border-orange-200";
if(status==="Critical")return"bg-orange-50 text-orange-700 border-orange-200";
if(status==="Low")return"bg-amber-50 text-amber-700 border-amber-200";
return"bg-emerald-50 text-emerald-700 border-emerald-200";
};

const getStockBoxClass=(qty)=>{
if(qty===0)return"bg-red-50 text-red-600 border-red-100";
if(qty<=5)return"bg-orange-50 text-orange-700 border-orange-100";
if(qty<=10)return"bg-amber-50 text-amber-700 border-amber-100";
return"bg-emerald-50 text-emerald-700 border-emerald-100";
};

const getAddBoxClass=(qty)=>{
if(qty<=0)return"bg-white text-[#0A0D17]/45 border-black/10";
return"bg-emerald-50 text-emerald-700 border-emerald-200";
};

const getPreorderBoxClass=(qty)=>{
if(qty<=0)return"bg-white text-[#0A0D17]/40 border-orange-100";
return"bg-orange-50 text-orange-700 border-orange-200";
};

const fetchProducts=async()=>{
setLoading(true);
setRefreshing(true);
try{
const res=await axios.get(`${backendUrl}/api/product/list`,axiosConfig);
if(res.data.success){
const allProducts=[...res.data.products].reverse();
setProducts(allProducts);
const initialStockAdd={};
const initialPreorderAdd={};

allProducts.forEach((product)=>{
initialStockAdd[product._id]={};
initialPreorderAdd[product._id]={};
sizesList.forEach((size)=>{
initialStockAdd[product._id][size]=0;
initialPreorderAdd[product._id][size]=0;
});
});

setStockUpdates(initialStockAdd);
setPreorderUpdates(initialPreorderAdd);
}else{
toast.error(res.data.message);
}
}catch(err){
toast.error(err.response?.data?.message||err.message);
}finally{
setLoading(false);
setRefreshing(false);
}
};

const fetchInventoryLogs=async()=>{
try{
const res=await axios.get(`${backendUrl}/api/product/inventory-logs`,axiosConfig);
if(res.data.success){
setInventoryLogs(res.data.logs||[]);
setInventoryLogPage(1);
}
}catch(err){
console.error("FETCH INVENTORY LOGS ERROR:",err);
}
};

const refreshInventory=async()=>{
setRefreshing(true);
try{
await fetchProducts();
await fetchInventoryLogs();
}finally{
setRefreshing(false);
}
};

useEffect(()=>{
if(token){
fetchProducts();
fetchInventoryLogs();
}
},[token]);

useEffect(()=>{
let result=[...products];

if(categoryFilter!=="All"){
result=result.filter((product)=>normalizeCategory(product.category)===categoryFilter);
}

if(search.trim()){
const term=search.toLowerCase();
result=result.filter((product)=>product.name?.toLowerCase().includes(term)||product.sku?.toLowerCase().includes(term));
}

if(stockFilter!=="All"){
result=result.filter((product)=>{
const status=getProductStatus(product);
if(stockFilter==="Healthy")return status==="Healthy";
if(stockFilter==="Low")return status==="Low";
if(stockFilter==="Critical")return status==="Critical";
if(stockFilter==="Pre-order")return status==="Pre-order";
if(stockFilter==="Out")return status==="Out";
return true;
});
}

setFilteredProducts(result);
setCurrentPage(1);
},[products,categoryFilter,stockFilter,search]);

const inventoryStats=useMemo(()=>{
const totalStock=products.reduce((sum,product)=>sum+getTotalStock(product.stock),0);
const totalPreorder=products.reduce((sum,product)=>sum+getTotalStock(product.preorderStock),0);

return{
products:products.length,
totalStock,
totalPreorder,
healthyStock:products.filter((p)=>getProductStatus(p)==="Healthy").length,
lowStock:products.filter((p)=>getProductStatus(p)==="Low").length,
criticalStock:products.filter((p)=>getProductStatus(p)==="Critical").length,
preorderStock:products.filter((p)=>getProductStatus(p)==="Pre-order").length,
outStock:products.filter((p)=>getProductStatus(p)==="Out").length
};
},[products]);

const exportInventoryToExcel=async()=>{
if(exportingExcel)return;
setExportingExcel(true);

try{
const workbook=new ExcelJS.Workbook();
workbook.creator="Saint Clothing";
workbook.company="Saint Clothing";
workbook.subject="Inventory Management Report";
workbook.title="Saint Clothing Inventory Management Report";
workbook.created=new Date();

const dark="0A0D17";
const gold="D4B483";
const white="FFFFFF";
const light="F4F5F7";
const lighter="FAFAF8";
const gray="667085";
const border="C8CDD3";
const red="B42318";
const redBg="FEF3F2";
const orange="B54708";
const orangeBg="FFF4E5";
const amberBg="FFFAEB";
const green="067647";
const greenBg="ECFDF3";
const currencyFormat='"₱"#,##0.00';
const integerFormat='#,##0';

const thinBorder={
top:{style:"thin",color:{argb:border}},
left:{style:"thin",color:{argb:border}},
bottom:{style:"thin",color:{argb:border}},
right:{style:"thin",color:{argb:border}}
};

const styleHeader=(cell)=>{
cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:dark}};
cell.font={name:"Arial",size:9,bold:true,color:{argb:white}};
cell.alignment={vertical:"middle",horizontal:"center",wrapText:true};
cell.border=thinBorder;
};

const styleCell=(cell,index)=>{
cell.font={name:"Arial",size:9,color:{argb:dark}};
cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:index%2===0?lighter:light}};
cell.border=thinBorder;
cell.alignment={vertical:"middle",horizontal:"center",wrapText:true};
};

const addSheetTitle=(sheet,title,subtitle,lastColumn)=>{
sheet.mergeCells(`A1:${lastColumn}1`);
const titleCell=sheet.getCell("A1");
titleCell.value=title;
titleCell.font={name:"Arial",size:20,bold:true,color:{argb:dark}};
titleCell.alignment={vertical:"middle",horizontal:"left"};
sheet.getRow(1).height=31;

sheet.mergeCells(`A2:${lastColumn}2`);
const subtitleCell=sheet.getCell("A2");
subtitleCell.value=subtitle;
subtitleCell.font={name:"Arial",size:9,italic:true,color:{argb:gray}};
subtitleCell.alignment={vertical:"middle",horizontal:"left"};
sheet.getRow(2).height=19;
};

const inventorySheet=workbook.addWorksheet("Inventory Report");

inventorySheet.properties.defaultRowHeight=18;
inventorySheet.columns=[
{width:17},
{width:34},
{width:20},
{width:14},
{width:9},
{width:9},
{width:9},
{width:9},
{width:9},
{width:9},
{width:16},
{width:16},
{width:16},
{width:20}
];

inventorySheet.pageSetup={
paperSize:9,
orientation:"landscape",
fitToPage:true,
fitToWidth:1,
fitToHeight:0,
margins:{left:.3,right:.3,top:.4,bottom:.4,header:.2,footer:.2}
};

inventorySheet.headerFooter.oddFooter="Saint Clothing Inventory Report | Page &P of &N";

addSheetTitle(inventorySheet,"SAINT CLOTHING INVENTORY REPORT","Inventory management, stock availability and pre-order monitoring","N");

inventorySheet.mergeCells("A4:B4");
inventorySheet.getCell("A4").value="GENERATED";
inventorySheet.getCell("A4").font={name:"Arial",size:8,bold:true,color:{argb:gray}};

inventorySheet.mergeCells("A5:B5");
inventorySheet.getCell("A5").value=new Date();
inventorySheet.getCell("A5").numFmt="mmm d, yyyy h:mm AM/PM";
inventorySheet.getCell("A5").font={name:"Arial",size:10,bold:true,color:{argb:dark}};

inventorySheet.mergeCells("C4:D4");
inventorySheet.getCell("C4").value="EXPORTED BY";
inventorySheet.getCell("C4").font={name:"Arial",size:8,bold:true,color:{argb:gray}};

inventorySheet.mergeCells("C5:D5");
inventorySheet.getCell("C5").value=getAdminName();
inventorySheet.getCell("C5").font={name:"Arial",size:10,bold:true,color:{argb:dark}};

inventorySheet.mergeCells("J4:N4");
inventorySheet.getCell("J4").value="INVENTORY SUMMARY";
inventorySheet.getCell("J4").fill={type:"pattern",pattern:"solid",fgColor:{argb:dark}};
inventorySheet.getCell("J4").font={name:"Arial",size:9,bold:true,color:{argb:white}};
inventorySheet.getCell("J4").alignment={vertical:"middle",horizontal:"center"};

const summary=[
["J5","TOTAL PRODUCTS","L5",inventoryStats.products],
["J6","ACTUAL UNITS","L6",inventoryStats.totalStock],
["J7","PRE-ORDER UNITS","L7",inventoryStats.totalPreorder],
["J8","LOW / CRITICAL","L8",inventoryStats.lowStock+inventoryStats.criticalStock],
["J9","OUT OF STOCK","L9",inventoryStats.outStock]
];

summary.forEach(([labelCell,label,valueCell,value])=>{
const rowNumber=labelCell.slice(1);
inventorySheet.mergeCells(`${labelCell}:K${rowNumber}`);
inventorySheet.getCell(labelCell).value=label;
inventorySheet.getCell(labelCell).font={name:"Arial",size:8,bold:true,color:{argb:gray}};
inventorySheet.getCell(labelCell).alignment={vertical:"middle",horizontal:"right"};

inventorySheet.mergeCells(`${valueCell}:N${rowNumber}`);
inventorySheet.getCell(valueCell).value=value;
inventorySheet.getCell(valueCell).numFmt=integerFormat;
inventorySheet.getCell(valueCell).font={name:"Arial",size:10,bold:true,color:{argb:dark}};
inventorySheet.getCell(valueCell).alignment={vertical:"middle",horizontal:"right"};
});

inventorySheet.mergeCells("A9:H9");
inventorySheet.getCell("A9").value="CURRENT INVENTORY";
inventorySheet.getCell("A9").font={name:"Arial",size:11,bold:true,color:{argb:dark}};

const headerRow=11;
const headers=["SKU","ITEM NAME","CATEGORY","PRICE","S","M","L","XL","2XL","3XL","ACTUAL STOCK","PRE-ORDER","STATUS","RESTOCK DATE"];

headers.forEach((header,index)=>{
const cell=inventorySheet.getCell(headerRow,index+1);
cell.value=header;
styleHeader(cell);
});

inventorySheet.getRow(headerRow).height=26;

const exportProducts=filteredProducts.length?filteredProducts:products;
let currentRow=headerRow+1;

exportProducts.forEach((product,index)=>{
const actualStock=getTotalStock(product.stock);
const preorderStock=getTotalStock(product.preorderStock);
const status=getProductStatus(product);
const row=inventorySheet.getRow(currentRow);

row.values=[
product.sku||"N/A",
product.name||"Unnamed Product",
normalizeCategory(product.category)||"None",
Number(product.price||0),
getStock(product.stock,"S"),
getStock(product.stock,"M"),
getStock(product.stock,"L"),
getStock(product.stock,"XL"),
getStock(product.stock,"2XL"),
getStock(product.stock,"3XL"),
actualStock,
preorderStock,
status,
product.preorderRestockDate?new Date(product.preorderRestockDate):""
];

row.height=22;

for(let column=1;column<=14;column++)styleCell(row.getCell(column),index);

row.getCell(2).alignment={vertical:"middle",horizontal:"left"};
row.getCell(4).alignment={vertical:"middle",horizontal:"right"};
row.getCell(4).numFmt=currencyFormat;

for(let column=5;column<=12;column++)row.getCell(column).numFmt=integerFormat;

if(row.getCell(14).value instanceof Date)row.getCell(14).numFmt="mmm d, yyyy";

if(status==="Out"){
row.getCell(13).fill={type:"pattern",pattern:"solid",fgColor:{argb:redBg}};
row.getCell(13).font={name:"Arial",size:9,bold:true,color:{argb:red}};
}else if(status==="Critical"||status==="Pre-order"){
row.getCell(13).fill={type:"pattern",pattern:"solid",fgColor:{argb:orangeBg}};
row.getCell(13).font={name:"Arial",size:9,bold:true,color:{argb:orange}};
}else if(status==="Low"){
row.getCell(13).fill={type:"pattern",pattern:"solid",fgColor:{argb:amberBg}};
row.getCell(13).font={name:"Arial",size:9,bold:true,color:{argb:orange}};
}else{
row.getCell(13).fill={type:"pattern",pattern:"solid",fgColor:{argb:greenBg}};
row.getCell(13).font={name:"Arial",size:9,bold:true,color:{argb:green}};
}

if(actualStock<=5){
row.getCell(11).fill={type:"pattern",pattern:"solid",fgColor:{argb:redBg}};
row.getCell(11).font={name:"Arial",size:9,bold:true,color:{argb:red}};
}

currentRow++;
});

const totalRow=currentRow;

inventorySheet.mergeCells(`A${totalRow}:J${totalRow}`);
const totalLabel=inventorySheet.getCell(`A${totalRow}`);
totalLabel.value="TOTAL INVENTORY";
totalLabel.fill={type:"pattern",pattern:"solid",fgColor:{argb:dark}};
totalLabel.font={name:"Arial",size:10,bold:true,color:{argb:white}};
totalLabel.alignment={vertical:"middle",horizontal:"right"};
totalLabel.border=thinBorder;

inventorySheet.getCell(`K${totalRow}`).value=exportProducts.reduce((sum,product)=>sum+getTotalStock(product.stock),0);
inventorySheet.getCell(`L${totalRow}`).value=exportProducts.reduce((sum,product)=>sum+getTotalStock(product.preorderStock),0);
inventorySheet.getCell(`M${totalRow}`).value=`${exportProducts.length} ITEMS`;
inventorySheet.getCell(`N${totalRow}`).value="";

["K","L","M","N"].forEach((column)=>{
const cell=inventorySheet.getCell(`${column}${totalRow}`);
cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:column==="L"?gold:dark}};
cell.font={name:"Arial",size:10,bold:true,color:{argb:column==="L"?dark:white}};
cell.alignment={vertical:"middle",horizontal:"center"};
cell.border=thinBorder;
});

inventorySheet.getCell(`K${totalRow}`).numFmt=integerFormat;
inventorySheet.getCell(`L${totalRow}`).numFmt=integerFormat;
inventorySheet.getRow(totalRow).height=24;

if(exportProducts.length){
inventorySheet.autoFilter={
from:{row:headerRow,column:1},
to:{row:totalRow-1,column:14}
};
}

inventorySheet.views=[{state:"frozen",ySplit:headerRow}];
inventorySheet.pageSetup.printTitlesRow=`${headerRow}:${headerRow}`;
inventorySheet.pageSetup.printArea=`A1:N${totalRow}`;

const historySheet=workbook.addWorksheet("Inventory Updates");

historySheet.columns=[
{width:18},
{width:34},
{width:17},
{width:12},
{width:13},
{width:13},
{width:13},
{width:16},
{width:24},
{width:24}
];

historySheet.pageSetup={
paperSize:9,
orientation:"landscape",
fitToPage:true,
fitToWidth:1,
fitToHeight:0,
margins:{left:.3,right:.3,top:.4,bottom:.4,header:.2,footer:.2}
};

historySheet.headerFooter.oddFooter="Saint Clothing Inventory Updates | Page &P of &N";

addSheetTitle(historySheet,"SAINT CLOTHING INVENTORY UPDATES","Complete inventory movement and restocking history","J");

historySheet.mergeCells("A4:C4");
historySheet.getCell("A4").value="GENERATED";
historySheet.getCell("A4").font={name:"Arial",size:8,bold:true,color:{argb:gray}};

historySheet.mergeCells("A5:C5");
historySheet.getCell("A5").value=new Date();
historySheet.getCell("A5").numFmt="mmm d, yyyy h:mm AM/PM";
historySheet.getCell("A5").font={name:"Arial",size:10,bold:true,color:{argb:dark}};

historySheet.mergeCells("H4:J4");
historySheet.getCell("H4").value="TOTAL INVENTORY UPDATES";
historySheet.getCell("H4").fill={type:"pattern",pattern:"solid",fgColor:{argb:dark}};
historySheet.getCell("H4").font={name:"Arial",size:9,bold:true,color:{argb:white}};
historySheet.getCell("H4").alignment={vertical:"middle",horizontal:"center"};

historySheet.mergeCells("H5:J5");
historySheet.getCell("H5").value=inventoryLogs.length;
historySheet.getCell("H5").font={name:"Arial",size:14,bold:true,color:{argb:dark}};
historySheet.getCell("H5").alignment={vertical:"middle",horizontal:"center"};

const historyHeaderRow=8;
const historyHeaders=["SKU","ITEM NAME","STOCK TYPE","SIZE","OLD QTY","NEW QTY","CHANGE","DIRECTION","UPDATED BY","DATE"];

historyHeaders.forEach((header,index)=>{
const cell=historySheet.getCell(historyHeaderRow,index+1);
cell.value=header;
styleHeader(cell);
});

historySheet.getRow(historyHeaderRow).height=26;

inventoryLogs.forEach((log,index)=>{
const difference=Number(log.difference||0);
const row=historySheet.getRow(historyHeaderRow+1+index);

row.values=[
log.sku||"N/A",
log.productName||"Unknown Product",
log.stockType||"Actual",
log.size||"-",
Number(log.oldQty||0),
Number(log.newQty||0),
difference,
difference>0?"INCREASE":difference<0?"DECREASE":"NO CHANGE",
log.updatedBy||"Admin",
getLogDate(log)?new Date(getLogDate(log)):""
];

row.height=22;

for(let column=1;column<=10;column++)styleCell(row.getCell(column),index);

row.getCell(2).alignment={vertical:"middle",horizontal:"left"};
row.getCell(5).numFmt=integerFormat;
row.getCell(6).numFmt=integerFormat;
row.getCell(7).numFmt=integerFormat;

if(row.getCell(10).value instanceof Date)row.getCell(10).numFmt="mmm d, yyyy h:mm AM/PM";

if(difference>0){
row.getCell(7).fill={type:"pattern",pattern:"solid",fgColor:{argb:greenBg}};
row.getCell(7).font={name:"Arial",size:9,bold:true,color:{argb:green}};
row.getCell(8).fill={type:"pattern",pattern:"solid",fgColor:{argb:greenBg}};
row.getCell(8).font={name:"Arial",size:9,bold:true,color:{argb:green}};
}else if(difference<0){
row.getCell(7).fill={type:"pattern",pattern:"solid",fgColor:{argb:redBg}};
row.getCell(7).font={name:"Arial",size:9,bold:true,color:{argb:red}};
row.getCell(8).fill={type:"pattern",pattern:"solid",fgColor:{argb:redBg}};
row.getCell(8).font={name:"Arial",size:9,bold:true,color:{argb:red}};
}else{
row.getCell(7).fill={type:"pattern",pattern:"solid",fgColor:{argb:orangeBg}};
row.getCell(8).fill={type:"pattern",pattern:"solid",fgColor:{argb:orangeBg}};
}
});

if(inventoryLogs.length){
historySheet.autoFilter={
from:{row:historyHeaderRow,column:1},
to:{row:historyHeaderRow+inventoryLogs.length,column:10}
};
}

historySheet.views=[{state:"frozen",ySplit:historyHeaderRow}];
historySheet.pageSetup.printTitlesRow=`${historyHeaderRow}:${historyHeaderRow}`;

const buffer=await workbook.xlsx.writeBuffer();

saveAs(
new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
`Saint-Clothing-Inventory-${new Date().toISOString().slice(0,10)}.xlsx`
);

toast.success("Inventory Excel report exported successfully");
}catch(error){
console.error("EXPORT INVENTORY EXCEL ERROR:",error);
toast.error("Failed to export inventory report");
}finally{
setExportingExcel(false);
}
};

const handleStockChange=(productId,size,value)=>{
const safeValue=Math.max(0,Number(value)||0);
setStockUpdates((prev)=>({
...prev,
[productId]:{
...prev[productId],
[String(size).toUpperCase()]:safeValue
}
}));
};

const handlePreorderChange=(productId,size,value)=>{
const safeValue=Math.max(0,Number(value)||0);
setPreorderUpdates((prev)=>({
...prev,
[productId]:{
...prev[productId],
[String(size).toUpperCase()]:safeValue
}
}));
};

const openInventoryModal=(product)=>{
const actualAddInitial={};
const preorderAddInitial={};

sizesList.forEach((size)=>{
actualAddInitial[size]=0;
preorderAddInitial[size]=0;
});

setSelectedProduct(product);

setStockUpdates((prev)=>({
...prev,
[product._id]:actualAddInitial
}));

setPreorderUpdates((prev)=>({
...prev,
[product._id]:preorderAddInitial
}));

setPreorderEnabled(product.preorderEnabled!==false);
setPreorderThreshold(Number(product.preorderThreshold??5));
setPreorderAutoGenerate(product.preorderAutoGenerate!==false);
setPreorderAutoStock(Number(product.preorderAutoStock??20));
setPreorderRestockDate(formatDateInput(product.preorderRestockDate));
setPreorderNote(product.preorderNote||"");
};

const updateStock=async(productId)=>{
if(saving)return;
setSaving(true);

try{
const product=products.find((item)=>item._id===productId);

if(!product){
toast.error("Product not found");
return;
}

const stockToAdd={};
const preorderStockToAdd={};

sizesList.forEach((size)=>{
stockToAdd[size]=Number(stockUpdates?.[productId]?.[size]??0);
preorderStockToAdd[size]=Number(preorderUpdates?.[productId]?.[size]??0);
});

const hasActualAdd=sizesList.some((size)=>stockToAdd[size]>0);
const hasPreorderAdd=sizesList.some((size)=>preorderStockToAdd[size]>0);

const metaChanged=
Boolean(product.preorderEnabled!==false)!==Boolean(preorderEnabled)||
Number(product.preorderThreshold??5)!==Number(preorderThreshold)||
Boolean(product.preorderAutoGenerate!==false)!==Boolean(preorderAutoGenerate)||
Number(product.preorderAutoStock??20)!==Number(preorderAutoStock)||
formatDateInput(product.preorderRestockDate)!==preorderRestockDate||
String(product.preorderNote||"")!==String(preorderNote||"");

if(!hasActualAdd&&!hasPreorderAdd&&!metaChanged){
toast.info("Enter stock quantity to add");
return;
}

const confirmed=window.confirm("Are you sure you want to apply these inventory changes?");
if(!confirmed)return;

const res=await axios.put(
`${backendUrl}/api/product/update-stock/${productId}`,
{
stockToAdd,
preorderStockToAdd,
preorderEnabled,
preorderThreshold,
preorderAutoGenerate,
preorderAutoStock,
preorderRestockDate,
preorderNote,
updatedBy:getAdminName()
},
axiosConfig
);

if(res.data.success){
setSelectedProduct(null);
toast.success(res.data.message||"Stock added successfully");
await fetchInventoryLogs();

const updatedProductFromServer=res.data.product||{};
const finalStock=updatedProductFromServer.stock||product.stock;
const finalPreorderStock=updatedProductFromServer.preorderStock||product.preorderStock;

const updatedProducts=products.map((item)=>
item._id===productId
?{
...item,
stock:finalStock,
preorderStock:finalPreorderStock,
preorderEnabled,
preorderThreshold,
preorderAutoGenerate,
preorderAutoStock,
preorderRestockDate:preorderRestockDate||null,
preorderNote
}
:item
);

setProducts(updatedProducts);

const resetStockAdd={};
const resetPreorderAdd={};

sizesList.forEach((size)=>{
resetStockAdd[size]=0;
resetPreorderAdd[size]=0;
});

setStockUpdates((prev)=>({...prev,[productId]:resetStockAdd}));
setPreorderUpdates((prev)=>({...prev,[productId]:resetPreorderAdd}));
}else{
toast.error(res.data.message);
}
}catch(err){
toast.error(err.response?.data?.message||err.message);
}finally{
setSaving(false);
}
};

const clearInventoryLogs=()=>{
toast.info("Inventory logs are stored permanently in database");
};

const indexOfLastItem=currentPage*pageSize;
const indexOfFirstItem=indexOfLastItem-pageSize;
const paginatedProducts=filteredProducts.slice(indexOfFirstItem,indexOfLastItem);
const totalPages=Math.ceil(filteredProducts.length/pageSize);

const inventoryLogStart=(inventoryLogPage-1)*inventoryLogPageSize;
const inventoryLogEnd=inventoryLogStart+inventoryLogPageSize;
const paginatedInventoryLogs=inventoryLogs.slice(inventoryLogStart,inventoryLogEnd);
const inventoryLogTotalPages=Math.ceil(inventoryLogs.length/inventoryLogPageSize);

useEffect(()=>{
if(currentPage>totalPages&&totalPages>0)setCurrentPage(totalPages);
},[currentPage,totalPages]);

useEffect(()=>{
if(inventoryLogPage>inventoryLogTotalPages&&inventoryLogTotalPages>0)setInventoryLogPage(inventoryLogTotalPages);
if(inventoryLogs.length===0&&inventoryLogPage!==1)setInventoryLogPage(1);
},[inventoryLogPage,inventoryLogTotalPages,inventoryLogs.length]);

if(loading){
return(
<div className="min-h-screen bg-transparent p-3 pt-24 font-['Montserrat']">
<div className="animate-pulse space-y-3">
<div className="h-24 rounded-[5px] bg-white/70"/>
<div className="grid grid-cols-1 md:grid-cols-6 gap-3">
{[...Array(6)].map((_,i)=>(
<div key={i} className="h-28 rounded-[5px] bg-white/70"/>
))}
</div>
<div className="h-96 rounded-[5px] bg-white/70"/>
</div>
</div>
);
}

return(
<div className="min-h-screen bg-transparent px-2.5 sm:px-3 pt-20 sm:pt-24 pb-4 font-['Montserrat']">
<div className="max-w-[1500px] mx-auto">

<div className="rounded-[5px] bg-[#0A0D17] p-5 sm:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] mb-4 text-white border border-black/10 overflow-hidden relative">
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
<div className="min-w-0">
<p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/50 mb-2">Saint Clothing Admin</p>
<div className="flex items-center gap-3">
<div className="w-11 h-11 rounded-[5px] bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
<FaBoxes className="text-sm"/>
</div>
<div className="min-w-0">
<h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em]">Inventory Management</h1>
<p className="text-[11px] sm:text-sm text-white/65 mt-1">View locked stock levels and add restock quantities without directly manipulating inventory.</p>
</div>
</div>
</div>

<div className="flex flex-wrap items-center gap-2">
<button type="button" onClick={exportInventoryToExcel} disabled={exportingExcel} className="inline-flex items-center gap-2 rounded-[5px] bg-emerald-600 text-white px-4 py-2.5 text-sm font-black transition hover:bg-emerald-700 shadow-sm disabled:opacity-50">
<FaFileExcel/>
{exportingExcel?"Exporting...":"Export Excel"}
</button>

<button type="button" onClick={refreshInventory} disabled={refreshing} className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm disabled:opacity-50">
<FaSyncAlt className={refreshing?"animate-spin":""}/>
Refresh Stock
</button>
</div>
</div>
</div>

<div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
<div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
<div>
<h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17]">Stock Overview</h3>
<p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">Current inventory is read-only. Stock increases are handled through restocking transactions.</p>
</div>
</div>

<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
{[
{label:"Products",value:inventoryStats.products,icon:<FaStore/>,className:"text-[#0A0D17]"},
{label:"Actual Units",value:inventoryStats.totalStock,icon:<FaBoxes/>,className:"text-[#0A0D17]"},
{label:"Pre-order Units",value:inventoryStats.totalPreorder,icon:<FaClipboardList/>,className:"text-orange-700"},
{label:"Healthy",value:inventoryStats.healthyStock,icon:<FaBoxes/>,className:"text-emerald-700"},
{label:"Pre-order",value:inventoryStats.preorderStock,icon:<FaCalendarAlt/>,className:"text-orange-700"},
{label:"Out",value:inventoryStats.outStock,icon:<FaExclamationTriangle/>,className:"text-red-600"}
].map((item)=>(
<div key={item.label} className={`${softPanelBg} rounded-[5px] p-4 min-w-0 overflow-hidden transition hover:shadow-md`}>
<div className="flex items-center justify-between mb-2 gap-2">
<span className="text-xs font-medium text-[#6b7280]">{item.label}</span>
<div className="w-9 h-9 rounded-[5px] bg-[#111111]/8 flex items-center justify-center text-[#111111] shrink-0">{item.icon}</div>
</div>
<h2 className={`text-[24px] sm:text-[28px] font-black leading-none tracking-[-0.03em] ${item.className}`}>{item.value}</h2>
</div>
))}
</div>
</div>

<div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
<div className="grid grid-cols-1 xl:grid-cols-[1fr_180px_210px] gap-3 items-end">
<div>
<p className={labelClass}>Search Inventory</p>
<div className="relative mt-2">
<FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0D17]/35 text-sm"/>
<input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search product name or SKU..." className="w-full rounded-[5px] border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black"/>
</div>
</div>

<div>
<p className={labelClass}>Category</p>
<select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)} className={`${inputClass} mt-2`}>
{FIXED_CATEGORIES.map((cat)=>(
<option key={cat} value={cat}>{cat}</option>
))}
</select>
</div>

<div>
<p className={labelClass}>Stock Status</p>
<select value={stockFilter} onChange={(e)=>setStockFilter(e.target.value)} className={`${inputClass} mt-2`}>
<option value="All">All</option>
<option value="Healthy">Healthy</option>
<option value="Low">Low Stock</option>
<option value="Critical">Critical</option>
<option value="Pre-order">Pre-order</option>
<option value="Out">Out of Stock</option>
</select>
</div>
</div>
</div>

<div className={`${panelBg} rounded-[5px] overflow-hidden mb-4`}>
<div className="px-4 sm:px-5 py-5 border-b border-black/10">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
<div>
<p className={labelClass}>Stock Inventory</p>
<h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">Locked Current Stock</h3>
</div>
<p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/45">{filteredProducts.length} items</p>
</div>
</div>

<div className="hidden xl:block w-full">
<div className="grid grid-cols-[2fr_.9fr_.85fr_repeat(6,.38fr)_.5fr_.5fr_.75fr_.62fr] items-center gap-1 bg-[#0A0D17] text-white px-4 py-4 font-black text-[8px] uppercase tracking-[0.04em]">
<span>Product</span>
<span className="text-center">SKU</span>
<span className="text-center">Category</span>
{sizesList.map((size)=>(
<span key={size} className="text-center">{size}</span>
))}
<span className="text-center">Actual</span>
<span className="text-center">Pre</span>
<span className="text-center">Status</span>
<span className="text-center">Restock</span>
</div>

{paginatedProducts.length>0?paginatedProducts.map((product,index)=>{
const totalStock=getTotalStock(product.stock);
const totalPreorder=getTotalStock(product.preorderStock);
const status=getProductStatus(product);

return(
<div key={product._id} className={`grid grid-cols-[2fr_.9fr_.85fr_repeat(6,.38fr)_.5fr_.5fr_.75fr_.62fr] items-center gap-1 border-b border-[#ecece6] px-4 py-4 ${index%2===0?"bg-white":"bg-[#fcfcfb]"}`}>

<div className="flex items-center gap-2 min-w-0">
<div className="w-9 h-11 rounded-[5px] bg-[#f0f0ed] overflow-hidden border border-black/10 shrink-0">
{getCardImage(product)?(
<img src={getCardImage(product)} alt={product.name} className="w-full h-full object-cover" onError={(e)=>{e.currentTarget.style.display="none";}}/>
):(
<div className="w-full h-full flex items-center justify-center text-[7px] font-black text-black/30">IMG</div>
)}
</div>

<div className="min-w-0 flex-1 pr-1">
<p className="m-0 text-[10px] leading-[14px] font-black uppercase text-[#0A0D17] whitespace-normal break-words overflow-visible text-clip">
{product.name||"Unnamed Product"}
</p>
<p className="m-0 mt-1 text-[8px] leading-3 font-bold text-[#0A0D17]/40 whitespace-nowrap">
₱{Number(product.price||0).toLocaleString()}
</p>
</div>
</div>

<div className="min-w-0 px-1">
<p className="m-0 text-center text-[8px] leading-3 font-black text-[#0A0D17]/65 whitespace-normal break-all">
{product.sku||"N/A"}
</p>
</div>

<div className="min-w-0 text-center px-0.5">
<span className="inline-flex max-w-full justify-center rounded-[5px] bg-[#f3f3f1] border border-black/10 px-1.5 py-1 text-[7px] leading-3 font-black uppercase text-[#0A0D17]/60 whitespace-normal break-words">
{normalizeCategory(product.category)||"None"}
</span>
</div>

{sizesList.map((size)=>{
const qty=getStock(product.stock,size);
return(
<div key={size} className="min-w-0 text-center">
<span className={`inline-flex min-w-[25px] justify-center rounded-[4px] border px-1 py-1.5 text-[8px] font-black ${getStockBoxClass(qty)}`}>
{qty}
</span>
</div>
);
})}

<p className="m-0 text-center text-[10px] font-black text-[#0A0D17]">{totalStock}</p>
<p className="m-0 text-center text-[10px] font-black text-orange-700">{totalPreorder}</p>

<div className="min-w-0 text-center px-0.5">
<span className={`inline-flex max-w-full justify-center rounded-[5px] border px-1.5 py-1.5 text-[7px] leading-3 font-black uppercase tracking-[0.02em] whitespace-normal ${getInventoryStatusClass(status)}`}>
{status}
</span>
</div>

<div className="min-w-0 text-center">
<button type="button" onClick={()=>openInventoryModal(product)} className="inline-flex items-center justify-center gap-1 rounded-[5px] bg-[#0A0D17] px-2 py-2 text-[8px] font-black text-white transition hover:bg-[#1d2433]">
<FaEdit className="text-[8px]"/>
Add
</button>
</div>

</div>
);
}):(
<div className="p-12 text-center text-[#6b7280] font-semibold bg-white">No inventory found</div>
)}
</div>

<div className="xl:hidden divide-y divide-black/10">
{paginatedProducts.length>0?paginatedProducts.map((product)=>{
const totalStock=getTotalStock(product.stock);
const totalPreorder=getTotalStock(product.preorderStock);
const status=getProductStatus(product);

return(
<div key={product._id} className="p-4 bg-white">
<div className="flex items-start gap-3">
<div className="w-14 h-16 rounded-[5px] bg-[#f0f0ed] overflow-hidden border border-black/10 shrink-0">
{getCardImage(product)?(
<img src={getCardImage(product)} alt={product.name} className="w-full h-full object-cover" onError={(e)=>{e.currentTarget.style.display="none";}}/>
):(
<div className="w-full h-full flex items-center justify-center text-[8px] font-black text-black/30">IMG</div>
)}
</div>

<div className="min-w-0 flex-1">
<div className="flex items-start justify-between gap-2">
<div className="min-w-0 flex-1">
<p className="text-sm leading-5 font-black uppercase text-[#0A0D17] whitespace-normal break-words">{product.name||"Unnamed Product"}</p>
<p className="mt-1 text-[10px] font-bold text-[#0A0D17]/45 break-all">SKU: {product.sku||"N/A"}</p>
<p className="mt-1 text-[10px] font-bold text-[#0A0D17]/45">{normalizeCategory(product.category)||"None"} • ₱{Number(product.price||0).toLocaleString()}</p>
</div>

<span className={`shrink-0 inline-flex rounded-[5px] border px-2 py-1 text-[8px] font-black uppercase ${getInventoryStatusClass(status)}`}>
{status}
</span>
</div>
</div>
</div>

<div className="mt-4 grid grid-cols-6 gap-1.5">
{sizesList.map((size)=>{
const qty=getStock(product.stock,size);
return(
<div key={size} className={`rounded-[5px] border p-2 text-center ${getStockBoxClass(qty)}`}>
<p className="text-[8px] font-black uppercase opacity-60">{size}</p>
<p className="mt-1 text-xs font-black">{qty}</p>
</div>
);
})}
</div>

<div className="mt-3 grid grid-cols-2 gap-2">
<div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-2.5">
<p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#0A0D17]/40">Actual Stock</p>
<p className="mt-1 text-base font-black text-[#0A0D17]">{totalStock}</p>
</div>

<div className="rounded-[5px] border border-orange-100 bg-orange-50 p-2.5">
<p className="text-[8px] font-black uppercase tracking-[0.12em] text-orange-700/50">Pre-order</p>
<p className="mt-1 text-base font-black text-orange-700">{totalPreorder}</p>
</div>
</div>

<button type="button" onClick={()=>openInventoryModal(product)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-3 py-2.5 text-xs font-black text-white transition hover:bg-[#1d2433]">
<FaEdit/>
Add Stock
</button>
</div>
);
}):(
<div className="p-12 text-center text-[#6b7280] font-semibold bg-white">No inventory found</div>
)}
</div>
</div>

{filteredProducts.length>pageSize&&(
<div className={`${panelBg} mt-4 mb-4 rounded-[5px] px-4 py-4`}>
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">Page Control</p>
<p className="mt-1 text-xs font-semibold text-[#6b7280]">
Showing {indexOfFirstItem+1} - {Math.min(indexOfLastItem,filteredProducts.length)} of {filteredProducts.length} inventory items
</p>
</div>

<Pagination
className="saint-pagination"
current={currentPage}
pageSize={pageSize}
total={filteredProducts.length}
showSizeChanger
pageSizeOptions={["10","20","50","100"]}
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

<div className={`${panelBg} rounded-[5px] overflow-hidden`}>
<div className="px-4 sm:px-5 py-5 border-b border-black/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
<div>
<p className={labelClass}>Inventory History</p>
<h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">Recent Inventory Updates</h3>
{inventoryLogs.length>0&&(
<p className="mt-1 text-[11px] font-semibold text-[#6b7280]">
Showing {inventoryLogStart+1} - {Math.min(inventoryLogEnd,inventoryLogs.length)} of {inventoryLogs.length} inventory updates
</p>
)}
</div>

<div className="flex flex-wrap items-center gap-2">
{inventoryLogs.length>0&&(
<div className="flex items-center gap-2">
<span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0A0D17]/40">Rows</span>
<select
value={inventoryLogPageSize}
onChange={(e)=>{
setInventoryLogPageSize(Number(e.target.value));
setInventoryLogPage(1);
}}
className="rounded-[5px] border border-black/10 bg-white px-3 py-2 text-xs font-black text-[#0A0D17] outline-none focus:border-black"
>
<option value={10}>10</option>
<option value={20}>20</option>
<option value={50}>50</option>
<option value={100}>100</option>
</select>
</div>
)}

{inventoryLogs.length>0&&(
<button type="button" onClick={clearInventoryLogs} className={buttonLight}>
<FaTrash/>
Clear Logs
</button>
)}
</div>
</div>

<div className="divide-y divide-black/10">
{inventoryLogs.length===0?(
<div className="px-4 py-10 text-center text-xs font-black uppercase tracking-[0.2em] text-[#0A0D17]/35">No inventory update logs yet</div>
):(
paginatedInventoryLogs.map((log)=>(
<div key={getLogId(log)} className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 lg:items-center transition hover:bg-[#FAFAF8]">
<div className="min-w-0">
<p className="text-sm font-black uppercase text-[#0A0D17] whitespace-normal break-words">{log.productName||"Unknown Product"}</p>
<p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0A0D17]/45">
SKU: {log.sku||"N/A"} • {log.stockType||"Actual"} • Size {log.size||"-"}
</p>
</div>

<div className="flex gap-2 flex-wrap">
<span className="rounded-[5px] bg-[#f3f3f1] px-3 py-1 text-[10px] font-black text-[#0A0D17]/60">Old: {log.oldQty}</span>
<span className="rounded-[5px] bg-[#f3f3f1] px-3 py-1 text-[10px] font-black text-[#0A0D17]/60">New: {log.newQty}</span>
<span className={`rounded-[5px] px-3 py-1 text-[10px] font-black ${Number(log.difference)>0?"bg-emerald-50 text-emerald-700":Number(log.difference)<0?"bg-red-50 text-red-600":"bg-orange-50 text-orange-700"}`}>
{Number(log.difference)>0?`+${log.difference}`:log.difference}
</span>
</div>

<p className="text-[10px] font-bold text-[#0A0D17]/45 whitespace-nowrap">Updated by {log.updatedBy||"Admin"}</p>
<p className="text-[10px] font-bold text-[#0A0D17]/35 whitespace-nowrap">{getLogDate(log)?new Date(getLogDate(log)).toLocaleString():"No date"}</p>
</div>
))
)}
</div>

{inventoryLogs.length>0&&(
<div className="border-t border-black/10 bg-[#FAFAF8] px-4 sm:px-5 py-4">
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">History Page Control</p>
<p className="mt-1 text-xs font-semibold text-[#6b7280]">
Showing {inventoryLogStart+1} - {Math.min(inventoryLogEnd,inventoryLogs.length)} of {inventoryLogs.length} updates
</p>
</div>

<Pagination
className="saint-pagination"
current={inventoryLogPage}
pageSize={inventoryLogPageSize}
total={inventoryLogs.length}
showSizeChanger={false}
responsive
showLessItems
onChange={(page)=>setInventoryLogPage(page)}
/>
</div>
</div>
)}
</div>
</div>

{selectedProduct&&(
<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-start justify-center pt-14 md:pt-20 overflow-y-auto">
<div className="w-full max-w-5xl rounded-[5px] overflow-hidden bg-white shadow-[0_28px_100px_rgba(0,0,0,0.35)]">

<div className="px-6 py-5 bg-[#0A0D17] flex justify-between gap-4">
<div>
<p className="text-white/45 text-[10px] font-black uppercase tracking-[0.28em]">Add Stock / Restock</p>
<h3 className="mt-2 text-xl font-black uppercase text-white">{selectedProduct.name}</h3>
<p className="mt-1 text-white/45 text-[11px] font-bold uppercase tracking-[0.14em]">SKU: {selectedProduct.sku||"N/A"}</p>
</div>
<button type="button" onClick={()=>setSelectedProduct(null)} className="w-10 h-10 rounded-[5px] bg-white/10 text-white text-xl">×</button>
</div>

<div className="p-4 sm:p-6 bg-[#f7f7f4]">
<div className="grid lg:grid-cols-[240px_1fr] gap-4">

<div className={`${panelBg} rounded-[5px] overflow-hidden h-fit`}>
<div className="h-[240px] bg-[#eeeeeb]">
{getCardImage(selectedProduct)?(
<img src={getCardImage(selectedProduct)} alt={selectedProduct.name} className="w-full h-full object-cover"/>
):(
<div className="w-full h-full flex items-center justify-center text-xs font-black uppercase tracking-[0.2em] text-[#0A0D17]/30">No Image</div>
)}
</div>

<div className="p-4">
<p className={labelClass}>Current Actual Stock</p>
<p className="mt-1 text-3xl font-black text-[#0A0D17]">{getTotalStock(selectedProduct.stock)}</p>
<p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-orange-700">Current Pre-order Stock</p>
<p className="mt-1 text-3xl font-black text-orange-700">{getTotalStock(selectedProduct.preorderStock)}</p>
<span className={`mt-3 inline-flex rounded-[5px] border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getInventoryStatusClass(getProductStatus(selectedProduct))}`}>
{getProductStatus(selectedProduct)}
</span>
</div>
</div>

<div className="space-y-4">

<div className={`${panelBg} rounded-[5px] p-4 sm:p-5`}>
<p className={labelClass}>Add Actual Stock Per Size</p>

<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
{sizesList.map((size)=>{
const currentQty=getStock(selectedProduct.stock,size);
const addQty=Number(stockUpdates[selectedProduct._id]?.[size]??0);
const finalQty=currentQty+addQty;

return(
<div key={size} className={`rounded-[5px] border p-4 ${getAddBoxClass(addQty)}`}>
<p className="text-[10px] font-black uppercase tracking-[0.18em]">Size {size}</p>

<div className="mt-3 grid grid-cols-3 gap-2 text-center">
<div className="rounded-[5px] bg-white border border-black/10 px-2 py-2">
<p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#0A0D17]/40">Current</p>
<p className="text-sm font-black text-[#0A0D17]">{currentQty}</p>
</div>

<div>
<p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#0A0D17]/40 mb-1">Add</p>
<input
type="number"
min={0}
value={addQty}
onChange={(e)=>handleStockChange(selectedProduct._id,size,e.target.value)}
className="w-full rounded-[5px] border border-black/10 bg-white px-2 py-2 text-center text-sm font-black text-[#0A0D17] outline-none focus:border-[#0A0D17]"
/>
</div>

<div className="rounded-[5px] bg-white border border-black/10 px-2 py-2">
<p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#0A0D17]/40">After</p>
<p className="text-sm font-black text-emerald-700">{finalQty}</p>
</div>
</div>
</div>
);
})}
</div>
</div>

<div className="rounded-[5px] bg-white border border-orange-200 p-4 sm:p-5">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-700">Add Pre-order Stock</p>
<p className="mt-1 text-xs font-bold text-orange-700/70">Current pre-order stock is locked. Add only new pre-order slots.</p>
</div>

<div className="flex flex-wrap gap-3">
<label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0D17]">
<input type="checkbox" checked={preorderEnabled} onChange={(e)=>setPreorderEnabled(e.target.checked)}/>
Enable Pre-order
</label>

<label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0D17]">
<input type="checkbox" checked={preorderAutoGenerate} onChange={(e)=>setPreorderAutoGenerate(e.target.checked)}/>
Auto Generate
</label>
</div>
</div>

<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
{sizesList.map((size)=>{
const currentPreorder=getStock(selectedProduct.preorderStock,size);
const addPreorder=Number(preorderUpdates[selectedProduct._id]?.[size]??0);
const finalPreorder=currentPreorder+addPreorder;

return(
<div key={size} className={`rounded-[5px] border p-4 ${getPreorderBoxClass(addPreorder)}`}>
<p className="text-[10px] font-black uppercase tracking-[0.18em]">Pre-order {size}</p>

<div className="mt-3 grid grid-cols-3 gap-2 text-center">
<div className="rounded-[5px] bg-white border border-orange-100 px-2 py-2">
<p className="text-[8px] font-black uppercase tracking-[0.14em] text-orange-700/40">Current</p>
<p className="text-sm font-black text-orange-700">{currentPreorder}</p>
</div>

<div>
<p className="text-[8px] font-black uppercase tracking-[0.14em] text-orange-700/40 mb-1">Add</p>
<input
type="number"
min={0}
value={addPreorder}
onChange={(e)=>handlePreorderChange(selectedProduct._id,size,e.target.value)}
className="w-full rounded-[5px] border border-black/10 bg-white px-2 py-2 text-center text-sm font-black text-[#0A0D17] outline-none focus:border-orange-500"
/>
</div>

<div className="rounded-[5px] bg-white border border-orange-100 px-2 py-2">
<p className="text-[8px] font-black uppercase tracking-[0.14em] text-orange-700/40">After</p>
<p className="text-sm font-black text-orange-700">{finalPreorder}</p>
</div>
</div>
</div>
);
})}
</div>

<div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
<div>
<p className={labelClass}>Auto Pre-order Threshold</p>
<input type="number" min={0} value={preorderThreshold} onChange={(e)=>setPreorderThreshold(Number(e.target.value)||5)} className={`${inputClass} mt-2`}/>
</div>

<div>
<p className={labelClass}>Auto Generate Slots</p>
<input type="number" min={0} value={preorderAutoStock} onChange={(e)=>setPreorderAutoStock(Number(e.target.value)||20)} className={`${inputClass} mt-2`}/>
</div>

<div>
<p className={labelClass}>Expected Restock Date</p>
<input type="date" value={preorderRestockDate} onChange={(e)=>setPreorderRestockDate(e.target.value)} className={`${inputClass} mt-2`}/>
</div>
</div>

<div className="mt-4">
<p className={labelClass}>Pre-order Note</p>
<textarea
value={preorderNote}
onChange={(e)=>setPreorderNote(e.target.value)}
placeholder="Example: Ships once restocked."
className="mt-2 w-full min-h-[90px] rounded-[5px] border border-black/10 px-3 py-3 text-sm font-bold outline-none focus:border-orange-500"
/>
</div>

<div className="mt-4 rounded-[5px] border border-orange-200 bg-orange-50 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">Inventory Control Rule</p>
<p className="mt-2 text-xs font-bold leading-5 text-orange-700/80">
Current stock is read-only. Administrators can only add stock through restocking. Deduction happens through orders and backend inventory movements.
</p>
</div>
</div>

<div className="flex flex-wrap gap-2">
<button type="button" disabled={saving} onClick={()=>updateStock(selectedProduct._id)} className={`${buttonDark} ${saving?"opacity-60 cursor-not-allowed":""}`}>
{saving?"Saving...":"Save Added Stock"}
</button>

<button type="button" onClick={()=>setSelectedProduct(null)} className={buttonLight}>
Cancel
</button>
</div>

</div>
</div>

<div className={`${panelBg} mt-4 rounded-[5px] p-4 sm:p-5`}>
<div className="flex items-center gap-2">
<FaHistory className="text-[#0A0D17]/45"/>
<p className={labelClass}>Product Inventory History</p>
</div>

<div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto">
{inventoryLogs.filter((log)=>getLogProductId(log)===selectedProduct._id).length===0?(
<p className="text-xs font-bold text-[#0A0D17]/40">No inventory history for this product yet.</p>
):(
inventoryLogs
.filter((log)=>getLogProductId(log)===selectedProduct._id)
.map((log)=>(
<div key={getLogId(log)} className="rounded-[5px] border border-black/10 bg-[#fafaf8] p-3">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
<p className="text-[11px] font-black uppercase text-[#0A0D17]">
{log.stockType||"Actual"} • Size {log.size}: {log.oldQty} → {log.newQty}
</p>

<span className={`w-fit rounded-[5px] px-3 py-1 text-[10px] font-black ${log.difference>0?"bg-emerald-50 text-emerald-700":log.difference<0?"bg-red-50 text-red-600":"bg-orange-50 text-orange-700"}`}>
{log.difference>0?`+${log.difference}`:log.difference}
</span>
</div>

<p className="mt-1 text-[10px] font-bold text-[#0A0D17]/45">
Updated by {log.updatedBy} • {getLogDate(log)?new Date(getLogDate(log)).toLocaleString():"No date"}
</p>
</div>
))
)}
</div>
</div>
</div>
</div>
</div>
)}

</div>
);
};

export default SKU;