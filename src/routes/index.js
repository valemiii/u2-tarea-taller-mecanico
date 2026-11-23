const { Router } = require("express");

const router = Router();
router.use("/auth", require("./auth.routes"));
router.use("/servicios", require("./servicio.routes"));
router.use("/ordenes", require("./orden.routes"));

module.exports = router;
