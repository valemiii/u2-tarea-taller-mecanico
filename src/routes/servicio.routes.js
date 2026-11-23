const { Router } = require("express");
const c = require("../controllers/servicio.controller");
const { authenticateToken } = require("../middlewares/auth");

// Catálogo: la lectura es pública (muchos clientes lo consultan); las escrituras exigen JWT
const router = Router();
router.get("/", c.listar);
router.get("/:id", c.obtener);
router.post("/", authenticateToken, c.crear);
router.put("/:id", authenticateToken, c.actualizar);
router.delete("/:id", authenticateToken, c.eliminar);

module.exports = router;
