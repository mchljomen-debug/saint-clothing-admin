import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import { backendUrl, currency } from "../App";
import {
  FaArrowUp,
  FaArrowDown,
  FaPrint,
  FaSyncAlt,
  FaChartLine,
  FaShoppingCart,
  FaBoxOpen,
  FaUsers,
  FaMoneyBillWave,
  FaExclamationTriangle,
} from "react-icons/fa";
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
  "Mesh Short",
  "Crop Jersey",
];

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const normalizeCategory = (value = "") => {
  const clean = String(value).trim().toLowerCase();

  if (clean === "jorts") return "Jorts";
  if (clean === "crop jersey" || clean === "cropjersey") return "Crop Jersey";
  if (clean === "mesh short" || clean === "mesh shorts") return "Mesh Short";
  if (clean === "long sleeve" || clean === "longsleeve") return "Long Sleeve";
  if (clean === "tshirt" || clean === "t-shirt" || clean === "tee")
    return "Tshirt";

  return String(value).trim();
};

const SalesReport = () => {
  const navigate = useNavigate();

  const [overviewRange, setOverviewRange] = useState("month");
  const [salesTrendRange, setSalesTrendRange] = useState("week");
  const [revenueProfitRange, setRevenueProfitRange] = useState("year");
  const [categoryRange, setCategoryRange] = useState("month");
  const [topProductsRange, setTopProductsRange] = useState("month");
  const [lowStockRange] = useState("month");
  const [recentOrdersRange, setRecentOrdersRange] = useState("month");

  const [rawProducts, setRawProducts] = useState([]);
  const [rawOrders, setRawOrders] = useState([]);
  const [rawUsersCount, setRawUsersCount] = useState(0);

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
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const panelBg =
    "bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
  const softPanelBg = "bg-[#FAFAF8] border border-black/10";
  const labelClass =
    "text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";
  const buttonDark =
    "inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937] disabled:opacity-50";

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    buildReportSections();
  }, [
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

  useEffect(() => {
    const duration = 700;
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

  const getTrend = (current, previous) => {
    if (!previous || previous === 0) {
      return {
        percent: current > 0 ? 100 : 0,
        isUp: current >= previous,
      };
    }

    const change = ((current - previous) / previous) * 100;

    return {
      percent: Math.abs(change).toFixed(1),
      isUp: change >= 0,
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const [ordersRes, productRes, usersRes] = await Promise.all([
        axios.post(
          `${backendUrl}/api/order/list`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        axios.get(`${backendUrl}/api/product/list`),
        axios
          .get(`${backendUrl}/api/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => ({ data: { users: [] } })),
      ]);

      const orders = ordersRes?.data?.success ? ordersRes.data.orders || [] : [];
      const products = productRes?.data?.success
        ? productRes.data.products || []
        : [];
      const users = usersRes?.data?.users || [];

      setRawOrders(orders);
      setRawProducts(products);
      setRawUsersCount(users.length);
    } catch (err) {
      console.error("Sales report fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const buildOverviewStats = () => {
    const filteredOrders = filterOrdersByRange(rawOrders, overviewRange);

    const paidOrders = filteredOrders.filter(
      (order) =>
        order.payment === true ||
        order.payment === "true" ||
        order.paymentMethod
    );

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + (Number(order.amount) || 0),
      0
    );

    const totalOrders = filteredOrders.length;
    const totalProducts = rawProducts.length;
    const totalUsers = rawUsersCount;
    const netProfit = Math.floor(totalRevenue * 0.3);
    const netProfitMargin =
      totalRevenue > 0 ? Math.floor((netProfit / totalRevenue) * 100) : 0;
    const lowStockCount = rawProducts.filter(
      (product) => getProductTotalStock(product) <= 5
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

  const buildSalesTrend = () => {
    const paidOrders = filterOrdersByRange(rawOrders, salesTrendRange).filter(
      (order) =>
        order.payment === true ||
        order.payment === "true" ||
        order.paymentMethod
    );

    const labels = [];
    const data = [];
    const now = new Date();

    if (salesTrendRange === "today") {
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
    } else if (salesTrendRange === "week") {
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
    } else if (salesTrendRange === "month") {
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

  const buildRevenueProfit = () => {
    const paidOrders = filterOrdersByRange(rawOrders, revenueProfitRange).filter(
      (order) =>
        order.payment === true ||
        order.payment === "true" ||
        order.paymentMethod
    );

    const labels = [];
    const revenue = [];
    const netProfit = [];
    const now = new Date();

    if (revenueProfitRange === "today") {
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
    } else if (revenueProfitRange === "week") {
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
    } else if (revenueProfitRange === "month") {
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

  const buildCategoryOverview = () => {
    const rangedOrders = filterOrdersByRange(rawOrders, categoryRange);
    const soldCategoryMap = {};

    FIXED_CATEGORIES.forEach((cat) => {
      soldCategoryMap[cat] = 0;
    });

    rangedOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const product = rawProducts.find(
          (p) => String(p._id) === String(item.productId)
        );
        const category = normalizeCategory(
          product?.category || item.category || "Unknown"
        );
        const qty = Number(item.quantity) || 0;

        if (soldCategoryMap[category] === undefined) {
          soldCategoryMap[category] = 0;
        }

        soldCategoryMap[category] += qty;
      });
    });

    setCategorySales({
      labels: FIXED_CATEGORIES,
      data: FIXED_CATEGORIES.map((cat) => soldCategoryMap[cat] || 0),
    });
  };

  const buildTopProducts = () => {
    const rangedOrders = filterOrdersByRange(rawOrders, topProductsRange);
    const productSoldMap = {};

    rangedOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = item.name || item.productName || "Unknown Product";
        const qty = Number(item.quantity) || 0;
        const amount = (Number(item.price) || 0) * qty;

        if (!productSoldMap[key]) {
          productSoldMap[key] = {
            name: key,
            sold: 0,
            revenue: 0,
          };
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

  const buildLowStock = () => {
    setLowStockProducts(
      rawProducts
        .filter((product) => getProductTotalStock(product) <= 5)
        .map((product) => ({
          _id: product._id,
          name: product.name,
          category: normalizeCategory(product.category),
          branch: product.branch || "Main",
          stock: getProductTotalStock(product),
          price: product.price || 0,
        }))
        .sort((a, b) => a.stock - b.stock)
    );
  };

  const buildRecentOrders = () => {
    const rangedOrders = filterOrdersByRange(rawOrders, recentOrdersRange);

    setRecentOrders(
      [...rangedOrders].sort(
        (a, b) =>
          new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
      )
    );
  };

  const buildReportSections = () => {
    buildOverviewStats();
    buildSalesTrend();
    buildRevenueProfit();
    buildCategoryOverview();
    buildTopProducts();
    buildLowStock();
    buildRecentOrders();
  };

  const handlePrint = () => {
    const params = new URLSearchParams({
      overview: overviewRange,
      salesTrend: salesTrendRange,
      revenueProfit: revenueProfitRange,
      category: categoryRange,
      topProducts: topProductsRange,
      recentOrders: recentOrdersRange,
    });

    navigate(`/sales-report-print?${params.toString()}`);
  };

  const formatMoney = (value) =>
    `${currency}${Number(value || 0).toLocaleString()}`;

  const formatCompactNumber = (value) => {
    const numValue = Number(value || 0);

    if (numValue >= 1000000000) return `${Math.round(numValue / 1000000000)}b`;
    if (numValue >= 1000000) return `${Math.round(numValue / 1000000)}m`;
    if (numValue >= 1000) return `${Math.round(numValue / 1000)}k`;

    return numValue.toLocaleString();
  };

  const formatCompactCurrency = (value) => {
    const numValue = Number(value || 0);

    if (numValue >= 1000000000) {
      return `${currency}${Math.round(numValue / 1000000000)}b`;
    }

    if (numValue >= 1000000) {
      return `${currency}${Math.round(numValue / 1000000)}m`;
    }

    if (numValue >= 1000) {
      return `${currency}${Math.round(numValue / 1000)}k`;
    }

    return `${currency}${numValue.toLocaleString()}`;
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
      responsive: true,
      plugins: { legend: { display: false } },
    }),
    []
  );

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: "#111827" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#6b7280" },
          grid: { color: "rgba(0,0,0,0.06)" },
        },
        x: {
          ticks: { color: "#6b7280" },
          grid: { display: false },
        },
      },
    }),
    []
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#111827" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#6b7280" },
          grid: { color: "rgba(0,0,0,0.06)" },
        },
        x: {
          ticks: { color: "#6b7280" },
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
      className="min-w-[110px] rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm font-black text-[#0A0D17] outline-none transition focus:border-black"
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
    range,
    setRange,
    showFilter = true
  ) => (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className={labelClass}>Report Section</p>
        <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
          {title}
        </h2>
        <p className="mt-1 text-xs text-[#6b7280]">{subtitle}</p>
      </div>

      {showFilter && (
        <div className="print:hidden">
          <RangeSelect value={range} onChange={setRange} />
        </div>
      )}
    </div>
  );

  const ValueDisplay = ({ compact, full, className = "" }) => (
    <>
      <span className={`print:hidden ${className}`}>{compact}</span>
      <span className={`hidden print:inline ${className}`}>{full}</span>
    </>
  );

  const renderCategoryChart = (labels, data) => {
    const safeLabels = labels.length ? labels : ["No Data"];
    const safeData = data.length ? data.map((v) => (v > 0 ? v : 0.1)) : [1];

    return (
      <div className="grid grid-cols-1 gap-6 items-center lg:grid-cols-[220px_1fr] print:grid-cols-1">
        <div className="mx-auto w-full max-w-[220px] print:max-w-[180px]">
          <Doughnut
            data={{
              labels: safeLabels,
              datasets: [
                {
                  data: safeData,
                  backgroundColor: [
                    "#0A0D17",
                    "#374151",
                    "#b89a6b",
                    "#d6c2a1",
                    "#9ca3af",
                  ],
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
              key={label}
              className="flex items-center justify-between rounded-[5px] border border-black/10 bg-[#FAFAF8] px-4 py-3 print:rounded-none print:border print:bg-white print:px-3 print:py-2"
            >
              <span className="font-semibold text-gray-800">{label}</span>
              <span className="font-black text-gray-900">
                {data[index] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-3 pt-24 font-['Montserrat']">
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-[5px] bg-white/70" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-[5px] bg-white/70" />
            ))}
          </div>
          <div className="h-80 rounded-[5px] bg-white/70" />
          <div className="h-80 rounded-[5px] bg-white/70" />
        </div>
      </div>
    );
  }

  return (
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
                  <FaChartLine className="text-sm" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
                    Sales Report
                  </h1>

                  <p className="text-[11px] sm:text-sm text-white/65 mt-1 print:text-gray-500">
                    Generated: {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex items-center gap-2 rounded-[5px] bg-white/10 border border-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20"
              >
                <FaSyncAlt />
                Refresh
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm"
              >
                <FaPrint />
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
                title: "Total Sales",
                value: (
                  <ValueDisplay
                    compact={formatCompactCurrency(displayStats.totalRevenue)}
                    full={formatMoney(stats.totalRevenue)}
                  />
                ),
                subtitle: `${dailyTrend.percent}% vs previous period`,
                icon: <FaMoneyBillWave />,
                trend: dailyTrend,
              },
              {
                title: "Orders",
                value: (
                  <ValueDisplay
                    compact={formatCompactNumber(displayStats.totalOrders)}
                    full={stats.totalOrders.toLocaleString()}
                  />
                ),
                subtitle: "Total orders",
                icon: <FaShoppingCart />,
              },
              {
                title: "Net Profit",
                value: (
                  <ValueDisplay
                    compact={formatCompactCurrency(displayStats.netProfit)}
                    full={formatMoney(stats.netProfit)}
                  />
                ),
                subtitle: `Margin: ${displayStats.netProfitMargin}%`,
                icon: <FaChartLine />,
                trend: profitTrend,
              },
              {
                title: "Inventory",
                value: (
                  <ValueDisplay
                    compact={formatCompactNumber(displayStats.totalProducts)}
                    full={stats.totalProducts.toLocaleString()}
                  />
                ),
                subtitle: `${displayStats.lowStockCount} low stock`,
                icon: <FaBoxOpen />,
              },
              {
                title: "Users",
                value: (
                  <ValueDisplay
                    compact={formatCompactNumber(displayStats.totalUsers)}
                    full={stats.totalUsers.toLocaleString()}
                  />
                ),
                subtitle: `${revenueTrend.percent}% revenue trend`,
                icon: <FaUsers />,
              },
            ].map((item) => (
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
                  {item.trend &&
                    (item.trend.isUp ? (
                      <FaArrowUp className="text-emerald-600" />
                    ) : (
                      <FaArrowDown className="text-red-600" />
                    ))}
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
              "Sales performance over the selected period",
              salesTrendRange,
              setSalesTrendRange
            )}

            <div className="h-[320px] print:h-[240px]">
              <Line
                options={lineOptions}
                data={{
                  labels: weeklySales.labels.length
                    ? weeklySales.labels
                    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                  datasets: [
                    {
                      label: "Sales",
                      data: weeklySales.data.length
                        ? weeklySales.data
                        : [0, 0, 0, 0, 0, 0, 0],
                      borderColor: "#0A0D17",
                      backgroundColor: "rgba(184,154,107,0.18)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 3,
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 print:rounded-none print:shadow-none`}>
            {renderSectionHeader(
              "Top Products",
              "Best-performing items from selected orders",
              topProductsRange,
              setTopProductsRange
            )}

            <div
              className={`space-y-2 ${
                topProducts.length > 5 ? "max-h-[360px] overflow-y-auto pr-1" : ""
              } print-no-scroll`}
            >
              {topProducts.length ? (
                topProducts.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4 print:rounded-none print:bg-white print:p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-[#0A0D17] print:whitespace-normal">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#6b7280] print:text-xs">
                          {item.sold} units sold
                        </p>
                      </div>
                      <p className="shrink-0 font-black text-[#0A0D17]">
                        {formatMoney(item.revenue)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4 text-sm text-gray-500 print:rounded-none print:bg-white print:p-3">
                  No top product data available.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 print:rounded-none print:shadow-none`}>
          {renderSectionHeader(
            "Revenue & Profit",
            "Financial comparison for the selected period",
            revenueProfitRange,
            setRevenueProfitRange
          )}

          <div className="h-[340px] print:h-[240px]">
            <Bar
              options={barOptions}
              data={{
                labels: monthlySales.labels,
                datasets: [
                  {
                    label: "Revenue",
                    data: monthlySales.revenue,
                    backgroundColor: "#0A0D17",
                    borderRadius: 5,
                  },
                  {
                    label: "Profit",
                    data: monthlySales.netProfit,
                    backgroundColor: "#b89a6b",
                    borderRadius: 5,
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
              "Sold quantity by category",
              categoryRange,
              setCategoryRange
            )}
            {renderCategoryChart(categorySales.labels, categorySales.data)}
          </div>

          <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 print:rounded-none print:shadow-none`}>
            {renderSectionHeader(
              "Low Stock Alert",
              "Products that need restocking soon",
              lowStockRange,
              () => {},
              false
            )}

            <div
              className={`space-y-2 ${
                lowStockProducts.length > 5
                  ? "max-h-[360px] overflow-y-auto pr-1"
                  : ""
              } print-no-scroll`}
            >
              {lowStockProducts.length ? (
                lowStockProducts.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4 print:rounded-none print:bg-white print:p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-[#0A0D17] print:whitespace-normal">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#6b7280] print:text-xs">
                          {item.category} • {item.branch}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-black text-red-600">
                          {item.stock} left
                        </p>
                        <p className="text-xs text-[#6b7280] print:text-xs">
                          {formatMoney(item.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4 text-sm text-gray-500 print:rounded-none print:bg-white print:p-3">
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
              "Latest transaction activity for the selected period",
              recentOrdersRange,
              setRecentOrdersRange
            )}
          </div>

          <div
            className={`overflow-x-auto ${
              recentOrders.length > 10 ? "max-h-[460px] overflow-y-auto pr-1" : ""
            } print-no-scroll print-full-width`}
          >
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left print:min-w-0">
              <thead>
                <tr className="bg-[#0A0D17] text-white">
                  <th className="w-[20%] px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em]">
                    Order ID
                  </th>
                  <th className="w-[35%] px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em]">
                    Customer
                  </th>
                  <th className="w-[20%] px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em]">
                    Amount
                  </th>
                  <th className="w-[25%] px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em]">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.length ? (
                  recentOrders.map((order, i) => (
                    <tr
                      key={order._id}
                      className={`border-b border-[#ecece6] ${
                        i % 2 === 0 ? "bg-white" : "bg-[#fcfcfb]"
                      } print:bg-white`}
                    >
                      <td className="px-5 py-4 align-middle text-xs font-black text-[#0A0D17]">
                        #{order._id?.slice(-6)?.toUpperCase()}
                      </td>
                      <td className="px-5 py-4 align-middle text-xs font-semibold text-[#0A0D17]/70 truncate">
                        {`${order.address?.firstName || ""} ${
                          order.address?.lastName || ""
                        }`.trim() || "Guest"}
                      </td>
                      <td className="px-5 py-4 align-middle text-xs font-black text-[#0A0D17]">
                        {formatMoney(order.amount)}
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex rounded-[5px] border border-black/10 bg-[#FAFAF8] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#0A0D17]/70">
                          {order.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No recent orders available.
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
                max-height: none !important;
                overflow: visible !important;
              }
              .print-full-width {
                overflow: visible !important;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default SalesReport;