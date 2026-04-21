import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { useNavigate, useSearchParams } from "react-router-dom";
import { backendUrl, currency } from "../App";
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

const RANGE_OPTIONS = ["today", "week", "month", "year"];

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

const SalesReportPrint = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportRef = useRef(null);

  const safeRange = (value, fallback) =>
    RANGE_OPTIONS.includes(value) ? value : fallback;

  const [overviewRange] = useState(
    safeRange(searchParams.get("overview"), "month")
  );
  const [salesTrendRange] = useState(
    safeRange(searchParams.get("salesTrend"), "week")
  );
  const [revenueProfitRange] = useState(
    safeRange(searchParams.get("revenueProfit"), "year")
  );
  const [categoryRange] = useState(
    safeRange(searchParams.get("category"), "month")
  );
  const [topProductsRange] = useState(
    safeRange(searchParams.get("topProducts"), "month")
  );
  const [recentOrdersRange] = useState(
    safeRange(searchParams.get("recentOrders"), "month")
  );

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

  const [weeklySales, setWeeklySales] = useState({
    labels: [],
    data: [],
  });

  const [monthlySales, setMonthlySales] = useState({
    labels: [],
    revenue: [],
    netProfit: [],
  });

  const [categorySales, setCategorySales] = useState({
    labels: [],
    data: [],
  });

  const [topProducts, setTopProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    fetchData();
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
    recentOrdersRange,
  ]);

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
      console.error("Print report fetch error:", err);
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

        if (soldCategoryMap[category] === undefined) soldCategoryMap[category] = 0;
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
        .slice(0, 10)
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

  const formatMoney = (value) =>
    `${currency}${Number(value || 0).toLocaleString()}`;

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;

    try {
      setExportingPdf(true);

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`saint-clothing-sales-report-${Date.now()}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Failed to generate PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#111827",
            font: { size: 11, weight: "600" },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#6b7280",
            callback: (value) => `${currency}${Number(value).toLocaleString()}`,
          },
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
          labels: {
            color: "#111827",
            font: { size: 11, weight: "600" },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#6b7280",
            callback: (value) => `${currency}${Number(value).toLocaleString()}`,
          },
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

  const doughnutOptions = useMemo(
    () => ({
      cutout: "72%",
      responsive: true,
      plugins: {
        legend: { display: false },
      },
    }),
    []
  );

  const renderCategoryChart = () => {
    const safeLabels = categorySales.labels.length ? categorySales.labels : ["No Data"];
    const safeData = categorySales.data.length
      ? categorySales.data.map((v) => (v > 0 ? v : 0.1))
      : [1];

    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[180px_1fr] items-center">
        <div className="mx-auto w-full max-w-[180px]">
          <Doughnut
            data={{
              labels: safeLabels,
              datasets: [
                {
                  data: safeData,
                  backgroundColor: [
                    "#0A0D17",
                    "#374151",
                    "#8b6f47",
                    "#c4a77d",
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
              className="flex items-center justify-between rounded-xl border border-black/10 bg-[#faf8f3] px-3 py-2"
            >
              <span className="font-semibold">{label}</span>
              <span className="font-bold">{categorySales.data[index] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-sm">Preparing report preview...</div>;
  }

  return (
    <div className="bg-[#f5f5f5] min-h-screen p-4 md:p-6 font-['Montserrat']">
      <style>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .report-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/sales-report")}
              className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#0A0D17]"
            >
              Back
            </button>

            <button
              onClick={handlePrint}
              className="rounded-2xl bg-[#0A0D17] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-white"
            >
              Print
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={exportingPdf}
              className="rounded-2xl bg-[#8b6f47] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-white disabled:opacity-60"
            >
              {exportingPdf ? "Generating PDF..." : "Download PDF"}
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Preview first, then print or download.
          </p>
        </div>

        <div
          ref={reportRef}
          className="report-sheet mx-auto max-w-[1200px] rounded-[28px] border border-black/10 bg-white p-8 text-black shadow-[0_18px_60px_rgba(0,0,0,0.08)]"
        >
          <div className="rounded-[24px] bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937] px-6 py-7 text-white text-center">
            <h1 className="text-3xl font-black uppercase tracking-[0.18em]">
              Saint Clothing
            </h1>
            <p className="mt-1 text-base font-semibold">Professional Sales Report</p>
            <p className="mt-1 text-xs text-white/70">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-[#0A0D17] via-[#111827] to-[#374151] p-4 text-white">
              <p className="text-xs font-black uppercase tracking-wide text-white/70">
                Total Sales
              </p>
              <p className="mt-2 text-xl font-black">{formatMoney(stats.totalRevenue)}</p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-[#f97316] to-[#fb923c] p-4 text-white">
              <p className="text-xs font-black uppercase tracking-wide text-white/80">
                Orders
              </p>
              <p className="mt-2 text-xl font-black">
                {stats.totalOrders.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-[#10b981] to-[#34d399] p-4 text-white">
              <p className="text-xs font-black uppercase tracking-wide text-white/80">
                Net Profit
              </p>
              <p className="mt-2 text-xl font-black">{formatMoney(stats.netProfit)}</p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-gray-700 to-gray-900 p-4 text-white">
              <p className="text-xs font-black uppercase tracking-wide text-white/80">
                Low Stock Count
              </p>
              <p className="mt-2 text-xl font-black">
                {stats.lowStockCount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-3 border-l-4 border-[#0A0D17] pl-3 text-lg font-black uppercase tracking-[0.08em]">
              Overview Summary
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#faf8f3]">
                  <th className="border border-black/10 px-3 py-2 text-left">Metric</th>
                  <th className="border border-black/10 px-3 py-2 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black/10 px-3 py-2">Total Sales</td>
                  <td className="border border-black/10 px-3 py-2">
                    {formatMoney(stats.totalRevenue)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black/10 px-3 py-2">Orders</td>
                  <td className="border border-black/10 px-3 py-2">
                    {stats.totalOrders.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black/10 px-3 py-2">Net Profit</td>
                  <td className="border border-black/10 px-3 py-2">
                    {formatMoney(stats.netProfit)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black/10 px-3 py-2">Net Profit Margin</td>
                  <td className="border border-black/10 px-3 py-2">
                    {stats.netProfitMargin}%
                  </td>
                </tr>
                <tr>
                  <td className="border border-black/10 px-3 py-2">Inventory</td>
                  <td className="border border-black/10 px-3 py-2">
                    {stats.totalProducts.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black/10 px-3 py-2">Users</td>
                  <td className="border border-black/10 px-3 py-2">
                    {stats.totalUsers.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 border-l-4 border-[#0A0D17] pl-3 text-lg font-black uppercase tracking-[0.08em]">
                Sales Trend
              </h2>
              <div className="h-[250px] rounded-2xl border border-black/10 p-3">
                <Line
                  options={lineOptions}
                  data={{
                    labels: weeklySales.labels,
                    datasets: [
                      {
                        label: "Sales",
                        data: weeklySales.data,
                        borderColor: "#0A0D17",
                        backgroundColor: "rgba(139,111,71,0.18)",
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div>
              <h2 className="mb-3 border-l-4 border-[#0A0D17] pl-3 text-lg font-black uppercase tracking-[0.08em]">
                Revenue & Profit
              </h2>
              <div className="h-[250px] rounded-2xl border border-black/10 p-3">
                <Bar
                  options={barOptions}
                  data={{
                    labels: monthlySales.labels,
                    datasets: [
                      {
                        label: "Revenue",
                        data: monthlySales.revenue,
                        backgroundColor: "#0A0D17",
                        borderRadius: 6,
                      },
                      {
                        label: "Profit",
                        data: monthlySales.netProfit,
                        backgroundColor: "#8b6f47",
                        borderRadius: 6,
                      },
                    ],
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 border-l-4 border-[#0A0D17] pl-3 text-lg font-black uppercase tracking-[0.08em]">
                Top Products
              </h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#faf8f3]">
                    <th className="border border-black/10 px-3 py-2 text-left">Product</th>
                    <th className="border border-black/10 px-3 py-2 text-left">Units Sold</th>
                    <th className="border border-black/10 px-3 py-2 text-left">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.length ? (
                    topProducts.map((item, index) => (
                      <tr key={`${item.name}-${index}`}>
                        <td className="border border-black/10 px-3 py-2">{item.name}</td>
                        <td className="border border-black/10 px-3 py-2">{item.sold}</td>
                        <td className="border border-black/10 px-3 py-2">
                          {formatMoney(item.revenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        className="border border-black/10 px-3 py-6 text-center text-gray-500"
                      >
                        No top product data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h2 className="mb-3 border-l-4 border-[#0A0D17] pl-3 text-lg font-black uppercase tracking-[0.08em]">
                Category Overview
              </h2>
              <div className="rounded-2xl border border-black/10 p-4">
                {renderCategoryChart()}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-3 border-l-4 border-[#0A0D17] pl-3 text-lg font-black uppercase tracking-[0.08em]">
              Low Stock Alert
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#faf8f3]">
                  <th className="border border-black/10 px-3 py-2 text-left">Product</th>
                  <th className="border border-black/10 px-3 py-2 text-left">Category</th>
                  <th className="border border-black/10 px-3 py-2 text-left">Branch</th>
                  <th className="border border-black/10 px-3 py-2 text-left">Stock Left</th>
                  <th className="border border-black/10 px-3 py-2 text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.length ? (
                  lowStockProducts.map((item) => (
                    <tr key={item._id}>
                      <td className="border border-black/10 px-3 py-2">{item.name}</td>
                      <td className="border border-black/10 px-3 py-2">{item.category}</td>
                      <td className="border border-black/10 px-3 py-2">{item.branch}</td>
                      <td className="border border-black/10 px-3 py-2">{item.stock}</td>
                      <td className="border border-black/10 px-3 py-2">
                        {formatMoney(item.price)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="border border-black/10 px-3 py-6 text-center text-gray-500"
                    >
                      No low stock products right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <h2 className="mb-3 border-l-4 border-[#0A0D17] pl-3 text-lg font-black uppercase tracking-[0.08em]">
              Recent Orders
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#faf8f3]">
                  <th className="border border-black/10 px-3 py-2 text-left">Order ID</th>
                  <th className="border border-black/10 px-3 py-2 text-left">Customer</th>
                  <th className="border border-black/10 px-3 py-2 text-left">Amount</th>
                  <th className="border border-black/10 px-3 py-2 text-left">Status</th>
                  <th className="border border-black/10 px-3 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length ? (
                  recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="border border-black/10 px-3 py-2">
                        #{order._id?.slice(-6)?.toUpperCase()}
                      </td>
                      <td className="border border-black/10 px-3 py-2">
                        {`${order.address?.firstName || ""} ${
                          order.address?.lastName || ""
                        }`.trim() || "Guest"}
                      </td>
                      <td className="border border-black/10 px-3 py-2">
                        {formatMoney(order.amount)}
                      </td>
                      <td className="border border-black/10 px-3 py-2">
                        {order.status || "Pending"}
                      </td>
                      <td className="border border-black/10 px-3 py-2">
                        {new Date(order.date || order.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="border border-black/10 px-3 py-6 text-center text-gray-500"
                    >
                      No recent orders available.
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

export default SalesReportPrint;