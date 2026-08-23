import express from "express";
import { createOrderController, deleteOrderController, getOrdersController, updateOrderDetailsController, updateOrderStatusController } from "../controllers/orderController.js";
import { authMiddleware } from "../middlewares/authMidleware.js";

const router = express.Router()

router.post('/createOrder', createOrderController)

router.get('/getOrders', authMiddleware, getOrdersController)

router.post('/updateOrderStatus', updateOrderStatusController)

router.delete('/deleteOrder', authMiddleware, deleteOrderController);

router.put('/updateOrderDetails', updateOrderDetailsController);

export default router