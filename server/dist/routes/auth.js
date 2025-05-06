"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Rota de debug para verificar se o path está correto
router.get('/promote-check', (req, res) => {
    console.log('[DEBUG] Rota /api/auth/promote-check acessada');
    res.status(200).json({ message: 'Rota de promoção está configurada corretamente' });
});
// Rota para listar todos os administradores
router.get('/admins', auth_middleware_1.authMiddleware, auth_controller_1.listAdmins);
// Rota para promoção de administradores
router.post('/make-admin', auth_middleware_1.authMiddleware, auth_controller_1.promoteToAdmin);
// Rota para remover privilégios de administrador
router.post('/remove-admin', auth_middleware_1.authMiddleware, auth_controller_1.removeAdmin);
// Rota para transferir o título de administrador principal
router.post('/transfer-admin', auth_middleware_1.authMiddleware, auth_controller_1.transferMainAdmin);
router.post('/register', auth_controller_1.register);
router.post('/login', auth_controller_1.login);
router.get('/validate', auth_middleware_1.authMiddleware, auth_controller_1.validateToken);
router.post('/promote', auth_middleware_1.authMiddleware, auth_controller_1.promoteToAdmin); // Mantemos a rota original também
exports.default = router;
