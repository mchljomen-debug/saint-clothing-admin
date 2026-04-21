import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const money = (value) => Number(value || 0);
const num = (value) => Number(value || 0);

const COLORS = {
  title: "1F1F1F",
  subtitle: "6B7280",
  sectionFill: "B89A6B",
  sectionText: "FFFFFF",
  headerFill: "2F2F2F",
  headerText: "FFFFFF",
  border: "E5E7EB",
  softFill: "FAF8F3",
  redFill: "FDE2E1",
  redText: "B42318",
  orangeFill: "FFF1E6",
  orangeText: "C2410C",
  greenFill: "E8F5E9",
  greenText: "1B5E20",
};

const styleMainTitle = (cell) => {
  cell.font = { bold: true, size: 18, color: { argb: COLORS.title } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
};

const styleSubtitle = (cell) => {
  cell.font = { italic: true, size: 11, color: { argb: COLORS.subtitle } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
};

const styleSectionTitle = (cell) => {
  cell.font = { bold: true, size: 13, color: { argb: COLORS.sectionText } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.sectionFill },
  };
  cell.alignment = { horizontal: "left", vertical: "middle" };
  cell.border = {
    top: { style: "thin", color: { argb: COLORS.border } },
    left: { style: "thin", color: { argb: COLORS.border } },
    bottom: { style: "thin", color: { argb: COLORS.border } },
    right: { style: "thin", color: { argb: COLORS.border } },
  };
};

const styleHeaderRow = (row) => {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.headerFill },
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    };
  });
};

const applyCellBorder = (cell) => {
  cell.border = {
    top: { style: "thin", color: { argb: COLORS.border } },
    left: { style: "thin", color: { argb: COLORS.border } },
    bottom: { style: "thin", color: { argb: COLORS.border } },
    right: { style: "thin", color: { argb: COLORS.border } },
  };
};

const autoFitColumns = (worksheet, min = 10, max = 24) => {
  worksheet.columns.forEach((column) => {
    let maxLength = min;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value ? cell.value.toString() : "";
      maxLength = Math.max(maxLength, value.length + 2);
    });
    column.width = Math.min(Math.max(column.width || 0, maxLength), max);
  });
};

const setColumnWidths = (worksheet) => {
  const widths = {
    1: 18,
    2: 14,
    3: 14,
    4: 3,
    5: 14,
    6: 12,
    7: 3,
    8: 16,
    9: 14,
    10: 14,
    11: 3,
    12: 18,
    13: 14,
    14: 14,
    15: 14,
  };

  Object.entries(widths).forEach(([col, width]) => {
    worksheet.getColumn(Number(col)).width = width;
  });
};

