import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Link } from "react-router-dom";
import { backendUrl } from "../App";
import {
  FaArrowUp,
  FaArrowDown,
  FaFileExcel,
  FaBoxes,
  FaShoppingBag,
  FaUsers,
  FaMoneyBillWave,
  FaChartLine,
  FaStore,
  FaFilter,
} from "react-icons/fa";
import {
  exportDashboardWorkbook,
  exportSingleDashboardSection,
} from "../utils/dashboardExport";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const FIXED_CATEGORIES = [
  "Tshirt",
  "Long Sleeve",
  "Jorts",
  "Mesh Shorts",
  "Crop Jersey",
];

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const normalizeBranch = (value) => String(value || "").trim().toLowerCase();

const normalizeCategory = (value) => {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "Unknown";
  if (["tshirt", "t-shirt", "tee", "tees"].includes(raw)) return "Tshirt";
  if (["long sleeve", "longsleeve", "long sleeves"].includes(raw))
    return "Long Sleeve";
  if (["jorts"].includes(raw)) return "Jorts";
  if (["mesh short", "mesh shorts"].includes(raw)) return "Mesh Shorts";
  if (["crop jersey", "cropjersey"].includes(raw)) return "Crop Jersey";

  return value;
};

const isPaidOrder = (order) => {
  const paymentMethod = String(order?.paymentMethod || "")
    .trim()
    .toLowerCase();
  const paymentStatus = String(order?.paymentStatus || "")
    .trim()
    .toLowerCase();

  if (paymentMethod === "cod") {
    return paymentStatus === "paid" || String(order?.status || "").toLowerCase() === "delivered";
  }

  return paymentStatus === "paid" || order?.payment === true || order?.payment === "true";
};

