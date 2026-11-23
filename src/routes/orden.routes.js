const { Router } = require("express");
const ordenes = require("../controllers/orden.controller");
const bitacora = require("../controllers/bitacora.controller");
const { authenticateToken } = require("../middlewares/auth");

const router = Router();
router.use(authenticateToken); // todo lo de órdenes y bitácora exige JWT

router.post("/", ordenes.crear);
router.get("/", ordenes.listarMias);
router.get("/:id", ordenes.obtener);
router.patch("/:id/estado", ordenes.cambiarEstado);
router.delete("/:id", ordenes.eliminar);

router.post("/:ordenId/bitacora", bitacora.crear);
router.get("/:ordenId/bitacora", bitacora.listar);

module.exports = router;
