import express from "express";
import { registerUserController } from "../controllers/userController.js";

import userRoutes from './userRoutes.js'
import productRoutes from './productRoutes.js' 
import mediaRoutes from './mediaRoutes.js' 
import orderRoutes from './orderRoutes.js' 
import { authMiddleware } from "../middlewares/authMidleware.js";

const router = express.Router()

// make routes
router.use('/user', userRoutes)

router.use('/product', authMiddleware ,productRoutes)

router.use('/images', authMiddleware ,mediaRoutes)

router.use('/order' ,orderRoutes)

export default  router 