const Dashboard = () => {
  const role = localStorage.getItem("role") || "";
  const branch = localStorage.getItem("branch") || "";
  const token = localStorage.getItem("token") || "";

  const [selectedBranch, setSelectedBranch] = useState(
    role === "admin" ? "all" : branch
  );

  const [overviewRange, setOverviewRange] = useState("month");
  const [weeklyChartRange, setWeeklyChartRange] = useState("week");
  const [monthlyChartRange, setMonthlyChartRange] = useState("year");
  const [categoryRange, setCategoryRange] = useState("month");
  const [topProductsRange, setTopProductsRange] = useState("month");
  const [lowStockRange, setLowStockRange] = useState("month");
  const [recentOrdersRange, setRecentOrdersRange] = useState("month");

  const [rawProducts, setRawProducts] = useState([]);
  const [rawOrders, setRawOrders] = useState([]);
  const [rawUsers, setRawUsers] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    netProfit: 0,
    netProfitMargin: 0,
    lowStockCount: 0,
  });

  const [displayStats, setDisplayStats] = useState(stats);

  const [weeklySales, setWeeklySales] = useState({ labels: [], data: [] });
  const [monthlySales, setMonthlySales] = useState({
    labels: [],
    revenue: [],
    netProfit: [],
  });

  const [categorySales, setCategorySales] = useState({ labels: [], data: [] });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    buildDashboardSections();
  }, [
    rawProducts,
    rawOrders,
    rawUsers,
    selectedBranch,
    overviewRange,
    weeklyChartRange,
    monthlyChartRange,
    categoryRange,
    topProductsRange,
    lowStockRange,
    recentOrdersRange,
    role,
  ]);

  useEffect(() => {
    const duration = 600;
    const start = performance.now();

    const animate = (time) => {
      const progress = Math.min((time - start) / duration, 1);

      setDisplayStats({
        totalRevenue: Math.floor(progress * stats.totalRevenue),
        totalOrders: Math.floor(progress * stats.totalOrders),
        totalProducts: Math.floor(progress * stats.totalProducts),
        totalUsers: Math.floor(progress * stats.totalUsers),
        netProfit: Math.floor(progress * stats.netProfit),
        netProfitMargin: stats.netProfitMargin,
        lowStockCount: Math.floor(progress * stats.lowStockCount),
      });

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [stats]);

  const shellBg = "bg-transparent text-[#111111]";
  const panelBg =
    "bg-white/75 backdrop-blur-md border border-black/8 shadow-[0_18px_50px_rgba(0,0,0,0.06)]";
  const softPanelBg =
    "bg-white/60 backdrop-blur-sm border border-black/[0.06]";
  const textMuted = "text-[#6b7280]";
  const textStrong = "text-[#0A0D17]";
  const tableRow = "border-[#ecece6]";

  const selectedBranchName = useMemo(() => {
    if (role !== "admin") return branch;
    if (selectedBranch === "all") return "All Branches";
    const match = availableBranches.find(
      (b) => normalizeBranch(b.code) === normalizeBranch(selectedBranch)
    );
    return match?.name || selectedBranch;
  }, [availableBranches, role, selectedBranch, branch]);

  const getProductTotalStock = (product) => {
    if (!product?.stock) return 0;
    if (typeof product.stock === "number") return product.stock;
    if (typeof product.stock === "object") {
      return Object.values(product.stock).reduce(
        (sum, qty) => sum + (Number(qty) || 0),
        0
      );
    }
    return 0;
  };

  const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString()}`;

  const formatCompactNumber = (value) => {
    const num = Number(value || 0);

    if (num >= 1000000000) return `${Math.round(num / 1000000000)}b`;
    if (num >= 1000000) return `${Math.round(num / 1000000)}m`;
    if (num >= 1000) return `${Math.round(num / 1000)}k`;

    return num.toLocaleString();
  };

  const formatCompactCurrency = (value) => {
    const num = Number(value || 0);

    if (num >= 1000000000) return `₱${Math.round(num / 1000000000)}b`;
    if (num >= 1000000) return `₱${Math.round(num / 1000000)}m`;
    if (num >= 1000) return `₱${Math.round(num / 1000)}k`;

    return `₱${num.toLocaleString()}`;
  };

  const getTrend = (current, previous) => {
    if (!previous || previous === 0) {
      return { percent: current > 0 ? 100 : 0, isUp: current >= previous };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      percent: Math.abs(change).toFixed(1),
      isUp: change >= 0,
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [productRes, ordersRes, usersRes, branchRes] = await Promise.all([
        axios.get(`${backendUrl}/api/product/list`),
        axios.get(`${backendUrl}/api/order/list`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        role === "admin"
          ? axios
            .get(`${backendUrl}/api/admin/users`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { users: [] } }))
          : Promise.resolve({ data: { users: [] } }),
        axios
          .get(`${backendUrl}/api/branch/list`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => ({ data: { branches: [] } })),
      ]);

      const products = productRes?.data?.success
        ? productRes.data.products || []
        : [];
      const orders = ordersRes?.data?.success
        ? ordersRes.data.orders || []
        : [];
      const users = usersRes?.data?.users || [];
      const branches = branchRes?.data?.success
        ? branchRes.data.branches || []
        : branchRes?.data?.branches || [];

      setRawProducts(products);
      setRawOrders(orders);
      setRawUsers(users);
      setAvailableBranches(branches.filter((b) => b.isActive));
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDateForRange = (range) => {
    const now = new Date();

    if (range === "today") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    if (range === "week") {
      const d = new Date();
      d.setDate(now.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    if (range === "month") {
      const d = new Date();
      d.setDate(now.getDate() - 29);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    if (range === "year") {
      const d = new Date();
      d.setMonth(now.getMonth() - 11);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    return new Date(0);
  };

  const filterOrdersByRange = (orders, range) => {
    const startDate = getStartDateForRange(range);

    return orders.filter((order) => {
      const orderDate = new Date(order.date || order.createdAt);
      return orderDate >= startDate;
    });
  };

  const getBranchFilteredData = () => {
    let products = [...rawProducts];
    let orders = [...rawOrders];
    const users = [...rawUsers];

    const branchToUse = role === "admin" ? selectedBranch : branch;
    const normalizedBranchToUse = normalizeBranch(branchToUse);

    if (normalizedBranchToUse !== "all") {
      products = products.filter(
        (p) => normalizeBranch(p.branch) === normalizedBranchToUse
      );

      orders = orders.filter((order) => {
        if (normalizeBranch(order.branch) === normalizedBranchToUse) return true;

        return (order.items || []).some(
          (item) => normalizeBranch(item.branch) === normalizedBranchToUse
        );
      });
    }

    return { products, orders, users };
  };

  const buildOverviewStats = (products, orders, users) => {
    const filteredOrders = filterOrdersByRange(orders, overviewRange);
    const paidOrders = filteredOrders.filter(isPaidOrder);

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + (Number(order.amount) || 0),
      0
    );

    const totalOrders = filteredOrders.length;
    const totalProducts = products.length;
    const totalUsers = role === "admin" ? users.length : 0;
    const netProfit = Math.floor(totalRevenue * 0.3);
    const netProfitMargin =
      totalRevenue > 0 ? Math.floor((netProfit / totalRevenue) * 100) : 0;

    const lowStockCount = products.filter(
      (p) => getProductTotalStock(p) <= 5
    ).length;

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

  const buildWeeklySales = (orders) => {
    const paidOrders = filterOrdersByRange(orders, weeklyChartRange).filter(
      isPaidOrder
    );

    const labels = [];
    const data = [];
    const now = new Date();

    if (weeklyChartRange === "today") {
      for (let i = 0; i < 24; i++) {
        const label = `${i}:00`;
        const total = paidOrders
          .filter(
            (order) => new Date(order.date || order.createdAt).getHours() === i
          )
          .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        labels.push(label);
        data.push(total);
      }
    } else if (weeklyChartRange === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);

        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        const total = paidOrders
          .filter((order) => {
            const od = new Date(order.date || order.createdAt);
            return (
              od.getFullYear() === d.getFullYear() &&
              od.getMonth() === d.getMonth() &&
              od.getDate() === d.getDate()
            );
          })
          .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        labels.push(label);
        data.push(total);
      }
    } else if (weeklyChartRange === "month") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);

        const label = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        const total = paidOrders
          .filter((order) => {
            const od = new Date(order.date || order.createdAt);
            return (
              od.getFullYear() === d.getFullYear() &&
              od.getMonth() === d.getMonth() &&
              od.getDate() === d.getDate()
            );
          })
          .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        labels.push(label);
        data.push(total);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("en-US", { month: "short" });
        const month = d.getMonth();
        const year = d.getFullYear();

        const total = paidOrders
          .filter((order) => {
            const od = new Date(order.date || order.createdAt);
            return od.getMonth() === month && od.getFullYear() === year;
          })
          .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        labels.push(label);
        data.push(total);
      }
    }

    setWeeklySales({ labels, data });
  };

  const buildMonthlySales = (orders) => {
    const paidOrders = filterOrdersByRange(orders, monthlyChartRange).filter(
      isPaidOrder
    );

    const labels = [];
    const revenue = [];
    const netProfit = [];
    const now = new Date();

    if (monthlyChartRange === "today") {
      for (let i = 0; i < 24; i++) {
        const label = `${i}:00`;
        const amount = paidOrders
          .filter(
            (order) => new Date(order.date || order.createdAt).getHours() === i
          )
          .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        labels.push(label);
        revenue.push(amount);
        netProfit.push(Math.floor(amount * 0.3));
      }
    } else if (monthlyChartRange === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);

        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        const amount = paidOrders
          .filter((order) => {
            const od = new Date(order.date || order.createdAt);
            return (
              od.getFullYear() === d.getFullYear() &&
              od.getMonth() === d.getMonth() &&
              od.getDate() === d.getDate()
            );
          })
          .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        labels.push(label);
        revenue.push(amount);
        netProfit.push(Math.floor(amount * 0.3));
      }
    } else if (monthlyChartRange === "month") {
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(now.getDate() - i * 7 - 6);
        const weekEnd = new Date();
        weekEnd.setDate(now.getDate() - i * 7);

        const label = `Week ${4 - i}`;
        const amount = paidOrders
          .filter((order) => {
            const od = new Date(order.date || order.createdAt);
            return od >= weekStart && od <= weekEnd;
          })
          .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        labels.push(label);
        revenue.push(amount);
        netProfit.push(Math.floor(amount * 0.3));
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("en-US", { month: "short" });
        const month = d.getMonth();
        const year = d.getFullYear();

        const amount = paidOrders
          .filter((order) => {
            const od = new Date(order.date || order.createdAt);
            return od.getMonth() === month && od.getFullYear() === year;
          })
          .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        labels.push(label);
        revenue.push(amount);
        netProfit.push(Math.floor(amount * 0.3));
      }
    }

    setMonthlySales({ labels, revenue, netProfit });
  };

  const buildCategorySales = (products, orders) => {
    const rangedOrders = filterOrdersByRange(orders, categoryRange).filter(
      isPaidOrder
    );

    const soldCategoryMap = {};
    FIXED_CATEGORIES.forEach((cat) => {
      soldCategoryMap[cat] = 0;
    });

    rangedOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const product = products.find(
          (p) => String(p._id) === String(item.productId)
        );

        const rawCategory = product?.category || item.category || "Unknown";
        const category = normalizeCategory(rawCategory);
        const qty = Number(item.quantity) || 0;

        if (soldCategoryMap[category] === undefined) soldCategoryMap[category] = 0;
        soldCategoryMap[category] += qty;
      });
    });

    setCategorySales({
      labels: FIXED_CATEGORIES,
      data: FIXED_CATEGORIES.map((cat) => soldCategoryMap[cat] || 0),
    });
  };

  const buildTopProducts = (orders) => {
    const rangedOrders = filterOrdersByRange(orders, topProductsRange).filter(
      isPaidOrder
    );
    const productSoldMap = {};

    rangedOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = item.name || item.productName || "Unknown Product";
        const qty = Number(item.quantity) || 0;
        const amount = (Number(item.price) || 0) * qty;

        if (!productSoldMap[key]) {
          productSoldMap[key] = { name: key, sold: 0, revenue: 0 };
        }

        productSoldMap[key].sold += qty;
        productSoldMap[key].revenue += amount;
      });
    });

    setTopProducts(
      Object.values(productSoldMap)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5)
    );
  };

  const buildLowStock = (products) => {
    setLowStockProducts(
      products
        .filter((p) => getProductTotalStock(p) <= 5)
        .map((p) => ({
          _id: p._id,
          name: p.name,
          category: normalizeCategory(p.category),
          branch: p.branch || "Main",
          stock: getProductTotalStock(p),
          price: p.price || 0,
        }))
        .sort((a, b) => a.stock - b.stock)
    );
  };

  const buildRecentOrders = (orders) => {
    const rangedOrders = filterOrdersByRange(orders, recentOrdersRange);

    setRecentOrders(
      [...rangedOrders].sort(
        (a, b) =>
          new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
      )
    );
  };

  const buildDashboardSections = () => {
    const { products, orders, users } = getBranchFilteredData();
    buildOverviewStats(products, orders, users);
    buildWeeklySales(orders);
    buildMonthlySales(orders);
    buildCategorySales(products, orders);
    buildTopProducts(orders);
    buildLowStock(products);
    buildRecentOrders(orders);
  };

  const exportOverviewExcel = async () => {
    await exportSingleDashboardSection({
      sheetTitle: "Overview",
      fileName: `saint_overview_${overviewRange}.xlsx`,
      subtitle: `Store summary for range: ${overviewRange}`,
      headers: [
        "Total Revenue",
        "Total Orders",
        "Total Products",
        "Total Users",
        "Net Profit",
        "Net Profit Margin",
        "Low Stock Count",
      ],
      rows: [[
        Number(stats.totalRevenue || 0),
        Number(stats.totalOrders || 0),
        Number(stats.totalProducts || 0),
        Number(stats.totalUsers || 0),
        Number(stats.netProfit || 0),
        `${stats.netProfitMargin}%`,
        Number(stats.lowStockCount || 0),
      ]],
      currencyColumns: [1, 5],
      numberColumns: [2, 3, 4, 7],
    });
  };

  const exportWeeklySalesExcel = async () => {
    await exportSingleDashboardSection({
      sheetTitle: "Sales Trend",
      fileName: `saint_sales_trend_${weeklyChartRange}.xlsx`,
      subtitle: `Sales movement over time • Range: ${weeklyChartRange}`,
      headers: ["Label", "Sales"],
      rows: weeklySales.labels.length
        ? weeklySales.labels.map((label, index) => [
          label,
          Number(weeklySales.data[index] || 0),
        ])
        : [["No data available", ""]],
      currencyColumns: [2],
    });
  };

  const exportMonthlySalesExcel = async () => {
    await exportSingleDashboardSection({
      sheetTitle: "Revenue and Profit",
      fileName: `saint_revenue_profit_${monthlyChartRange}.xlsx`,
      subtitle: `Financial comparison • Range: ${monthlyChartRange}`,
      headers: ["Label", "Revenue", "Profit"],
      rows: monthlySales.labels.length
        ? monthlySales.labels.map((label, index) => [
          label,
          Number(monthlySales.revenue[index] || 0),
          Number(monthlySales.netProfit[index] || 0),
        ])
        : [["No data available", "", ""]],
      currencyColumns: [2, 3],
    });
  };

  const exportCategoryExcel = async () => {
    await exportSingleDashboardSection({
      sheetTitle: "Category Overview",
      fileName: `saint_categories_${categoryRange}.xlsx`,
      subtitle: `Category sales performance • Range: ${categoryRange}`,
      headers: ["Category", "Sold"],
      rows: categorySales.labels.length
        ? categorySales.labels.map((label, index) => [
          label,
          Number(categorySales.data[index] || 0),
        ])
        : [["No data available", ""]],
      numberColumns: [2],
    });
  };

  const exportTopProductsExcel = async () => {
    await exportSingleDashboardSection({
      sheetTitle: "Top Products",
      fileName: `saint_top_products_${topProductsRange}.xlsx`,
      subtitle: `Best-selling items • Range: ${topProductsRange}`,
      headers: ["Product", "Units Sold", "Revenue"],
      rows: topProducts.length
        ? topProducts.map((item) => [
          item.name,
          Number(item.sold || 0),
          Number(item.revenue || 0),
        ])
        : [["No data available", "", ""]],
      numberColumns: [2],
      currencyColumns: [3],
    });
  };

  const exportLowStockExcel = async () => {
    await exportSingleDashboardSection({
      sheetTitle: "Low Stock Alert",
      fileName: `saint_low_stock_${lowStockRange}.xlsx`,
      subtitle: `Products needing restock • Range: ${lowStockRange}`,
      headers: ["Product", "Category", "Branch", "Stock Left", "Price"],
      rows: lowStockProducts.length
        ? lowStockProducts.map((item) => [
          item.name,
          item.category,
          item.branch,
          Number(item.stock || 0),
          Number(item.price || 0),
        ])
        : [["No data available", "", "", "", ""]],
      numberColumns: [4],
      currencyColumns: [5],
    });
  };

  const exportOrdersExcel = async () => {
    await exportSingleDashboardSection({
      sheetTitle: "Recent Orders",
      fileName: `saint_recent_orders_${recentOrdersRange}.xlsx`,
      subtitle: `Latest order activity • Range: ${recentOrdersRange}`,
      headers: [
        "Order ID",
        "Customer",
        "Amount",
        "Status",
        "Payment Method",
        "Date",
      ],
      rows: recentOrders.length
        ? recentOrders.map((order) => [
          order._id,
          `${order.address?.firstName || ""} ${order.address?.lastName || ""
            }`.trim() || "Customer",
          Number(order.amount || 0),
          order.status || "Pending",
          order.paymentMethod || "COD",
          new Date(order.date || order.createdAt).toLocaleString(),
        ])
        : [["No data available", "", "", "", "", ""]],
      currencyColumns: [3],
    });
  };

  const exportAllDashboardExcel = async () => {
    await exportDashboardWorkbook({
      role,
      branch,
      selectedBranch,
      overviewRange,
      weeklyChartRange,
      monthlyChartRange,
      categoryRange,
      topProductsRange,
      lowStockRange,
      recentOrdersRange,
      stats,
      weeklySales,
      monthlySales,
      categorySales,
      topProducts,
      lowStockProducts,
      recentOrders,
    });
  };

  const lastMonthRevenue = monthlySales.revenue.at(-1) || 0;
  const prevMonthRevenue = monthlySales.revenue.at(-2) || 0;
  const lastMonthProfit = monthlySales.netProfit.at(-1) || 0;
  const prevMonthProfit = monthlySales.netProfit.at(-2) || 0;
  const todaySales = weeklySales.data.at(-1) || 0;
  const yesterdaySales = weeklySales.data.at(-2) || 0;

  const revenueTrend = getTrend(lastMonthRevenue, prevMonthRevenue);
  const profitTrend = getTrend(lastMonthProfit, prevMonthProfit);
  const dailyTrend = getTrend(todaySales, yesterdaySales);

  const doughnutOptions = useMemo(
    () => ({
      cutout: "72%",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    }),
    []
  );

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { color: "#111", boxWidth: 12, boxHeight: 12 },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#475569" },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
        x: {
          ticks: { color: "#475569", maxRotation: 0, autoSkip: true },
          grid: { display: false },
        },
      },
    }),
    []
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          position: "top",
          labels: { color: "#111", boxWidth: 12, boxHeight: 12 },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#475569" },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
        x: {
          ticks: { color: "#475569", maxRotation: 0, autoSkip: true },
          grid: { display: false },
        },
      },
    }),
    []
  );

  const RangeSelect = ({ value, onChange }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-[92px] rounded-2xl px-3 py-2.5 text-xs sm:text-sm outline-none bg-white text-gray-900 border border-black/10 shadow-sm"
    >
      {RANGE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const renderSectionHeader = (
    title,
    subtitle,
    rangeValue,
    setRange,
    onExport
  ) => (
    <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h3
          className={`text-sm sm:text-[17px] font-black tracking-tight ${textStrong}`}
        >
          {title}
        </h3>
        <p className={`text-[11px] sm:text-xs ${textMuted} mt-0.5`}>
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <RangeSelect value={rangeValue} onChange={setRange} />
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#111111]"
        >
          <FaFileExcel className="shrink-0" />
          Export
        </button>
      </div>
    </div>
  );

  const renderDonutCard = (
    title,
    subtitle,
    labels,
    data,
    colors,
    rangeValue,
    setRange,
    onExport
  ) => {
    const safeData = data.length ? data.map((v) => (v > 0 ? v : 0.1)) : [1];
    const safeLabels = labels.length ? labels : ["No Data"];

    return (
      <div className={`${panelBg} rounded-[30px] p-4 sm:p-5`}>
        {renderSectionHeader(title, subtitle, rangeValue, setRange, onExport)}

        <div className="grid grid-cols-1 lg:grid-cols-[170px_1fr] gap-4 items-center">
          <div className="h-[180px] sm:h-[200px] relative">
            <Doughnut
              data={{
                labels: safeLabels,
                datasets: [
                  {
                    data: safeData,
                    backgroundColor: colors,
                    borderWidth: 0,
                  },
                ],
              }}
              options={doughnutOptions}
            />
          </div>

          <div className="space-y-2">
            {safeLabels.map((label, index) => (
              <div
                key={index}
                className={`${softPanelBg} flex items-center justify-between rounded-2xl px-3 py-3.5`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span
                    className={`text-xs sm:text-sm font-semibold ${textStrong} truncate`}
                  >
                    {label}
                  </span>
                </div>
                <span
                  className={`text-xs sm:text-sm font-black ${textStrong} ml-3`}
                >
                  {data[index] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-3 ${shellBg}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-[30px] bg-white/70" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-[28px] bg-white/70" />
            ))}
          </div>
          <div className="h-72 rounded-[30px] bg-white/70" />
        </div>
      </div>
    );
  }

  const kpiGridClass =
    role === "admin"
      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3"
      : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3";

  return (
    <div className="min-h-screen bg-transparent px-2.5 sm:px-3 pt-20 sm:pt-24 pb-4">
      <div className="max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-[250px_1fr] gap-3">
        <aside className={`${panelBg} rounded-[30px] p-4 h-fit`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0A0D17] via-[#1f2937] to-[#374151] flex items-center justify-center text-white shrink-0 shadow-md">
              <FaStore />
            </div>
            <div className="min-w-0">
              <h2
                className={`font-black text-sm tracking-tight ${textStrong} truncate`}
              >
                Saint Clothing
              </h2>
              <p className={`text-[11px] ${textMuted}`}>Control Center</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className={`${softPanelBg} rounded-2xl p-3.5`}>
              <p
                className={`text-[10px] uppercase tracking-[0.22em] ${textMuted}`}
              >
                View
              </p>
              <p className={`font-bold mt-1 text-xs sm:text-sm ${textStrong}`}>
                {role === "admin"
                  ? "Admin Dashboard"
                  : `${branch} Branch Dashboard`}
              </p>
            </div>

            <div className={`${softPanelBg} rounded-2xl p-3.5`}>
              <div className="flex items-center gap-2 mb-2">
                <FaFilter className={textMuted} />
                <p className={`font-bold text-xs sm:text-sm ${textStrong}`}>
                  Branch Filter
                </p>
              </div>

              {role === "admin" ? (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="mt-1 w-full rounded-2xl px-3 py-2.5 text-sm outline-none bg-white text-gray-900 border border-black/10"
                >
                  <option value="all">All Branches</option>
                  {availableBranches.map((b) => (
                    <option key={b._id || b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className={`mt-1 rounded-2xl px-3 py-2.5 text-sm bg-white border border-black/10 ${textStrong}`}
                >
                  {selectedBranchName}
                </div>
              )}
            </div>

            <div className={`${softPanelBg} rounded-2xl p-3.5`}>
              <p className={`font-bold mb-2 text-xs sm:text-sm ${textStrong}`}>
                Quick Actions
              </p>
              <div className="space-y-1.5">
                <Link
                  to="/sales-report"
                  className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm hover:bg-[#efefec] text-gray-900 transition"
                >
                  <FaChartLine />
                  Sales Report
                </Link>

                <button
                  onClick={exportAllDashboardExcel}
                  className="w-full flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm text-left hover:bg-[#efefec] text-gray-900 transition"
                >
                  <FaFileExcel />
                  Export All Dashboard
                </button>
              </div>
            </div>

            <div className={`${softPanelBg} rounded-2xl p-3.5`}>
              <p className={`font-bold mb-2 text-xs sm:text-sm ${textStrong}`}>
                Categories
              </p>
              <div className="space-y-1.5">
                {FIXED_CATEGORIES.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-2xl px-3 py-2.5 bg-white border border-black/5"
                  >
                    <span className={`text-xs sm:text-sm ${textStrong}`}>
                      {cat}
                    </span>
                    <span className={`text-xs sm:text-sm font-black ${textStrong}`}>
                      {categorySales.labels.includes(cat)
                        ? categorySales.data[categorySales.labels.indexOf(cat)]
                        : 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="rounded-[32px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.10),_transparent_34%),linear-gradient(135deg,#05070A_0%,#111827_45%,#1f2937_100%)] p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.22)] mb-4 text-white border border-white/10 overflow-hidden relative">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <FaStore className="text-sm" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-[22px] sm:text-[28px] font-black tracking-[-0.03em] truncate">
                      {role === "admin"
                        ? selectedBranch === "all"
                          ? "Saint Clothing Dashboard"
                          : `${selectedBranchName} Dashboard`
                        : `${selectedBranchName} Dashboard`}
                    </h1>
                    <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                      Sales, inventory, user activity, and branch performance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportAllDashboardExcel}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm"
                >
                  <FaFileExcel />
                  Export All
                </button>
              </div>
            </div>
          </div>

          <div className={`${panelBg} rounded-[30px] p-4 sm:p-5 mb-4`}>
            {renderSectionHeader(
              "Overview",
              "Store summary for the selected time period",
              overviewRange,
              setOverviewRange,
              exportOverviewExcel
            )}

            <div className={kpiGridClass}>
              <div
                className={`${softPanelBg} rounded-[26px] p-4 min-w-0 overflow-hidden transition hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className={`text-xs font-medium ${textMuted}`}>
                    Total Sales
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
                    <FaMoneyBillWave />
                  </div>
                </div>
                <h2
                  title={formatCurrency(displayStats.totalRevenue)}
                  className={`text-[22px] sm:text-[26px] xl:text-[30px] font-black leading-none tracking-[-0.03em] ${textStrong} truncate`}
                >
                  {formatCompactCurrency(displayStats.totalRevenue)}
                </h2>
                <div className="flex items-center mt-1.5 text-xs font-semibold flex-wrap gap-1">
                  {dailyTrend.isUp ? (
                    <FaArrowUp className="text-green-600" />
                  ) : (
                    <FaArrowDown className="text-red-500" />
                  )}
                  <span
                    className={
                      dailyTrend.isUp ? "text-green-600" : "text-red-500"
                    }
                  >
                    {dailyTrend.percent}%
                  </span>
                </div>
              </div>

              <div
                className={`${softPanelBg} rounded-[26px] p-4 min-w-0 overflow-hidden transition hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className={`text-xs font-medium ${textMuted}`}>
                    Orders
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-[#111111]/8 flex items-center justify-center text-[#111111] shrink-0">
                    <FaShoppingBag />
                  </div>
                </div>
                <h2
                  title={displayStats.totalOrders.toLocaleString()}
                  className={`text-[22px] sm:text-[26px] xl:text-[30px] font-black leading-none tracking-[-0.03em] ${textStrong} truncate`}
                >
                  {formatCompactNumber(displayStats.totalOrders)}
                </h2>
                <p className={`text-xs mt-1.5 ${textMuted}`}>Orders in range</p>
              </div>

              <div
                className={`${softPanelBg} rounded-[26px] p-4 min-w-0 overflow-hidden transition hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className={`text-xs font-medium ${textMuted}`}>
                    Net Profit
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-[#d4b483]/20 flex items-center justify-center text-[#8b6b3e] shrink-0">
                    <FaChartLine />
                  </div>
                </div>
                <h2
                  title={formatCurrency(displayStats.netProfit)}
                  className={`text-[22px] sm:text-[26px] xl:text-[30px] font-black leading-none tracking-[-0.03em] ${textStrong} truncate`}
                >
                  {formatCompactCurrency(displayStats.netProfit)}
                </h2>
                <div className="flex items-center mt-1.5 text-xs flex-wrap gap-1">
                  <span
                    className={
                      profitTrend.isUp
                        ? "text-green-600 font-semibold"
                        : "text-red-500 font-semibold"
                    }
                  >
                    {profitTrend.percent}%
                  </span>
                  <span className={`${textMuted}`}>
                    margin {displayStats.netProfitMargin}%
                  </span>
                </div>
              </div>

              <div
                className={`${softPanelBg} rounded-[26px] p-4 min-w-0 overflow-hidden transition hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className={`text-xs font-medium ${textMuted}`}>
                    Inventory
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                    <FaBoxes />
                  </div>
                </div>
                <h2
                  title={displayStats.totalProducts.toLocaleString()}
                  className={`text-[22px] sm:text-[26px] xl:text-[30px] font-black leading-none tracking-[-0.03em] ${textStrong} truncate`}
                >
                  {formatCompactNumber(displayStats.totalProducts)}
                </h2>
                <p className={`text-xs mt-1.5 ${textMuted}`}>
                  {displayStats.lowStockCount} low stock
                </p>
              </div>

              {role === "admin" && (
                <div
                  className={`${softPanelBg} rounded-[26px] p-4 min-w-0 overflow-hidden transition hover:shadow-md`}
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className={`text-xs font-medium ${textMuted}`}>
                      Users
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                      <FaUsers />
                    </div>
                  </div>
                  <h2
                    title={displayStats.totalUsers.toLocaleString()}
                    className={`text-[22px] sm:text-[26px] xl:text-[30px] font-black leading-none tracking-[-0.03em] ${textStrong} truncate`}
                  >
                    {formatCompactNumber(displayStats.totalUsers)}
                  </h2>
                  <p className={`text-xs mt-1.5 ${textMuted}`}>
                    Registered users
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-3">
            <div className={`${panelBg} xl:col-span-2 rounded-[30px] p-4 sm:p-5`}>
              {renderSectionHeader(
                "Sales Trend",
                "Sales movement over time",
                weeklyChartRange,
                setWeeklyChartRange,
                exportWeeklySalesExcel
              )}

              <Line
                options={lineOptions}
                data={{
                  labels: weeklySales.labels,
                  datasets: [
                    {
                      label: "Sales",
                      data: weeklySales.data,
                      borderColor: "#111827",
                      backgroundColor: "rgba(17,24,39,0.08)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 3,
                      pointHoverRadius: 4,
                    },
                  ],
                }}
              />
            </div>

            <div className={`${panelBg} rounded-[30px] p-4 sm:p-5`}>
              {renderSectionHeader(
                "Top Products",
                "Best-selling items",
                topProductsRange,
                setTopProductsRange,
                exportTopProductsExcel
              )}

              <div className="space-y-2">
                {topProducts.length ? (
                  topProducts.map((item, index) => (
                    <div
                      key={index}
                      className={`${softPanelBg} flex items-center justify-between p-3.5 rounded-2xl gap-3`}
                    >
                      <div className="min-w-0">
                        <p className={`font-bold text-sm ${textStrong} truncate`}>
                          {item.name}
                        </p>
                        <p className={`text-xs ${textMuted}`}>
                          {item.sold} units sold
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${textStrong}`}>
                          {formatCurrency(item.revenue)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`text-sm ${textMuted}`}>
                    No product sales data available.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`${panelBg} rounded-[30px] p-4 sm:p-5 mb-3`}>
            {renderSectionHeader(
              "Revenue and Profit",
              "Financial comparison over time",
              monthlyChartRange,
              setMonthlyChartRange,
              exportMonthlySalesExcel
            )}

            <Bar
              options={barOptions}
              data={{
                labels: monthlySales.labels,
                datasets: [
                  {
                    label: "Revenue",
                    data: monthlySales.revenue,
                    backgroundColor: "#111827",
                    borderRadius: 10,
                  },
                  {
                    label: "Profit",
                    data: monthlySales.netProfit,
                    backgroundColor: "#d4b483",
                    borderRadius: 10,
                  },
                ],
              }}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
            {renderDonutCard(
              "Category Overview",
              "Sales by category",
              categorySales.labels,
              categorySales.data,
              ["#111111", "#7b7b7b", "#d4b483", "#c4c4c4", "#4b4b4b"],
              categoryRange,
              setCategoryRange,
              exportCategoryExcel
            )}

            <div className={`${panelBg} rounded-[30px] p-4 sm:p-5`}>
              {renderSectionHeader(
                "Low Stock Alert",
                "Items that need restocking",
                lowStockRange,
                setLowStockRange,
                exportLowStockExcel
              )}

              <div
                className={`${lowStockProducts.length > 5 ? "max-h-[320px] overflow-y-auto pr-1" : ""
                  } space-y-2`}
              >
                {lowStockProducts.length ? (
                  lowStockProducts.map((item) => (
                    <div
                      key={item._id}
                      className={`${softPanelBg} flex items-center justify-between rounded-2xl px-3 py-3.5 gap-3`}
                    >
                      <div className="min-w-0">
                        <p className={`font-bold text-sm ${textStrong} truncate`}>
                          {item.name}
                        </p>
                        <p className={`text-xs ${textMuted}`}>
                          {item.category} • {item.branch}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-red-500">
                          {item.stock} left
                        </p>
                        <p className={`text-xs ${textMuted}`}>
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`text-sm ${textMuted}`}>
                    No low stock products right now.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`${panelBg} rounded-[30px] p-4 sm:p-5`}>
            {renderSectionHeader(
              "Recent Orders",
              "Latest order activity",
              recentOrdersRange,
              setRecentOrdersRange,
              exportOrdersExcel
            )}

            <div
              className={`overflow-x-auto ${recentOrders.length > 10 ? "max-h-[430px] overflow-y-auto pr-1" : ""
                }`}
            >
              <table className="w-full text-sm">
                <thead className="bg-[#f7f7f4]">
                  <tr className={`text-left ${textMuted} border-b ${tableRow}`}>
                    <th className="py-3 pr-3 sticky top-0 bg-[#f7f7f4] font-bold">
                      Customer
                    </th>
                    <th className="py-3 pr-3 sticky top-0 bg-[#f7f7f4] font-bold">
                      Amount
                    </th>
                    <th className="py-3 pr-3 sticky top-0 bg-[#f7f7f4] font-bold">
                      Status
                    </th>
                    <th className="py-3 sticky top-0 bg-[#f7f7f4] font-bold">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length ? (
                    recentOrders.map((order) => (
                      <tr
                        key={order._id}
                        className={`border-b last:border-b-0 ${tableRow}`}
                      >
                        <td className={`py-3 pr-3 font-semibold ${textStrong}`}>
                          {`${order.address?.firstName || ""} ${order.address?.lastName || ""
                            }`.trim() || "Customer"}
                        </td>
                        <td className={`py-3 pr-3 ${textStrong}`}>
                          {formatCurrency(order.amount || 0)}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#f1f1ee] text-[#444]">
                            {order.status || "Pending"}
                          </span>
                        </td>
                        <td className={`py-3 ${textMuted}`}>
                          {new Date(order.date || order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className={`py-4 text-center ${textMuted}`}>
                        No recent orders available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;