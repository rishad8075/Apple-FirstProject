const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const profile = require("../../Controllers/User/profileController");

router.get("/user/addresseManagement", auth, profile.userAddressManagement);
router.post("/user/add-address", auth, profile.addAddress);
router.delete("/user/delete-address/:id", auth, profile.deleteAddress);
router.get("/user/edit-address/:id", auth, profile.getEditAddress);
router.patch("/user/edit-address/:id", auth, profile.postEditAddress);
router.patch("/user/set-default-address/:id", auth, profile.setDefaultAddress);

module.exports = router;
