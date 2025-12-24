const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const profile = require("../../Controllers/User/profileController");
const checkBlock = require("../../middleware/checkBlock");


router.get("/user/addresseManagement", auth,checkBlock, profile.userAddressManagement);
router.post("/user/add-address", auth,checkBlock, profile.addAddress);
router.delete("/user/delete-address/:id", auth,checkBlock, profile.deleteAddress);
router.get("/user/edit-address/:id", auth,checkBlock, profile.getEditAddress);
router.patch("/user/edit-address/:id", auth,checkBlock, profile.postEditAddress);
router.patch("/user/set-default-address/:id", auth,checkBlock, profile.setDefaultAddress);

module.exports = router;
