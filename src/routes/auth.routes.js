const { Router } = require("express");
const c = require("../controllers/auth.controller");
const { authenticateToken } = require("../middlewares/auth");

const router = Router();
router.post("/register", c.registrar);
router.post("/login", c.iniciarSesion);
router.get("/me", authenticateToken, c.perfil);
router.delete("/me", authenticateToken, c.eliminarCuenta);

module.exports = router;
