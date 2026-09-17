import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ExcelJS from "exceljs";
import { Line, Doughnut } from "react-chartjs-2";
import { useNavigate, useSearchParams } from "react-router-dom";
import { backendUrl, currency } from "../App";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaPrint } from "react-icons/fa";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const FIXED_CATEGORIES = ["Tshirt", "Long Sleeve", "Jorts", "Mesh Shorts", "Crop Jersey"];
const RANGE_OPTIONS = ["today", "week", "month", "year"];

const normalizeCategory = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "Unknown";
    if (["tshirt", "t-shirt", "tee", "tees"].includes(raw)) return "Tshirt";
    if (["long sleeve", "longsleeve", "long sleeves"].includes(raw)) return "Long Sleeve";
    if (raw === "jorts") return "Jorts";
    if (["mesh short", "mesh shorts"].includes(raw)) return "Mesh Shorts";
    if (["crop jersey", "cropjersey"].includes(raw)) return "Crop Jersey";
    return String(value || "Unknown");
};

const isPaidOrder = (order) => {
    const paymentMethod = String(order?.paymentMethod || "").trim().toLowerCase();
    const paymentStatus = String(order?.paymentStatus || "").trim().toLowerCase();
    const orderStatus = String(order?.status || "").trim().toLowerCase();

    if (paymentMethod === "cod") {
        return paymentStatus === "paid" || orderStatus === "delivered";
    }

    return paymentStatus === "paid" || order?.payment === true || order?.payment === "true";
};

