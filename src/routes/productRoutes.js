import express from "express";
import { manageCategoriesController, getCategoriesController, manageProductsController, getProductsController, deleteProductController, deleteCategoryController } from "../controllers/productController.js";

const router = express.Router()

router.post('/manageCategories', manageCategoriesController)

router.get('/getCategories', getCategoriesController)

router.post('/manageProducts', manageProductsController)

router.get('/getProducts', getProductsController)

router.delete('/deleteProduct', deleteProductController)

router.delete('/deleteCategory', deleteCategoryController);

export default router