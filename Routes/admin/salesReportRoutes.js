const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const salesReportController = require("../../Controllers/Admin/salesReportController");



router.get(
  "/sales/report",
  salesReportController.getSalesReport
);


router.get(
  "/sales/download/excel",
  salesReportController.downloadExcel
);

router.get(
  "/sales/download/pdf",
  salesReportController.downloadPDF
);

module.exports = router;