const SalesReportPrint = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const reportRef = useRef(null);

    const safeRange = (value, fallback) => RANGE_OPTIONS.includes(value) ? value : fallback;

    const overviewRange = safeRange(searchParams.get("overview"), "month");
    const salesTrendRange = safeRange(searchParams.get("salesTrend"), "month");
    const categoryRange = safeRange(searchParams.get("category"), "month");
    const productRange = safeRange(searchParams.get("product"), "month");
    const recentOrdersRange = safeRange(searchParams.get("recentOrders"), "month");

    const [rawProducts, setRawProducts] = useState([]);
    const [rawOrders, setRawOrders] = useState([]);
    const [rawUsersCount, setRawUsersCount] = useState(0);
    const [salesInsight, setSalesInsight] = useState("");
    const [loading, setLoading] = useState(true);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [fetchError, setFetchError] = useState("");

    const formatMoney = (value) => `${currency}${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getProductTotalStock = (product) => {
        if (!product?.stock) return 0;
        if (typeof product.stock === "number") return Number(product.stock) || 0;

        if (typeof product.stock === "object") {
            return Object.values(product.stock).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
        }

        return 0;
    };

    const getDateWindowForRange = (range) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (range === "today") {
            const end = new Date(now);
            end.setDate(end.getDate() + 1);
            return { start: new Date(now), end };
        }

        if (range === "week") {
            const start = new Date(now);
            start.setDate(start.getDate() - 6);
            const end = new Date(now);
            end.setDate(end.getDate() + 1);
            return { start, end };
        }

        if (range === "month") {
            const start = new Date(now);
            start.setDate(start.getDate() - 29);
            const end = new Date(now);
            end.setDate(end.getDate() + 1);
            return { start, end };
        }

        return {
            start: new Date(now.getFullYear(), now.getMonth() - 11, 1),
            end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        };
    };

    const filterOrdersByRange = (orders, range) => {
        const { start, end } = getDateWindowForRange(range);

        return orders.filter((order) => {
            const value = order?.date || order?.createdAt;
            if (!value) return false;

            const date = new Date(value);

            return !Number.isNaN(date.getTime()) && date >= start && date < end;
        });
    };

    const extractArray = (response, keys = []) => {
        const data = response?.data;

        for (const key of keys) {
            if (Array.isArray(data?.[key])) return data[key];
        }

        if (Array.isArray(data?.data)) return data.data;

        for (const key of keys) {
            if (Array.isArray(data?.data?.[key])) return data.data[key];
        }

        return [];
    };

    const getRangeLabel = (range) => {
        if (range === "today") return "Today";
        if (range === "week") return "Last 7 Days";
        if (range === "month") return "Last 30 Days";
        return "Last 12 Months";
    };

    useEffect(() => {
        try {
            const raw = localStorage.getItem("saintSalesInsightV2");

            if (raw) {
                const parsed = JSON.parse(raw);
                setSalesInsight(parsed?.insight || "");
            }
        } catch (error) {
            console.error("[SALES PRINT] INSIGHT CACHE:", error);
        }

        const fetchData = async () => {
            setLoading(true);
            setFetchError("");

            const token = localStorage.getItem("token") || "";
            const role = localStorage.getItem("role") || "";
            const branch = localStorage.getItem("branch") || "";

            let products = [];
            let orders = [];
            let users = [];
            const errors = [];

            try {
                const productRes = await axios.get(`${backendUrl}/api/product/list`);
                products = extractArray(productRes, ["products"]);
            } catch (error) {
                errors.push(`Products: ${error?.response?.status || ""} ${error?.response?.data?.message || error?.message || "Request failed"}`);
            }

            try {
                const ordersRes = await axios.get(`${backendUrl}/api/order/list`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                orders = extractArray(ordersRes, ["orders"]);
            } catch (error) {
                errors.push(`Orders: ${error?.response?.status || ""} ${error?.response?.data?.message || error?.message || "Request failed"}`);
            }

            if (role === "admin") {
                try {
                    const usersRes = await axios.get(`${backendUrl}/api/admin/users`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    users = extractArray(usersRes, ["users"]);
                } catch (error) {
                    errors.push(`Users: ${error?.response?.status || ""} ${error?.response?.data?.message || error?.message || "Request failed"}`);
                }
            }

            if (role !== "admin" && branch && branch !== "all") {
                const normalizedBranch = String(branch).trim().toLowerCase();

                products = products.filter((product) => {
                    const productBranch = String(product?.branch || "").trim().toLowerCase();
                    return !productBranch || productBranch === normalizedBranch;
                });

                orders = orders.filter((order) => {
                    if (String(order?.branch || "").trim().toLowerCase() === normalizedBranch) return true;

                    return (order.items || []).some((item) => {
                        return String(item?.branch || "").trim().toLowerCase() === normalizedBranch;
                    });
                });
            }

            setRawProducts(products);
            setRawOrders(orders);
            setRawUsersCount(users.length);

            if (errors.length) setFetchError(errors.join(" | "));

            console.log("[SALES PRINT] PRODUCTS:", products.length);
            console.log("[SALES PRINT] ORDERS:", orders.length);
            console.log("[SALES PRINT] USERS:", users.length);

            setLoading(false);
        };

        fetchData();
    }, []);

    const overviewOrders = useMemo(() => {
        return filterOrdersByRange(rawOrders, overviewRange);
    }, [rawOrders, overviewRange]);

    const paidOrders = useMemo(() => {
        return overviewOrders.filter(isPaidOrder);
    }, [overviewOrders]);

    const stats = useMemo(() => {
        const totalRevenue = paidOrders.reduce((sum, order) => {
            return sum + (Number(order.amount) || 0);
        }, 0);

        const totalUnitsSold = paidOrders.reduce((sum, order) => {
            return sum + (order.items || []).reduce((itemSum, item) => {
                return itemSum + (Number(item?.quantity ?? item?.qty ?? 1) || 0);
            }, 0);
        }, 0);

        const netProfit = Math.floor(totalRevenue * .3);

        return {
            totalRevenue,
            totalOrders: overviewOrders.length,
            paidOrders: paidOrders.length,
            totalUnitsSold,
            netProfit,
            netProfitMargin: totalRevenue > 0 ? Math.round(netProfit / totalRevenue * 100) : 0,
            totalProducts: rawProducts.length,
            totalUsers: rawUsersCount,
            lowStockCount: rawProducts.filter((product) => getProductTotalStock(product) <= 5).length
        };
    }, [paidOrders, overviewOrders, rawProducts, rawUsersCount]);

    const productPerformance = useMemo(() => {
        const rangedPaidOrders = filterOrdersByRange(rawOrders, productRange).filter(isPaidOrder);
        const map = {};

        rawProducts.forEach((product) => {
            map[String(product._id)] = {
                _id: product._id,
                sku: product.sku || "-",
                name: product.name || "Unnamed Product",
                category: normalizeCategory(product.category),
                price: Number(product.price) || 0,
                stock: getProductTotalStock(product),
                sold: 0,
                revenue: 0
            };
        });

        rangedPaidOrders.forEach((order) => {
            (order.items || []).forEach((item) => {
                const itemProductId = String(
                    item?.productId?._id ||
                    item?.productId ||
                    item?.product?._id ||
                    item?.product ||
                    ""
                );

                const itemName = String(
                    item?.name ||
                    item?.productName ||
                    item?.productId?.name ||
                    item?.product?.name ||
                    ""
                ).trim();

                let product = null;

                if (itemProductId) {
                    product = rawProducts.find((p) => String(p._id) === itemProductId);
                }

                if (!product && itemName) {
                    product = rawProducts.find((p) => {
                        return String(p?.name || "").trim().toLowerCase() === itemName.toLowerCase();
                    });
                }

                const key = product ? String(product._id) : itemProductId || `name-${itemName}`;

                if (!key) return;

                if (!map[key]) {
                    map[key] = {
                        _id: key,
                        sku: item?.sku || "-",
                        name: itemName || "Unknown Product",
                        category: normalizeCategory(item?.category || "Unknown"),
                        price: Number(item?.price) || 0,
                        stock: 0,
                        sold: 0,
                        revenue: 0
                    };
                }

                const qty = Number(item?.quantity ?? item?.qty ?? 1) || 0;
                const price = Number(item?.price ?? product?.price ?? map[key].price) || 0;

                map[key].sold += qty;
                map[key].revenue += qty * price;
            });
        });

        return Object.values(map).sort((a, b) => b.revenue - a.revenue || b.sold - a.sold);
    }, [rawProducts, rawOrders, productRange]);

    const categoryPerformance = useMemo(() => {
        const rangedPaidOrders = filterOrdersByRange(rawOrders, categoryRange).filter(isPaidOrder);
        const map = {};

        FIXED_CATEGORIES.forEach((category) => {
            map[category] = {
                category,
                products: rawProducts.filter((product) => normalizeCategory(product.category) === category).length,
                unitsSold: 0,
                revenue: 0
            };
        });

        rawProducts.forEach((product) => {
            const category = normalizeCategory(product.category);

            if (!map[category]) {
                map[category] = { category, products: 0, unitsSold: 0, revenue: 0 };
            }

            if (!FIXED_CATEGORIES.includes(category)) {
                map[category].products += 1;
            }
        });

        rangedPaidOrders.forEach((order) => {
            (order.items || []).forEach((item) => {
                const itemProductId = String(
                    item?.productId?._id ||
                    item?.productId ||
                    item?.product?._id ||
                    item?.product ||
                    ""
                );

                const itemName = String(
                    item?.name ||
                    item?.productName ||
                    item?.productId?.name ||
                    item?.product?.name ||
                    ""
                ).trim();

                let product = rawProducts.find((p) => String(p._id) === itemProductId);

                if (!product && itemName) {
                    product = rawProducts.find((p) => {
                        return String(p?.name || "").trim().toLowerCase() === itemName.toLowerCase();
                    });
                }

                const category = normalizeCategory(
                    product?.category ||
                    item?.category ||
                    item?.productId?.category ||
                    item?.product?.category ||
                    "Unknown"
                );

                if (!map[category]) {
                    map[category] = { category, products: 0, unitsSold: 0, revenue: 0 };
                }

                const qty = Number(item?.quantity ?? item?.qty ?? 1) || 0;
                const price = Number(item?.price ?? product?.price) || 0;

                map[category].unitsSold += qty;
                map[category].revenue += qty * price;
            });
        });

        return Object.values(map);
    }, [rawOrders, rawProducts, categoryRange]);

    const lowStockProducts = useMemo(() => {
        return rawProducts
            .map((product) => ({
                _id: product._id,
                sku: product.sku || "-",
                name: product.name || "Unnamed Product",
                category: normalizeCategory(product.category),
                stock: getProductTotalStock(product),
                price: Number(product.price) || 0
            }))
            .filter((product) => product.stock <= 5)
            .sort((a, b) => a.stock - b.stock);
    }, [rawProducts]);

    const recentOrders = useMemo(() => {
        return [...filterOrdersByRange(rawOrders, recentOrdersRange)]
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    }, [rawOrders, recentOrdersRange]);

    const salesTrend = useMemo(() => {
        const rangedPaidOrders = filterOrdersByRange(rawOrders, salesTrendRange).filter(isPaidOrder);
        const labels = [];
        const data = [];
        const now = new Date();

        if (salesTrendRange === "today") {
            for (let i = 0; i < 24; i++) {
                labels.push(`${i}:00`);

                data.push(
                    rangedPaidOrders.filter((order) => {
                        return new Date(order.date || order.createdAt).getHours() === i;
                    }).reduce((sum, order) => sum + (Number(order.amount) || 0), 0)
                );
            }
        } else if (salesTrendRange === "week") {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);

                labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));

                data.push(
                    rangedPaidOrders.filter((order) => {
                        const od = new Date(order.date || order.createdAt);

                        return od.getFullYear() === d.getFullYear() &&
                            od.getMonth() === d.getMonth() &&
                            od.getDate() === d.getDate();
                    }).reduce((sum, order) => sum + (Number(order.amount) || 0), 0)
                );
            }
        } else if (salesTrendRange === "month") {
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);

                labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));

                data.push(
                    rangedPaidOrders.filter((order) => {
                        const od = new Date(order.date || order.createdAt);

                        return od.getFullYear() === d.getFullYear() &&
                            od.getMonth() === d.getMonth() &&
                            od.getDate() === d.getDate();
                    }).reduce((sum, order) => sum + (Number(order.amount) || 0), 0)
                );
            }
        } else {
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

                labels.push(d.toLocaleDateString("en-US", { month: "short" }));

                data.push(
                    rangedPaidOrders.filter((order) => {
                        const od = new Date(order.date || order.createdAt);

                        return od.getMonth() === d.getMonth() &&
                            od.getFullYear() === d.getFullYear();
                    }).reduce((sum, order) => sum + (Number(order.amount) || 0), 0)
                );
            }
        }

        return { labels, data };
    }, [rawOrders, salesTrendRange]);

    const categoryChart = useMemo(() => {
        return {
            labels: categoryPerformance.map((item) => item.category),
            data: categoryPerformance.map((item) => item.unitsSold)
        };
    }, [categoryPerformance]);

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: "rgba(10,13,23,.07)" },
                ticks: { font: { size: 8 } }
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 8 }, maxTicksLimit: 7 }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "64%",
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    boxWidth: 8,
                    usePointStyle: true,
                    font: { size: 8 },
                    padding: 10
                }
            }
        }
    };

    const handleDownloadPdf = async () => {
        if (!reportRef.current) return;

        try {
            setExportingPdf(true);

            await new Promise((resolve) => setTimeout(resolve, 300));

            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                scrollY: -window.scrollY,
                windowWidth: reportRef.current.scrollWidth,
                windowHeight: reportRef.current.scrollHeight
            });

            const image = canvas.toDataURL("image/jpeg", .95);
            const pdf = new jsPDF("p", "mm", "a4");

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imageHeight = canvas.height * pageWidth / canvas.width;

            let heightLeft = imageHeight;
            let position = 0;

            pdf.addImage(image, "JPEG", 0, position, pageWidth, imageHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imageHeight;
                pdf.addPage();
                pdf.addImage(image, "JPEG", 0, position, pageWidth, imageHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Saint-Clothing-Sales-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error("[PDF]", error);
            alert("Failed to generate PDF.");
        } finally {
            setExportingPdf(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            setExportingExcel(true);

            const workbook = new ExcelJS.Workbook();

            workbook.creator = "Saint Clothing";
            workbook.company = "Saint Clothing";
            workbook.subject = "Sales Performance Report";
            workbook.title = "Saint Clothing Sales Performance Report";
            workbook.created = new Date();

            const dark = "0A0D17";
            const gold = "D4B483";
            const lightGold = "EFE5D6";
            const white = "FFFFFF";
            const light = "F4F5F7";
            const lighter = "FAFAF8";
            const gray = "667085";
            const border = "C8CDD3";
            const red = "B42318";
            const redBg = "FEF3F2";
            const green = "067647";
            const greenBg = "ECFDF3";

            const thinBorder = {
                top: { style: "thin", color: { argb: border } },
                left: { style: "thin", color: { argb: border } },
                bottom: { style: "thin", color: { argb: border } },
                right: { style: "thin", color: { argb: border } }
            };

            const center = {
                vertical: "middle",
                horizontal: "center"
            };

            const right = {
                vertical: "middle",
                horizontal: "right"
            };

            const left = {
                vertical: "middle",
                horizontal: "left"
            };

            const currencyFormat = '"₱"#,##0.00';
            const integerFormat = '#,##0';

            const styleHeader = (cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: dark }
                };

                cell.font = {
                    name: "Arial",
                    size: 10,
                    bold: true,
                    color: { argb: white }
                };

                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true
                };

                cell.border = thinBorder;
            };

            const styleTableCell = (cell, rowIndex) => {
                cell.font = {
                    name: "Arial",
                    size: 9,
                    color: { argb: dark }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: rowIndex % 2 === 0 ? light : lighter }
                };

                cell.border = thinBorder;
                cell.alignment = {
                    vertical: "middle",
                    wrapText: true
                };
            };

            const addSheetTitle = (sheet, title, subtitle, lastColumn) => {
                sheet.mergeCells(`A1:${lastColumn}1`);

                const titleCell = sheet.getCell("A1");
                titleCell.value = title;
                titleCell.font = {
                    name: "Arial",
                    size: 20,
                    bold: true,
                    color: { argb: dark }
                };
                titleCell.alignment = {
                    vertical: "middle",
                    horizontal: "left"
                };

                sheet.getRow(1).height = 31;

                sheet.mergeCells(`A2:${lastColumn}2`);

                const subtitleCell = sheet.getCell("A2");
                subtitleCell.value = subtitle;
                subtitleCell.font = {
                    name: "Arial",
                    size: 9,
                    italic: true,
                    color: { argb: gray }
                };
                subtitleCell.alignment = {
                    vertical: "middle",
                    horizontal: "left"
                };

                sheet.getRow(2).height = 19;
            };

            const salesSheet = workbook.addWorksheet("Sales Report", {
                views: [{
                    state: "frozen",
                    ySplit: 10
                }]
            });

            salesSheet.properties.defaultRowHeight = 18;
            salesSheet.pageSetup = {
                paperSize: 9,
                orientation: "landscape",
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                margins: {
                    left: .3,
                    right: .3,
                    top: .4,
                    bottom: .4,
                    header: .2,
                    footer: .2
                }
            };

            salesSheet.headerFooter.oddFooter = "Saint Clothing Sales Performance Report | Page &P of &N";

            salesSheet.columns = [
                { key: "sku", width: 16 },
                { key: "name", width: 34 },
                { key: "category", width: 21 },
                { key: "price", width: 15 },
                { key: "qty", width: 13 },
                { key: "amount", width: 18 },
                { key: "stock", width: 17 }
            ];

            addSheetTitle(
                salesSheet,
                "SAINT CLOTHING SALES REPORT",
                "Product sales performance and inventory summary",
                "G"
            );

            salesSheet.mergeCells("A4:B4");
            salesSheet.getCell("A4").value = "REPORTING PERIOD";
            salesSheet.getCell("A4").font = {
                name: "Arial",
                size: 9,
                bold: true,
                color: { argb: gray }
            };
            salesSheet.getCell("A4").alignment = left;

            salesSheet.mergeCells("A5:B5");
            salesSheet.getCell("A5").value = getRangeLabel(productRange);
            salesSheet.getCell("A5").font = {
                name: "Arial",
                size: 11,
                bold: true,
                color: { argb: dark }
            };
            salesSheet.getCell("A5").alignment = left;

            salesSheet.mergeCells("C4:D4");
            salesSheet.getCell("C4").value = "GENERATED";
            salesSheet.getCell("C4").font = {
                name: "Arial",
                size: 9,
                bold: true,
                color: { argb: gray }
            };
            salesSheet.getCell("C4").alignment = center;

            salesSheet.mergeCells("C5:D5");
            salesSheet.getCell("C5").value = new Date();
            salesSheet.getCell("C5").numFmt = "mmm d, yyyy h:mm AM/PM";
            salesSheet.getCell("C5").font = {
                name: "Arial",
                size: 10,
                bold: true,
                color: { argb: dark }
            };
            salesSheet.getCell("C5").alignment = center;

            salesSheet.mergeCells("F4:G4");
            salesSheet.getCell("F4").value = "SALES SUMMARY";
            salesSheet.getCell("F4").fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: dark }
            };
            salesSheet.getCell("F4").font = {
                name: "Arial",
                size: 9,
                bold: true,
                color: { argb: white }
            };
            salesSheet.getCell("F4").alignment = center;

            const summaryRows = [
                ["F5", "TOTAL REVENUE", "G5", stats.totalRevenue, currencyFormat],
                ["F6", "PAID ORDERS", "G6", stats.paidOrders, integerFormat],
                ["F7", "UNITS SOLD", "G7", stats.totalUnitsSold, integerFormat],
                ["F8", "EST. NET PROFIT", "G8", stats.netProfit, currencyFormat]
            ];

            summaryRows.forEach(([labelCell, label, valueCell, value, numFmt]) => {
                salesSheet.getCell(labelCell).value = label;
                salesSheet.getCell(labelCell).font = {
                    name: "Arial",
                    size: 8,
                    bold: true,
                    color: { argb: gray }
                };
                salesSheet.getCell(labelCell).alignment = right;
                salesSheet.getCell(labelCell).border = {
                    bottom: { style: "thin", color: { argb: border } }
                };

                salesSheet.getCell(valueCell).value = value;
                salesSheet.getCell(valueCell).numFmt = numFmt;
                salesSheet.getCell(valueCell).font = {
                    name: "Arial",
                    size: 10,
                    bold: true,
                    color: { argb: dark }
                };
                salesSheet.getCell(valueCell).alignment = right;
                salesSheet.getCell(valueCell).border = {
                    bottom: { style: "thin", color: { argb: border } }
                };
            });

            salesSheet.mergeCells("A8:E8");
            salesSheet.getCell("A8").value = "PRODUCT SALES PERFORMANCE";
            salesSheet.getCell("A8").font = {
                name: "Arial",
                size: 11,
                bold: true,
                color: { argb: dark }
            };
            salesSheet.getCell("A8").alignment = left;

            const salesHeaderRow = 10;
            const salesHeaders = ["SKU", "ITEM NAME", "CATEGORY", "PRICE", "QTY SOLD", "SALES AMOUNT", "STOCK REMAINING"];

            salesHeaders.forEach((header, index) => {
                const cell = salesSheet.getCell(salesHeaderRow, index + 1);
                cell.value = header;
                styleHeader(cell);
            });

            salesSheet.getRow(salesHeaderRow).height = 25;

            let currentSalesRow = salesHeaderRow + 1;

            productPerformance.forEach((item, index) => {
                const row = salesSheet.getRow(currentSalesRow);

                row.values = [
                    item.sku || "-",
                    item.name,
                    item.category,
                    item.price,
                    item.sold,
                    item.revenue,
                    item.stock
                ];

                row.height = 22;

                for (let col = 1; col <= 7; col++) {
                    styleTableCell(row.getCell(col), index);
                }

                row.getCell(1).alignment = center;
                row.getCell(2).alignment = left;
                row.getCell(3).alignment = center;
                row.getCell(4).alignment = right;
                row.getCell(5).alignment = center;
                row.getCell(6).alignment = right;
                row.getCell(7).alignment = center;

                row.getCell(4).numFmt = currencyFormat;
                row.getCell(5).numFmt = integerFormat;
                row.getCell(6).numFmt = currencyFormat;
                row.getCell(7).numFmt = integerFormat;

                if (item.stock <= 5) {
                    row.getCell(7).fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: redBg }
                    };

                    row.getCell(7).font = {
                        name: "Arial",
                        size: 9,
                        bold: true,
                        color: { argb: red }
                    };
                } else {
                    row.getCell(7).font = {
                        name: "Arial",
                        size: 9,
                        bold: true,
                        color: { argb: dark }
                    };
                }

                currentSalesRow++;
            });

            if (!productPerformance.length) {
                const row = salesSheet.getRow(currentSalesRow);
                salesSheet.mergeCells(`A${currentSalesRow}:G${currentSalesRow}`);
                row.getCell(1).value = "No product sales data available.";
                row.getCell(1).alignment = center;
                row.getCell(1).font = {
                    name: "Arial",
                    size: 9,
                    italic: true,
                    color: { argb: gray }
                };
                row.getCell(1).border = thinBorder;
                row.height = 24;
                currentSalesRow++;
            }

            const salesTotalRow = currentSalesRow;

            salesSheet.mergeCells(`A${salesTotalRow}:D${salesTotalRow}`);
            salesSheet.getCell(`A${salesTotalRow}`).value = "TOTAL";
            salesSheet.getCell(`A${salesTotalRow}`).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: dark }
            };
            salesSheet.getCell(`A${salesTotalRow}`).font = {
                name: "Arial",
                size: 10,
                bold: true,
                color: { argb: white }
            };
            salesSheet.getCell(`A${salesTotalRow}`).alignment = right;
            salesSheet.getCell(`A${salesTotalRow}`).border = thinBorder;

            salesSheet.getCell(`E${salesTotalRow}`).value = productPerformance.reduce((sum, item) => sum + item.sold, 0);
            salesSheet.getCell(`E${salesTotalRow}`).numFmt = integerFormat;
            salesSheet.getCell(`E${salesTotalRow}`).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: dark }
            };
            salesSheet.getCell(`E${salesTotalRow}`).font = {
                name: "Arial",
                size: 10,
                bold: true,
                color: { argb: white }
            };
            salesSheet.getCell(`E${salesTotalRow}`).alignment = center;
            salesSheet.getCell(`E${salesTotalRow}`).border = thinBorder;

            salesSheet.getCell(`F${salesTotalRow}`).value = productPerformance.reduce((sum, item) => sum + item.revenue, 0);
            salesSheet.getCell(`F${salesTotalRow}`).numFmt = currencyFormat;
            salesSheet.getCell(`F${salesTotalRow}`).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: gold }
            };
            salesSheet.getCell(`F${salesTotalRow}`).font = {
                name: "Arial",
                size: 10,
                bold: true,
                color: { argb: dark }
            };
            salesSheet.getCell(`F${salesTotalRow}`).alignment = right;
            salesSheet.getCell(`F${salesTotalRow}`).border = thinBorder;

            salesSheet.getCell(`G${salesTotalRow}`).value = productPerformance.reduce((sum, item) => sum + item.stock, 0);
            salesSheet.getCell(`G${salesTotalRow}`).numFmt = integerFormat;
            salesSheet.getCell(`G${salesTotalRow}`).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: dark }
            };
            salesSheet.getCell(`G${salesTotalRow}`).font = {
                name: "Arial",
                size: 10,
                bold: true,
                color: { argb: white }
            };
            salesSheet.getCell(`G${salesTotalRow}`).alignment = center;
            salesSheet.getCell(`G${salesTotalRow}`).border = thinBorder;

            salesSheet.getRow(salesTotalRow).height = 24;

            if (productPerformance.length) {
                salesSheet.autoFilter = {
                    from: { row: salesHeaderRow, column: 1 },
                    to: { row: salesTotalRow - 1, column: 7 }
                };
            }

            salesSheet.views = [{
                state: "frozen",
                xSplit: 0,
                ySplit: salesHeaderRow
            }];

            salesSheet.pageSetup.printTitlesRow = `${salesHeaderRow}:${salesHeaderRow}`;
            salesSheet.pageSetup.printArea = `A1:G${salesTotalRow}`;

            const categorySheet = workbook.addWorksheet("Category Sales", {
                views: [{ state: "frozen", ySplit: 6 }]
            });

            categorySheet.columns = [
                { width: 28 },
                { width: 18 },
                { width: 18 },
                { width: 22 }
            ];

            addSheetTitle(
                categorySheet,
                "SAINT CLOTHING CATEGORY SALES",
                `Category performance • ${getRangeLabel(categoryRange)}`,
                "D"
            );

            const categoryHeaders = ["CATEGORY", "PRODUCTS", "UNITS SOLD", "SALES AMOUNT"];

            categoryHeaders.forEach((header, index) => {
                const cell = categorySheet.getCell(5, index + 1);
                cell.value = header;
                styleHeader(cell);
            });

            categorySheet.getRow(5).height = 24;

            categoryPerformance.forEach((item, index) => {
                const row = categorySheet.getRow(index + 6);

                row.values = [
                    item.category,
                    item.products,
                    item.unitsSold,
                    item.revenue
                ];

                row.height = 21;

                for (let col = 1; col <= 4; col++) {
                    styleTableCell(row.getCell(col), index);
                }

                row.getCell(1).alignment = left;
                row.getCell(2).alignment = center;
                row.getCell(3).alignment = center;
                row.getCell(4).alignment = right;
                row.getCell(4).numFmt = currencyFormat;
            });

            const categoryTotalRow = 6 + categoryPerformance.length;

            categorySheet.getCell(categoryTotalRow, 1).value = "TOTAL";
            categorySheet.getCell(categoryTotalRow, 2).value = categoryPerformance.reduce((sum, item) => sum + item.products, 0);
            categorySheet.getCell(categoryTotalRow, 3).value = categoryPerformance.reduce((sum, item) => sum + item.unitsSold, 0);
            categorySheet.getCell(categoryTotalRow, 4).value = categoryPerformance.reduce((sum, item) => sum + item.revenue, 0);
            categorySheet.getCell(categoryTotalRow, 4).numFmt = currencyFormat;

            for (let col = 1; col <= 4; col++) {
                const cell = categorySheet.getCell(categoryTotalRow, col);

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: dark }
                };

                cell.font = {
                    name: "Arial",
                    size: 9,
                    bold: true,
                    color: { argb: white }
                };

                cell.border = thinBorder;
                cell.alignment = col === 1 ? left : col === 4 ? right : center;
            }

            categorySheet.autoFilter = {
                from: { row: 5, column: 1 },
                to: { row: Math.max(5, categoryTotalRow - 1), column: 4 }
            };

            categorySheet.pageSetup = {
                paperSize: 9,
                orientation: "landscape",
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            };

            const inventorySheet = workbook.addWorksheet("Inventory Status", {
                views: [{ state: "frozen", ySplit: 6 }]
            });

            inventorySheet.columns = [
                { width: 17 },
                { width: 38 },
                { width: 22 },
                { width: 18 },
                { width: 16 },
                { width: 18 }
            ];

            addSheetTitle(
                inventorySheet,
                "SAINT CLOTHING INVENTORY STATUS",
                "Current product inventory and low-stock monitoring",
                "F"
            );

            const inventoryHeaders = ["SKU", "ITEM NAME", "CATEGORY", "PRICE", "STOCK", "STATUS"];

            inventoryHeaders.forEach((header, index) => {
                const cell = inventorySheet.getCell(5, index + 1);
                cell.value = header;
                styleHeader(cell);
            });

            inventorySheet.getRow(5).height = 24;

            const inventoryProducts = [...rawProducts]
                .map((product) => ({
                    sku: product.sku || "-",
                    name: product.name || "Unnamed Product",
                    category: normalizeCategory(product.category),
                    price: Number(product.price) || 0,
                    stock: getProductTotalStock(product)
                }))
                .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));

            inventoryProducts.forEach((item, index) => {
                const row = inventorySheet.getRow(index + 6);

                row.values = [
                    item.sku,
                    item.name,
                    item.category,
                    item.price,
                    item.stock,
                    item.stock <= 5 ? "LOW STOCK" : "IN STOCK"
                ];

                row.height = 21;

                for (let col = 1; col <= 6; col++) {
                    styleTableCell(row.getCell(col), index);
                }

                row.getCell(1).alignment = center;
                row.getCell(2).alignment = left;
                row.getCell(3).alignment = center;
                row.getCell(4).alignment = right;
                row.getCell(5).alignment = center;
                row.getCell(6).alignment = center;
                row.getCell(4).numFmt = currencyFormat;

                if (item.stock <= 5) {
                    row.getCell(5).fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: redBg }
                    };

                    row.getCell(5).font = {
                        name: "Arial",
                        size: 9,
                        bold: true,
                        color: { argb: red }
                    };

                    row.getCell(6).fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: redBg }
                    };

                    row.getCell(6).font = {
                        name: "Arial",
                        size: 9,
                        bold: true,
                        color: { argb: red }
                    };
                } else {
                    row.getCell(6).fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: greenBg }
                    };

                    row.getCell(6).font = {
                        name: "Arial",
                        size: 9,
                        bold: true,
                        color: { argb: green }
                    };
                }
            });

            inventorySheet.autoFilter = {
                from: { row: 5, column: 1 },
                to: { row: Math.max(5, 5 + inventoryProducts.length), column: 6 }
            };

            inventorySheet.pageSetup = {
                paperSize: 9,
                orientation: "landscape",
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            };

            const ordersSheet = workbook.addWorksheet("Orders", {
                views: [{ state: "frozen", ySplit: 6 }]
            });

            ordersSheet.columns = [
                { width: 28 },
                { width: 28 },
                { width: 16 },
                { width: 18 },
                { width: 20 },
                { width: 20 },
                { width: 23 }
            ];

            addSheetTitle(
                ordersSheet,
                "SAINT CLOTHING ORDER REPORT",
                `Order activity • ${getRangeLabel(recentOrdersRange)}`,
                "G"
            );

            const orderHeaders = [
                "ORDER ID",
                "CUSTOMER",
                "AMOUNT",
                "PAYMENT METHOD",
                "PAYMENT STATUS",
                "ORDER STATUS",
                "DATE"
            ];

            orderHeaders.forEach((header, index) => {
                const cell = ordersSheet.getCell(5, index + 1);
                cell.value = header;
                styleHeader(cell);
            });

            ordersSheet.getRow(5).height = 24;

            recentOrders.forEach((order, index) => {
                const customer =
                    `${order.address?.firstName || ""} ${order.address?.lastName || ""}`.trim() ||
                    order.customerName ||
                    order.userId?.name ||
                    "Customer";

                const row = ordersSheet.getRow(index + 6);

                row.values = [
                    String(order._id || ""),
                    customer,
                    Number(order.amount) || 0,
                    order.paymentMethod || "COD",
                    isPaidOrder(order) ? "Paid" : order.paymentStatus || "Pending",
                    order.status || "Pending",
                    order.date || order.createdAt ? new Date(order.date || order.createdAt) : ""
                ];

                row.height = 21;

                for (let col = 1; col <= 7; col++) {
                    styleTableCell(row.getCell(col), index);
                }

                row.getCell(1).alignment = left;
                row.getCell(2).alignment = left;
                row.getCell(3).alignment = right;
                row.getCell(4).alignment = center;
                row.getCell(5).alignment = center;
                row.getCell(6).alignment = center;
                row.getCell(7).alignment = center;

                row.getCell(3).numFmt = currencyFormat;

                if (row.getCell(7).value instanceof Date) {
                    row.getCell(7).numFmt = "mmm d, yyyy h:mm AM/PM";
                }

                if (isPaidOrder(order)) {
                    row.getCell(5).fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: greenBg }
                    };

                    row.getCell(5).font = {
                        name: "Arial",
                        size: 9,
                        bold: true,
                        color: { argb: green }
                    };
                }
            });

            ordersSheet.autoFilter = {
                from: { row: 5, column: 1 },
                to: { row: Math.max(5, 5 + recentOrders.length), column: 7 }
            };

            ordersSheet.pageSetup = {
                paperSize: 9,
                orientation: "landscape",
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            };

            const insightSheet = workbook.addWorksheet("Sales Insight");

            insightSheet.columns = [
                { width: 24 },
                { width: 90 }
            ];

            addSheetTitle(
                insightSheet,
                "SAINT CLOTHING SALES INSIGHT",
                "Sales report summary and management reference",
                "B"
            );

            const insightRows = [
                ["Reporting Period", getRangeLabel(overviewRange)],
                ["Generated", new Date()],
                ["Total Revenue", stats.totalRevenue],
                ["Total Orders", stats.totalOrders],
                ["Paid Orders", stats.paidOrders],
                ["Units Sold", stats.totalUnitsSold],
                ["Estimated Net Profit", stats.netProfit],
                ["Estimated Margin", `${stats.netProfitMargin}%`],
                ["Products", stats.totalProducts],
                ["Users", stats.totalUsers],
                ["Low Stock Products", stats.lowStockCount]
            ];

            insightRows.forEach(([label, value], index) => {
                const row = insightSheet.getRow(index + 5);

                row.getCell(1).value = label;
                row.getCell(2).value = value;

                row.getCell(1).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: index % 2 === 0 ? lightGold : light }
                };

                row.getCell(1).font = {
                    name: "Arial",
                    size: 9,
                    bold: true,
                    color: { argb: dark }
                };

                row.getCell(1).border = thinBorder;
                row.getCell(2).border = thinBorder;

                row.getCell(2).font = {
                    name: "Arial",
                    size: 9,
                    color: { argb: dark }
                };

                row.getCell(1).alignment = left;
                row.getCell(2).alignment = left;

                if (label === "Total Revenue" || label === "Estimated Net Profit") {
                    row.getCell(2).numFmt = currencyFormat;
                }

                if (value instanceof Date) {
                    row.getCell(2).numFmt = "mmm d, yyyy h:mm AM/PM";
                }
            });

            const insightStart = insightRows.length + 7;

            insightSheet.mergeCells(`A${insightStart}:B${insightStart}`);

            insightSheet.getCell(`A${insightStart}`).value = "SALES INSIGHT";
            insightSheet.getCell(`A${insightStart}`).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: dark }
            };
            insightSheet.getCell(`A${insightStart}`).font = {
                name: "Arial",
                size: 10,
                bold: true,
                color: { argb: white }
            };
            insightSheet.getCell(`A${insightStart}`).alignment = left;

            insightSheet.mergeCells(`A${insightStart + 1}:B${insightStart + 5}`);

            insightSheet.getCell(`A${insightStart + 1}`).value = salesInsight || "Sales Insight is currently unavailable.";
            insightSheet.getCell(`A${insightStart + 1}`).font = {
                name: "Arial",
                size: 9,
                color: { argb: dark }
            };
            insightSheet.getCell(`A${insightStart + 1}`).alignment = {
                vertical: "top",
                horizontal: "left",
                wrapText: true
            };
            insightSheet.getCell(`A${insightStart + 1}`).border = thinBorder;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `Saint-Clothing-Sales-Report-${new Date().toISOString().slice(0, 10)}.xlsx`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("[EXCEL]", error);
            alert("Failed to generate Excel report.");
        } finally {
            setExportingExcel(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F3F2EE] font-['Montserrat']">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-black/10 border-t-[#0A0D17]" />
                    <p className="text-xs font-black uppercase tracking-wider">Preparing Sales Report</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#E8E7E3] px-3 pb-3 pt-20 font-['Montserrat'] text-[#0A0D17] sm:px-5 sm:pb-5 sm:pt-18">
            <style>{`