const uniqueTableName = (base) =>
  `${base}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

const addSheetHeader = (worksheet, title, subtitle, endCol) => {
  worksheet.mergeCells(1, 1, 1, endCol);
  worksheet.getCell(1, 1).value = title;
  styleMainTitle(worksheet.getCell(1, 1));
  worksheet.getRow(1).height = 24;

  worksheet.mergeCells(2, 1, 2, endCol);
  worksheet.getCell(2, 1).value = subtitle;
  styleSubtitle(worksheet.getCell(2, 1));
  worksheet.getRow(2).height = 20;
};

const columnNumberToName = (num) => {
  let colName = "";
  while (num > 0) {
    const rem = (num - 1) % 26;
    colName = String.fromCharCode(65 + rem) + colName;
    num = Math.floor((num - 1) / 26);
  }
  return colName;
};

const addSectionTitle = (worksheet, row, startCol, endCol, title) => {
  worksheet.mergeCells(row, startCol, row, endCol);
  const cell = worksheet.getCell(row, startCol);
  cell.value = title;
  styleSectionTitle(cell);
  worksheet.getRow(row).height = 22;
};

const styleBodyCells = ({
  worksheet,
  startRow,
  endRow,
  startCol,
  totalCols,
  numericColumns = [],
  lowStockColumn = null,
  statusColumn = null,
}) => {
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    for (let i = 0; i < totalCols; i++) {
      const absoluteCol = startCol + i;
      const localCol = i + 1;
      const cell = worksheet.getCell(rowIndex, absoluteCol);

      applyCellBorder(cell);

      const isNumeric = numericColumns.includes(localCol);
      cell.alignment = {
        vertical: "middle",
        horizontal: isNumeric ? "center" : "left",
        wrapText: true,
      };

      if (rowIndex % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.softFill },
        };
      }
    }

    if (lowStockColumn) {
      const stockCell = worksheet.getCell(rowIndex, startCol + lowStockColumn - 1);
      const stockValue = Number(stockCell.value || 0);

      if (!Number.isNaN(stockValue)) {
        if (stockValue <= 2) {
          stockCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.redFill },
          };
          stockCell.font = { bold: true, color: { argb: COLORS.redText } };
        } else if (stockValue <= 5) {
          stockCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.orangeFill },
          };
          stockCell.font = { bold: true, color: { argb: COLORS.orangeText } };
        }
      }
    }

    if (statusColumn) {
      const statusCell = worksheet.getCell(rowIndex, startCol + statusColumn - 1);
      const statusValue = String(statusCell.value || "").toLowerCase();

      if (statusValue.includes("delivered") || statusValue.includes("completed")) {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.greenFill },
        };
        statusCell.font = { bold: true, color: { argb: COLORS.greenText } };
      } else if (statusValue.includes("pending") || statusValue.includes("processing")) {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.orangeFill },
        };
        statusCell.font = { bold: true, color: { argb: COLORS.orangeText } };
      } else if (statusValue.includes("cancelled") || statusValue.includes("failed")) {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.redFill },
        };
        statusCell.font = { bold: true, color: { argb: COLORS.redText } };
      }
    }
  }
};

const addExcelTableAt = ({
  worksheet,
  startRow,
  startCol,
  tableName,
  title,
  headers,
  rows,
  numericColumns = [],
  currencyColumns = [],
  lowStockColumn = null,
  statusColumn = null,
}) => {
  const safeRows = rows.length ? rows : [headers.map(() => "")];
  const totalCols = headers.length;
  const endCol = startCol + totalCols - 1;

  addSectionTitle(worksheet, startRow, startCol, endCol, title);

  const tableRow = startRow + 1;
  const ref = `${columnNumberToName(startCol)}${tableRow}`;

  worksheet.addTable({
    name: tableName,
    ref,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium2",
      showRowStripes: true,
      showColumnStripes: false,
    },
    columns: headers.map((header) => ({ name: header })),
    rows: safeRows,
  });

  styleHeaderRow(worksheet.getRow(tableRow));

  const bodyStart = tableRow + 1;
  const bodyEnd = tableRow + safeRows.length;

  if (bodyEnd >= bodyStart) {
    styleBodyCells({
      worksheet,
      startRow: bodyStart,
      endRow: bodyEnd,
      startCol,
      totalCols,
      numericColumns,
      lowStockColumn,
      statusColumn,
    });
  }

  currencyColumns.forEach((col) => {
    worksheet.getColumn(startCol + col - 1).numFmt = "₱#,##0";
  });

  numericColumns.forEach((col) => {
    worksheet.getColumn(startCol + col - 1).numFmt = "#,##0";
  });

  return bodyEnd;
};

const buildWorkbook = () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Saint Clothing Admin";
  workbook.created = new Date();
  return workbook;
};

const saveWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
};

export const exportDashboardWorkbook = async ({
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
}) => {
  const workbook = buildWorkbook();
  const branchLabel = role === "admin" ? selectedBranch : branch;
  const generatedAt = new Date().toLocaleString();

  const sheet = workbook.addWorksheet("Dashboard Report");

  addSheetHeader(
    sheet,
    "Saint Clothing Dashboard Export",
    `Branch: ${branchLabel} • Generated: ${generatedAt}`,
    15
  );

  setColumnWidths(sheet);

  const overviewCol = 4;      // D
  const topProductsCol = 1;   // A
  const categoryCol = 5;      // E
  const salesTrendCol = 8;    // H
  const lowStockCol = 1;      // A
  const revenueProfitCol = 8; // H
  const recentOrdersCol = 1;  // A

  let currentRow = 4;

  // Overview centered
  const overviewEnd = addExcelTableAt({
    worksheet: sheet,
    startRow: currentRow,
    startCol: overviewCol,
    tableName: uniqueTableName("OverviewTable"),
    title: `Overview (${overviewRange})`,
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
      money(stats.totalRevenue),
      num(stats.totalOrders),
      num(stats.totalProducts),
      num(stats.totalUsers),
      money(stats.netProfit),
      `${stats.netProfitMargin}%`,
      num(stats.lowStockCount),
    ]],
    numericColumns: [1, 2, 3, 4, 5, 7],
    currencyColumns: [1, 5],
  });

  currentRow = overviewEnd + 2;

  // Top Products | Category | Sales Trend
  const topProductsEnd = addExcelTableAt({
    worksheet: sheet,
    startRow: currentRow,
    startCol: topProductsCol,
    tableName: uniqueTableName("TopProductsTable"),
    title: `Top Products (${topProductsRange})`,
    headers: ["Product", "Units Sold", "Revenue"],
    rows: topProducts.length
      ? topProducts.map((item) => [
          item.name,
          num(item.sold),
          money(item.revenue),
        ])
      : [["No data available", "", ""]],
    numericColumns: [2, 3],
    currencyColumns: [3],
  });

  const categoryEnd = addExcelTableAt({
    worksheet: sheet,
    startRow: currentRow,
    startCol: categoryCol,
    tableName: uniqueTableName("CategoryTable"),
    title: `Category (${categoryRange})`,
    headers: ["Category", "Sold"],
    rows: categorySales.labels.length
      ? categorySales.labels.map((label, index) => [
          label,
          num(categorySales.data[index] || 0),
        ])
      : [["No data available", ""]],
    numericColumns: [2],
  });

  const salesEnd = addExcelTableAt({
    worksheet: sheet,
    startRow: currentRow,
    startCol: salesTrendCol,
    tableName: uniqueTableName("SalesTrendTable"),
    title: `Sales Trend (${weeklyChartRange})`,
    headers: ["Label", "Sales"],
    rows: weeklySales.labels.length
      ? weeklySales.labels.map((label, index) => [
          label,
          money(weeklySales.data[index] || 0),
        ])
      : [["No data available", ""]],
    numericColumns: [2],
    currencyColumns: [2],
  });

  currentRow = Math.max(topProductsEnd, categoryEnd, salesEnd) + 2;

  // Low Stock | Revenue & Profit
  const lowStockEnd = addExcelTableAt({
    worksheet: sheet,
    startRow: currentRow,
    startCol: lowStockCol,
    tableName: uniqueTableName("LowStockTable"),
    title: `Low Stock (${lowStockRange})`,
    headers: ["Product", "Category", "Branch", "Stock Left", "Price"],
    rows: lowStockProducts.length
      ? lowStockProducts.map((item) => [
          item.name,
          item.category,
          item.branch,
          num(item.stock),
          money(item.price),
        ])
      : [["No data available", "", "", "", ""]],
    numericColumns: [4, 5],
    currencyColumns: [5],
    lowStockColumn: 4,
  });

  const revenueProfitEnd = addExcelTableAt({
    worksheet: sheet,
    startRow: currentRow,
    startCol: revenueProfitCol,
    tableName: uniqueTableName("RevenueProfitTable"),
    title: `Revenue & Profit (${monthlyChartRange})`,
    headers: ["Label", "Revenue", "Profit"],
    rows: monthlySales.labels.length
      ? monthlySales.labels.map((label, index) => [
          label,
          money(monthlySales.revenue[index] || 0),
          money(monthlySales.netProfit[index] || 0),
        ])
      : [["No data available", "", ""]],
    numericColumns: [2, 3],
    currencyColumns: [2, 3],
  });

  currentRow = Math.max(lowStockEnd, revenueProfitEnd) + 2;

  // Recent Orders full width
  addExcelTableAt({
    worksheet: sheet,
    startRow: currentRow,
    startCol: recentOrdersCol,
    tableName: uniqueTableName("RecentOrdersTable"),
    title: `Recent Orders (${recentOrdersRange})`,
    headers: ["Order ID", "Customer", "Amount", "Status", "Payment Method", "Date"],
    rows: recentOrders.length
      ? recentOrders.map((order) => [
          order._id,
          `${order.address?.firstName || ""} ${order.address?.lastName || ""}`.trim() || "Customer",
          money(order.amount || 0),
          order.status || "Pending",
          order.paymentMethod || "COD",
          new Date(order.date || order.createdAt).toLocaleString(),
        ])
      : [["No data available", "", "", "", "", ""]],
    numericColumns: [3],
    currencyColumns: [3],
    statusColumn: 4,
  });

  sheet.views = [{ state: "frozen", ySplit: 3 }];
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    },
  };

  autoFitColumns(sheet);

  await saveWorkbook(
    workbook,
    `saint_dashboard_all_${branchLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

export const exportSingleDashboardSection = async ({
  sheetTitle,
  fileName,
  subtitle,
  headers,
  rows,
  currencyColumns = [],
  numberColumns = [],
  lowStockColumn = null,
  statusColumn = null,
}) => {
  const workbook = buildWorkbook();
  const sheet = workbook.addWorksheet(sheetTitle);

  addSheetHeader(sheet, sheetTitle, subtitle, headers.length);

  addExcelTableAt({
    worksheet: sheet,
    startRow: 4,
    startCol: 1,
    tableName: uniqueTableName(sheetTitle.replace(/\s+/g, "")),
    title: sheetTitle,
    headers,
    rows,
    numericColumns: numberColumns.length ? numberColumns : currencyColumns,
    currencyColumns,
    lowStockColumn,
    statusColumn,
  });

  sheet.views = [{ state: "frozen", ySplit: 3 }];
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  autoFitColumns(sheet);

  await saveWorkbook(workbook, fileName);
};