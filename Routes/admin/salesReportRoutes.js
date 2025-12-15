const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const salesReportController = require("../../Controllers/Admin/salesReportController");

/* ===============================
   SALES REPORT PAGE
================================ */
router.get(
  "/admin/sales/report",
  adminAuth,
  salesReportController.getSalesReport
);

/* ===============================
   DOWNLOAD REPORTS
================================ */
router.get(
  "/admin/sales/download/excel",
  adminAuth,
  salesReportController.downloadExcel
);

router.get(
  "/admin/sales/download/pdf",
  adminAuth,
  salesReportController.downloadPDF
);

module.exports = router;
