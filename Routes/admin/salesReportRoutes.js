const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const salesReportController = require("../../Controllers/Admin/salesReportController");

router.use(adminAuth)

router.get(
  "/admin/sales/report",
  salesReportController.getSalesReport
);


router.get(
  "/admin/sales/download/excel",
  salesReportController.downloadExcel
);

router.get(
  "/admin/sales/download/pdf",
  salesReportController.downloadPDF
);

module.exports = router;
