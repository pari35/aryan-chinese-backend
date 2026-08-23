import express from "express";
import { loginUserController, registerUserController } from "../controllers/userController.js";

const router = express.Router()

router.post('/registerUser',registerUserController)

router.post('/login',loginUserController)

export default router