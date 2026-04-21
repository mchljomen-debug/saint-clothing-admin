import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";
import axios from "axios";

const ORDER_STATUSES = [
  "Pending Payment",
  "Order Placed",
  "Packing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Payment Failed",
];

const STATUS_FILTERS = [
  "All",
  "Pending Payment",
  "Order Placed",
  "Packing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Payment Failed",
];

const PRODUCT_CATEGORIES = [
  "All",
  "Tshirt",
  "Long Sleeve",
  "Jorts",
  "Mesh Shorts",
  "Crop Jersey",
];

const PAYMENT_METHOD_FILTERS = [
  "All",
  "COD",
  "GCash",
  "Maya",
  "GoTyme",
  "Stripe",
];

const PAYMENT_STATUS_FILTERS = [
  "All",
  "Cash on Delivery",
  "Pending Payment",
  "Payment Verifying",
  "Paid",
  "Payment Failed",
  "Collected on Delivery",
];

const normalizeCategory = (value = "") => {
  const clean = String(value).trim().toLowerCase();

  if (clean === "jorts") return "Jorts";
  if (clean === "crop jersey" || clean === "cropjersey") return "Crop Jersey";
  if (clean === "mesh short" || clean === "mesh shorts") return "Mesh Shorts";
  if (clean === "long sleeve" || clean === "longsleeve") return "Long Sleeve";
  if (clean === "tshirt" || clean === "t-shirt" || clean === "tee")
    return "Tshirt";

  return String(value).trim();
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [category, setCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");

  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState("");
  const [selectedProofTitle, setSelectedProofTitle] = useState("");

  const itemsPerPage = 10;
  const currency = "₱";

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("token");

  const normalizeStatus = (status) => {
    const value = String(status || "").trim().toLowerCase();

    if (value === "pending") return "Order Placed";
    if (value === "order placed") return "Order Placed";
    if (value === "packing") return "Packing";
    if (value === "shipped") return "Shipped";
    if (value === "out for delivery") return "Out for Delivery";
    if (value === "delivered") return "Delivered";
    if (value === "pending payment") return "Pending Payment";
    if (value === "payment failed") return "Payment Failed";

    return "Order Placed";
  };

  const normalizePaymentMethod = (paymentMethod) => {
    const value = String(paymentMethod || "").trim().toLowerCase();

    if (value === "cod" || value === "cash on delivery") return "COD";
    if (value === "maya" || value === "paymaya") return "Maya";
    if (value === "gcash") return "GCash";
    if (value === "gotyme" || value === "go tyme") return "GoTyme";
    if (value === "stripe") return "Stripe";

    return paymentMethod || "COD";
  };

  const normalizePaymentStatus = (order) => {
    const statusValue = String(order?.paymentStatus || "").trim().toLowerCase();
    const method = normalizePaymentMethod(order?.paymentMethod);
    const orderStatus = normalizeStatus(order?.status);

    if (method === "COD") {
      if (order?.payment === true) return "paid";
      if (orderStatus === "Delivered") return "to_collect";
      return "cod_pending";
    }

    if (statusValue === "paid") return "paid";
    if (statusValue === "verifying") return "verifying";
    if (statusValue === "failed") return "failed";
    if (statusValue === "pending") return "pending";

    if (orderStatus === "Pending Payment") return "pending";
    if (orderStatus === "Payment Failed") return "failed";
    if (order?.payment === true) return "paid";

    return "pending";
  };

  const getPaymentStatusLabel = (order) => {
    const paymentState = normalizePaymentStatus(order);

    if (paymentState === "paid") return "Paid";
    if (paymentState === "verifying") return "Payment Verifying";
    if (paymentState === "failed") return "Payment Failed";
    if (paymentState === "to_collect") return "Collected on Delivery";
    if (paymentState === "cod_pending") return "Cash on Delivery";
    return "Pending Payment";
  };

  const sortItems = (items) => {
    return [...items].sort(
      (a, b) =>
        new Date(b.createdAt || b.date || 0) -
        new Date(a.createdAt || a.date || 0)
    );
  };

  const getProofUrl = (fileName) => {
    if (!fileName) return "";
    if (
      String(fileName).startsWith("http://") ||
      String(fileName).startsWith("https://")
    ) {
      return fileName;
    }
    return `${backendUrl}/uploads/payment-proofs/${fileName}`;
  };

  const getOrderImageUrl = (image) => {
    if (!image) return assets.fallback_image;

    const finalImage = Array.isArray(image) ? image[0] : image;
    const imageString = String(finalImage || "").trim();

    if (!imageString) return assets.fallback_image;

    if (
      imageString.startsWith("http://") ||
      imageString.startsWith("https://") ||
      imageString.startsWith("data:")
    ) {
      return imageString;
    }

    if (imageString.startsWith("/uploads/")) {
      return `${backendUrl}${imageString}`;
    }

    return `${backendUrl}/uploads/${imageString}`;
  };

  const formatAddress = (address = {}) => {
    const parts = [
      address.houseUnit,
      address.street,
      address.barangay,
      address.city,
      address.province,
      address.region,
      address.zipcode,
      address.country || "Philippines",
    ].filter(Boolean);

    return parts.length ? parts.join(", ") : "No address provided";
  };

  const openProofModal = (fileName, itemName) => {
    const url = getProofUrl(fileName);
    setSelectedProof(url);
    setSelectedProofTitle(itemName || "Payment Proof");
    setProofModalOpen(true);
  };

  const closeProofModal = () => {
    setProofModalOpen(false);
    setSelectedProof("");
    setSelectedProofTitle("");
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/order/list`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const fetchedOrders = res.data.orders || [];
        setOrders(fetchedOrders);

        const flatItems = [];
        fetchedOrders.forEach((order) => {
          order.items.forEach((item) => {
            flatItems.push({
              ...item,
              orderId: order._id,
              status: normalizeStatus(order.status),
              rawStatus: order.status,
              paymentMethod: normalizePaymentMethod(order.paymentMethod),
              paymentStatus: order.paymentStatus || "",
              paymentStatusLabel: getPaymentStatusLabel(order),
              payment: order.payment,
              amount: order.amount,
              createdAt: order.createdAt,
              date: order.date,
              address: order.address,
              referenceNumber: order.referenceNumber || "",
              paymentProofImage:
                order.paymentProofImage || order.paymentProof || "",
              userFullName: `${order.address?.firstName || ""} ${
                order.address?.lastName || ""
              }`.trim(),
              userEmail: order.address?.email || "",
              userPhone: order.address?.phone || "",
              fullAddress: formatAddress(order.address || {}),
              category: normalizeCategory(item.category || "Uncategorized"),
              sku: item.sku || "",
              groupCode: item.groupCode || "",
              image: item.image || null,
            });
          });
        });

        const sortedItems = sortItems(flatItems);
        setItemsList(sortedItems);
        setFilteredItems(sortedItems);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load orders");
    }
  };

  useEffect(() => {
    if (token) fetchOrders();
  }, [token]);

  const statusHandler = async (event, orderId) => {
    const newStatus = event.target.value;

    try {
      const res = await axios.post(
        `${backendUrl}/api/order/status`,
        { orderId, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setItemsList((prev) =>
          prev.map((item) =>
            item.orderId === orderId
              ? { ...item, status: normalizeStatus(newStatus) }
              : item
          )
        );

        setFilteredItems((prev) =>
          prev.map((item) =>
            item.orderId === orderId
              ? { ...item, status: normalizeStatus(newStatus) }
              : item
          )
        );

        toast.success("Status updated");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  useEffect(() => {
    let temp = [...itemsList];

    if (category !== "All") {
      temp = temp.filter(
        (item) => normalizeCategory(item.category) === normalizeCategory(category)
      );
    }

    if (statusFilter !== "All") {
      temp = temp.filter(
        (item) => normalizeStatus(item.status) === normalizeStatus(statusFilter)
      );
    }

    if (paymentMethodFilter !== "All") {
      temp = temp.filter(
        (item) =>
          normalizePaymentMethod(item.paymentMethod) ===
          normalizePaymentMethod(paymentMethodFilter)
      );
    }

    if (paymentStatusFilter !== "All") {
      temp = temp.filter(
        (item) => item.paymentStatusLabel === paymentStatusFilter
      );
    }

    temp = sortItems(temp);

    setFilteredItems(temp);
    setCurrentPage(1);
  }, [
    category,
    statusFilter,
    paymentMethodFilter,
    paymentStatusFilter,
    itemsList,
  ]);

  const summary = useMemo(() => {
    return {
      totalItems: filteredItems.length,
      delivered: filteredItems.filter(
        (item) => normalizeStatus(item.status) === "Delivered"
      ).length,
      pending: filteredItems.filter(
        (item) =>
          normalizeStatus(item.status) === "Pending Payment" ||
          normalizeStatus(item.status) === "Order Placed"
      ).length,
      paid: filteredItems.filter((item) => item.paymentStatusLabel === "Paid")
        .length,
    };
  }, [filteredItems]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const getStatusColor = (status) => {
    switch (normalizeStatus(status)) {
      case "Pending Payment":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Order Placed":
        return "bg-gray-100 text-gray-900 border-gray-300";
      case "Packing":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Shipped":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Out for Delivery":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Delivered":
        return "bg-green-50 text-green-700 border-green-200";
      case "Payment Failed":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getPaymentStatusColor = (label) => {
    switch (label) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Payment Verifying":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "Payment Failed":
        return "bg-red-50 text-red-700 border-red-200";
      case "Collected on Delivery":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Cash on Delivery":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="w-full font-['Montserrat'] pt-[40px]">
      <div className="rounded-[28px] border border-black/10 bg-gradient-to-br from-white via-[#f8f8f6] to-[#ececec] shadow-[0_18px_60px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="relative px-5 md:px-8 py-6 md:py-8 border-b border-black/10 bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%)] pointer-events-none" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.34em]">
                Saint Clothing Admin
              </p>
              <h2 className="mt-2 text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                Order Management
              </h2>
              <p className="mt-2 text-sm text-white/70 max-w-2xl">
                Track orders, payment verification, dispatch progress, and proof
                submissions in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Orders
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {summary.totalItems}
                </p>
              </div>

              <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Delivered
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {summary.delivered}
                </p>
              </div>

              <div className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                  Paid
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {summary.paid}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 md:px-8 py-5">
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#0A0D17] outline-none focus:border-black"
            >
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#0A0D17] outline-none focus:border-black"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All Delivery Status" : status}
                </option>
              ))}
            </select>

            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#0A0D17] outline-none focus:border-black"
            >
              {PAYMENT_METHOD_FILTERS.map((method) => (
                <option key={method} value={method}>
                  {method === "All" ? "All Payment Methods" : method}
                </option>
              ))}
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#0A0D17] outline-none focus:border-black"
            >
              {PAYMENT_STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All Payment Status" : status}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {currentItems.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-black/15 bg-white/60 py-16 text-center">
                <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0A0D17]/40">
                  No Orders Found
                </p>
              </div>
            )}

            {currentItems.map((item, index) => (
              <div
                key={`${item.orderId}-${item._id || item.productId || index}`}
                className="rounded-[26px] overflow-hidden border border-black/10 bg-white shadow-[0_12px_34px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_44px_rgba(0,0,0,0.1)] transition"
              >
                <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1.35fr_1fr_0.7fr] gap-0">
                  <div className="p-5 border-b xl:border-b-0 xl:border-r border-black/10">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#f4f4f3] border border-black/10 flex items-center justify-center shrink-0">
                        <img
                          src={getOrderImageUrl(item.image)}
                          className="w-full h-full object-cover rounded-2xl"
                          alt={item.name}
                          onError={(e) => {
                            e.currentTarget.src = assets.fallback_image;
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                          Customer
                        </p>
                        <p className="mt-1 text-sm font-black text-[#0A0D17]">
                          {item.userFullName || "Customer"}
                        </p>
                        <p className="text-xs text-[#0A0D17]/55 break-all">
                          {item.userEmail || "No email provided"}
                        </p>
                        <p className="text-xs text-[#0A0D17]/55">
                          {item.userPhone || "No phone provided"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                        Product
                      </p>
                      <p className="mt-1 text-sm font-black uppercase text-[#0A0D17]">
                        {item.name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-[#0A0D17] text-white text-[10px] font-black uppercase tracking-[0.14em]">
                          Qty {item.quantity}
                        </span>
                        <span className="px-2.5 py-1 rounded-full border border-black/10 bg-[#f7f7f6] text-[#0A0D17] text-[10px] font-black uppercase tracking-[0.14em]">
                          Size {item.size}
                        </span>
                        <span className="px-2.5 py-1 rounded-full border border-black/10 bg-[#f7f7f6] text-[#0A0D17] text-[10px] font-black uppercase tracking-[0.14em]">
                          {item.category || "Uncategorized"}
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-[#0A0D17]/55 space-y-1">
                        <p>SKU: {item.sku || "N/A"}</p>
                        <p>Group Code: {item.groupCode || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border-b xl:border-b-0 xl:border-r border-black/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                      Delivery Address
                    </p>
                    <p className="mt-2 text-sm text-[#0A0D17] leading-6 break-words">
                      {item.fullAddress}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-black text-[#0A0D17]">Region</p>
                        <p className="mt-1 text-[#0A0D17]/60">
                          {item.address?.region || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="font-black text-[#0A0D17]">Province</p>
                        <p className="mt-1 text-[#0A0D17]/60">
                          {item.address?.province || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="font-black text-[#0A0D17]">
                          City / Municipality
                        </p>
                        <p className="mt-1 text-[#0A0D17]/60">
                          {item.address?.city || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="font-black text-[#0A0D17]">Barangay</p>
                        <p className="mt-1 text-[#0A0D17]/60">
                          {item.address?.barangay || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 text-xs">
                      <p className="font-black text-[#0A0D17]">ZIP Code</p>
                      <p className="mt-1 text-[#0A0D17]/60">
                        {item.address?.zipcode || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 border-b xl:border-b-0 xl:border-r border-black/10">
                    <div className="space-y-4 text-xs">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                          Payment Method
                        </p>
                        <p className="mt-2 text-sm font-black text-[#0A0D17]">
                          {item.paymentMethod || "COD"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                          Payment Status
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getPaymentStatusColor(
                            item.paymentStatusLabel
                          )}`}
                        >
                          {item.paymentStatusLabel}
                        </span>
                      </div>

                      {(item.paymentMethod === "GCash" ||
                        item.paymentMethod === "Maya" ||
                        item.paymentMethod === "GoTyme") && (
                        <>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                              Reference No.
                            </p>
                            <p className="mt-2 break-all text-sm text-[#0A0D17]">
                              {item.referenceNumber || "Not Available"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45 mb-2">
                              Payment Proof
                            </p>

                            {item.paymentProofImage ? (
                              <div className="space-y-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openProofModal(item.paymentProofImage, item.name)
                                  }
                                  className="block"
                                >
                                  <img
                                    src={getProofUrl(item.paymentProofImage)}
                                    alt="Payment Proof"
                                    className="w-24 h-24 object-cover rounded-xl border border-black/10 hover:opacity-90 transition"
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openProofModal(item.paymentProofImage, item.name)
                                  }
                                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17] hover:bg-[#f5f5f4]"
                                >
                                  View Proof
                                </button>
                              </div>
                            ) : (
                              <p className="text-[#0A0D17]/40">
                                No payment proof uploaded
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                          Date
                        </p>
                        <p className="mt-2 text-sm text-[#0A0D17]">
                          {new Date(
                            item.createdAt || item.date || Date.now()
                          ).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col justify-between gap-5 bg-[#fafaf8]">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45">
                        Amount
                      </p>
                      <p className="mt-2 text-2xl font-black text-[#0A0D17]">
                        {currency}
                        {Number(item.price || 0).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45 mb-2">
                        Delivery Status
                      </p>
                      <select
                        value={normalizeStatus(item.status)}
                        onChange={(e) => statusHandler(e, item.orderId)}
                        className={`w-full border p-3 text-xs font-black rounded-2xl outline-none ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-8 gap-3 flex-wrap">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.18em] border ${
                    currentPage === i + 1
                      ? "bg-[#0A0D17] text-white border-[#0A0D17]"
                      : "bg-white text-[#0A0D17] border-black/10"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {proofModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 md:pt-20 bg-black/70 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-[28px] overflow-hidden border border-white/10 shadow-[0_28px_100px_rgba(0,0,0,0.35)] bg-white">
            <div className="px-6 md:px-8 py-5 bg-gradient-to-r from-[#0A0D17] via-[#111827] to-[#1f2937] flex items-start justify-between gap-4">
              <div>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.28em]">
                  Payment Proof
                </p>
                <h3 className="mt-2 text-lg md:text-xl font-black uppercase text-white leading-tight">
                  {selectedProofTitle}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeProofModal}
                className="w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white text-xl leading-none hover:bg-white/10 transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 md:p-8 bg-gradient-to-br from-white via-[#fafaf8] to-[#eeeeea]">
              <div className="rounded-[24px] border border-black/10 bg-white p-4 flex justify-center">
                <img
                  src={selectedProof}
                  alt="Payment Proof Large View"
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl border border-black/10 bg-white"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <a
                  href={selectedProof}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-black/10 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17] hover:bg-[#f5f5f4]"
                >
                  Open Full Image
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;