@media print{
.no-print{display:none!important}
body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.report-sheet{box-shadow:none!important;margin:0!important;max-width:none!important}
}
.report-table-row{break-inside:avoid;page-break-inside:avoid}
.report-section{break-inside:auto}
`}</style>

            <div className="no-print mx-auto mb-4 max-w-[1100px]">
                <div className="flex flex-col gap-3 rounded-[5px] bg-[#0A0D17] p-4 text-white sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={() => navigate("/sales-report")}
                        className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-white/15 bg-white/10 px-4 py-2.5 text-[9px] font-black uppercase tracking-wider transition hover:bg-white/20"
                    >
                        <FaArrowLeft />
                        Back to Report
                    </button>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-[4px] border border-white/15 bg-white/10 px-4 py-2.5 text-[9px] font-black uppercase tracking-wider transition hover:bg-white/20"
                        >
                            <FaPrint />
                            Print
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={exportingPdf}
                            className="inline-flex items-center gap-2 rounded-[4px] bg-white px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-[#0A0D17] disabled:opacity-50"
                        >
                            <FaFilePdf />
                            {exportingPdf ? "Generating PDF..." : "Export PDF"}
                        </button>

                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={exportingExcel}
                            className="inline-flex items-center gap-2 rounded-[4px] bg-[#d4b483] px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-[#0A0D17] disabled:opacity-50"
                        >
                            <FaFileExcel />
                            {exportingExcel ? "Generating Excel..." : "Export Excel"}
                        </button>
                    </div>
                </div>

                {fetchError && (
                    <div className="mt-3 rounded-[5px] border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-wider text-red-700">Some report information could not be loaded</p>
                        <p className="mt-1 text-[10px] font-semibold text-red-600">{fetchError}</p>
                    </div>
                )}
            </div>

            <div ref={reportRef} className="report-sheet mx-auto max-w-[1100px] bg-white px-6 py-7 shadow-[0_12px_45px_rgba(0,0,0,.12)] sm:px-10 sm:py-9">

                <div className="flex items-end justify-between gap-5 border-b-[3px] border-[#0A0D17] pb-5">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <div className="h-[2px] w-7 bg-[#d4b483]" />
                            <p className="text-[8px] font-black uppercase tracking-[0.32em] text-[#9d825d]">Saint Clothing</p>
                        </div>

                        <h1 className="text-2xl font-black uppercase tracking-[-0.04em] sm:text-3xl">Sales Performance Report</h1>
                        <p className="mt-1 text-[9px] font-semibold text-gray-400">Sales, products, inventory and order performance</p>
                    </div>

                    <div className="shrink-0 text-right text-[8px] uppercase tracking-wider text-gray-400">
                        <p>Reporting Period</p>
                        <p className="mt-1 font-black text-[#0A0D17]">{getRangeLabel(overviewRange)}</p>
                        <p className="mt-2 normal-case tracking-normal">{new Date().toLocaleString()}</p>
                    </div>
                </div>

                {salesInsight && (
                    <div className="report-section mt-5 overflow-hidden border border-black/10">
                        <div className="flex items-center justify-between bg-[#0A0D17] px-4 py-2.5">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-white">Sales Insight</h2>
                            <div className="h-4 w-[3px] bg-[#d4b483]" />
                        </div>

                        <p className="px-4 py-4 text-[9px] font-medium leading-5 text-gray-600">
                            {salesInsight}
                        </p>
                    </div>
                )}

                <div className="report-section mt-6 grid grid-cols-1 gap-6 md:grid-cols-[.9fr_1.1fr]">
                    <div>
                        <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.14em]">Overall Sales Performance</h2>

                        <div className="relative overflow-hidden bg-[#0A0D17] p-5 text-white">
                            <div className="absolute bottom-0 left-0 h-[3px] w-full bg-[#d4b483]" />

                            <table className="w-full text-[9px]">
                                <tbody>
                                    <tr>
                                        <td className="border-b border-white/10 py-2 text-white/55">Total Revenue</td>
                                        <td className="border-b border-white/10 py-2 text-right font-black text-[#d4b483]">{formatMoney(stats.totalRevenue)}</td>
                                    </tr>

                                    <tr>
                                        <td className="border-b border-white/10 py-2 text-white/55">Total Orders</td>
                                        <td className="border-b border-white/10 py-2 text-right font-black">{stats.totalOrders}</td>
                                    </tr>

                                    <tr>
                                        <td className="border-b border-white/10 py-2 text-white/55">Paid Orders</td>
                                        <td className="border-b border-white/10 py-2 text-right font-black">{stats.paidOrders}</td>
                                    </tr>

                                    <tr>
                                        <td className="border-b border-white/10 py-2 text-white/55">Units Sold</td>
                                        <td className="border-b border-white/10 py-2 text-right font-black">{stats.totalUnitsSold}</td>
                                    </tr>

                                    <tr>
                                        <td className="border-b border-white/10 py-2 text-white/55">Estimated Net Profit</td>
                                        <td className="border-b border-white/10 py-2 text-right font-black">{formatMoney(stats.netProfit)}</td>
                                    </tr>

                                    <tr>
                                        <td className="border-b border-white/10 py-2 text-white/55">Profit Margin</td>
                                        <td className="border-b border-white/10 py-2 text-right font-black">{stats.netProfitMargin}%</td>
                                    </tr>

                                    <tr>
                                        <td className="border-b border-white/10 py-2 text-white/55">Products</td>
                                        <td className="border-b border-white/10 py-2 text-right font-black">{stats.totalProducts}</td>
                                    </tr>

                                    <tr>
                                        <td className="border-b border-white/10 py-2 text-white/55">Users</td>
                                        <td className="border-b border-white/10 py-2 text-right font-black">{stats.totalUsers}</td>
                                    </tr>

                                    <tr>
                                        <td className="py-2 text-white/55">Low Stock Products</td>
                                        <td className="py-2 text-right font-black">{stats.lowStockCount}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.14em]">Sales Trend</h2>

                        <div className="h-[250px] border border-black/10 p-3">
                            <Line
                                options={lineOptions}
                                data={{
                                    labels: salesTrend.labels,
                                    datasets: [{
                                        label: "Sales",
                                        data: salesTrend.data,
                                        borderColor: "#0A0D17",
                                        backgroundColor: "rgba(212,180,131,.22)",
                                        pointBackgroundColor: "#d4b483",
                                        pointBorderColor: "#0A0D17",
                                        pointRadius: 2,
                                        fill: true,
                                        tension: .35
                                    }]
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="report-section mt-7">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.14em]">Product Sales Performance</h2>
                        <p className="text-[7px] font-black uppercase tracking-wider text-gray-400">{getRangeLabel(productRange)}</p>
                    </div>

                    <table className="w-full border-collapse text-[8px]">
                        <thead>
                            <tr className="bg-[#0A0D17] text-white">
                                <th className="border border-[#0A0D17] px-3 py-2.5 text-left">SKU</th>
                                <th className="border border-[#0A0D17] px-3 py-2.5 text-left">Product</th>
                                <th className="border border-[#0A0D17] px-3 py-2.5 text-left">Category</th>
                                <th className="border border-[#0A0D17] px-3 py-2.5 text-right">Price</th>
                                <th className="border border-[#0A0D17] px-3 py-2.5 text-right">Units Sold</th>
                                <th className="border border-[#0A0D17] px-3 py-2.5 text-right">Revenue</th>
                                <th className="border border-[#0A0D17] px-3 py-2.5 text-right">Stock</th>
                            </tr>
                        </thead>

                        <tbody>
                            {productPerformance.length ? productPerformance.map((item, index) => (
                                <tr key={item._id || index} className={`report-table-row ${index % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}>
                                    <td className="border border-black/10 px-3 py-2 font-bold">{item.sku}</td>
                                    <td className="border border-black/10 px-3 py-2 font-bold">{item.name}</td>
                                    <td className="border border-black/10 px-3 py-2">{item.category}</td>
                                    <td className="border border-black/10 px-3 py-2 text-right">{formatMoney(item.price)}</td>
                                    <td className="border border-black/10 px-3 py-2 text-right font-black">{item.sold}</td>
                                    <td className="border border-black/10 px-3 py-2 text-right font-black">{formatMoney(item.revenue)}</td>
                                    <td className={`border border-black/10 px-3 py-2 text-right font-black ${item.stock <= 5 ? "text-red-600" : ""}`}>{item.stock}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="border border-black/10 px-3 py-5 text-center text-gray-400">No products found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="report-section mt-7 grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_.9fr]">
                    <div>
                        <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.14em]">Sales By Category</h2>

                        <table className="w-full border-collapse text-[8px]">
                            <thead>
                                <tr className="bg-[#0A0D17] text-white">
                                    <th className="border border-[#0A0D17] px-3 py-2.5 text-left">Category</th>
                                    <th className="border border-[#0A0D17] px-3 py-2.5 text-right">Products</th>
                                    <th className="border border-[#0A0D17] px-3 py-2.5 text-right">Units Sold</th>
                                    <th className="border border-[#0A0D17] px-3 py-2.5 text-right">Revenue</th>
                                </tr>
                            </thead>

                            <tbody>
                                {categoryPerformance.map((item, index) => (
                                    <tr key={item.category} className={`report-table-row ${index % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}>
                                        <td className="border border-black/10 px-3 py-2 font-bold">{item.category}</td>
                                        <td className="border border-black/10 px-3 py-2 text-right font-black">{item.products}</td>
                                        <td className="border border-black/10 px-3 py-2 text-right font-black">{item.unitsSold}</td>
                                        <td className="border border-black/10 px-3 py-2 text-right font-black">{formatMoney(item.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.14em]">Category Distribution</h2>

                        <div className="mx-auto h-[210px] max-w-[300px]">
                            <Doughnut
                                options={doughnutOptions}
                                data={{
                                    labels: categoryChart.labels.length ? categoryChart.labels : ["No Data"],
                                    datasets: [{
                                        data: categoryChart.data.some((value) => value > 0) ? categoryChart.data : [1],
                                        backgroundColor: ["#0A0D17", "#d4b483", "#4b4e58", "#9d825d", "#d9d7d1", "#6b7280"],
                                        borderWidth: 0
                                    }]
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="report-section mt-7">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.14em]">Inventory Status</h2>
                        <p className="text-[7px] font-black uppercase tracking-wider text-gray-400">Low stock threshold ≤ 5</p>
                    </div>

                    <table className="w-full border-collapse text-[8px]">
                        <thead>
                            <tr className="bg-[#d4b483] text-[#0A0D17]">
                                <th className="border border-[#c7a66f] px-3 py-2.5 text-left">SKU</th>
                                <th className="border border-[#c7a66f] px-3 py-2.5 text-left">Product</th>
                                <th className="border border-[#c7a66f] px-3 py-2.5 text-left">Category</th>
                                <th className="border border-[#c7a66f] px-3 py-2.5 text-right">Stock Left</th>
                                <th className="border border-[#c7a66f] px-3 py-2.5 text-right">Price</th>
                            </tr>
                        </thead>

                        <tbody>
                            {lowStockProducts.length ? lowStockProducts.map((item, index) => (
                                <tr key={item._id} className={`report-table-row ${index % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}>
                                    <td className="border border-black/10 px-3 py-2 font-bold">{item.sku}</td>
                                    <td className="border border-black/10 px-3 py-2 font-bold">{item.name}</td>
                                    <td className="border border-black/10 px-3 py-2">{item.category}</td>
                                    <td className="border border-black/10 px-3 py-2 text-right font-black text-red-600">{item.stock}</td>
                                    <td className="border border-black/10 px-3 py-2 text-right">{formatMoney(item.price)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="border border-black/10 px-3 py-5 text-center text-gray-400">No low stock products.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="report-section mt-7">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.14em]">Recent Orders</h2>
                        <p className="text-[7px] font-black uppercase tracking-wider text-gray-400">{getRangeLabel(recentOrdersRange)}</p>
                    </div>

                    <table className="w-full border-collapse text-[7.5px]">
                        <thead>
                            <tr className="bg-[#0A0D17] text-white">
                                <th className="border border-[#0A0D17] px-2 py-2.5 text-left">Order</th>
                                <th className="border border-[#0A0D17] px-2 py-2.5 text-left">Customer</th>
                                <th className="border border-[#0A0D17] px-2 py-2.5 text-right">Amount</th>
                                <th className="border border-[#0A0D17] px-2 py-2.5 text-left">Payment</th>
                                <th className="border border-[#0A0D17] px-2 py-2.5 text-left">Payment Status</th>
                                <th className="border border-[#0A0D17] px-2 py-2.5 text-left">Order Status</th>
                                <th className="border border-[#0A0D17] px-2 py-2.5 text-left">Date</th>
                            </tr>
                        </thead>

                        <tbody>
                            {recentOrders.length ? recentOrders.map((order, index) => (
                                <tr key={order._id || index} className={`report-table-row ${index % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}>
                                    <td className="border border-black/10 px-2 py-2 font-black">#{String(order._id || "").slice(-6).toUpperCase()}</td>

                                    <td className="border border-black/10 px-2 py-2">
                                        {`${order.address?.firstName || ""} ${order.address?.lastName || ""}`.trim() || order.customerName || order.userId?.name || "Customer"}
                                    </td>

                                    <td className="border border-black/10 px-2 py-2 text-right font-black">{formatMoney(order.amount)}</td>

                                    <td className="border border-black/10 px-2 py-2">{order.paymentMethod || "COD"}</td>

                                    <td className="border border-black/10 px-2 py-2 font-bold">
                                        {isPaidOrder(order) ? "Paid" : order.paymentStatus || "Pending"}
                                    </td>

                                    <td className="border border-black/10 px-2 py-2">
                                        {order.status || "Pending"}
                                    </td>

                                    <td className="border border-black/10 px-2 py-2">
                                        {order.date || order.createdAt ? new Date(order.date || order.createdAt).toLocaleDateString() : "-"}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="border border-black/10 px-3 py-5 text-center text-gray-400">No recent orders.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 flex items-end justify-between gap-6 border-t-2 border-[#0A0D17] pt-4">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.22em]">Saint Clothing</p>
                        <p className="mt-1 text-[7px] text-gray-400">Sales Performance Report</p>
                    </div>

                    <div className="max-w-[480px] text-right">
                        <p className="text-[6.5px] leading-3 text-gray-400">
                            Revenue includes paid non-COD orders and COD orders marked paid or delivered. Estimated net profit currently uses the report's 30% profit calculation.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SalesReportPrint;