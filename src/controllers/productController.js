import { deleteCategoryService, deleteProductService, getCategoriesService, getProductsService, manageCategoriesService, manageProductsService } from "../services/productService.js";


const manageCategoriesController = async (req, res) => {
    try {
        // Extract all possible fields from the request body
        const { id, org_id, name, description, display_order, is_active } = req.body;

        // Validation: org_id and name are strictly required for both Add and Update
        if (!org_id || !name) {
            return res.status(400).json({
                success: false,
                message: "org_id and name are required fields."
            });
        }

        // Pass data to the service
        const category = await manageCategoriesService({
            id,
            org_id,
            name,
            description,
            display_order,
            is_active
        });

        // Set dynamic success message and status code (200 for OK, 201 for Created)
        const isUpdate = !!id;
        const statusCode = isUpdate ? 200 : 201;
        const message = isUpdate ? "Category updated successfully" : "Category added successfully";

        return res.status(statusCode).json({
            success: true,
            message: message,
            data: category
        });

    } catch (err) {
        console.error("Manage Category Controller Error:", err.message);

        const statusCode = err.statusCode || Number(err.status) || 500;

        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal server error"
        });
    }
}

const getCategoriesController = async (req, res) => {
    try {
        const { 
            org_id, id, 
            search, is_active, 
            page = 1, limit = 10 
        } = req.query;

        if (!org_id) {
            return res.status(400).json({
                success: false,
                message: "org_id is required to fetch categories."
            });
        }

        // 1. Prepare pagination calculations
        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);
        const offset = (parsedPage - 1) * parsedLimit;

        // 2. Prepare filter object
        const filters = {
            search: search || null,
            is_active: is_active !== undefined ? is_active === 'true' : undefined,
            page: parsedPage,
            limit: parsedLimit,
            offset: offset
        };

        const data = await getCategoriesService({
            org_id: parseInt(org_id, 10),
            id: id ? parseInt(id, 10) : null,
            filters
        });

        return res.status(200).json({
            success: true,
            message: id ? "Category fetched successfully" : "Categories fetched successfully",
            data: data
        });

    } catch (err) {
        console.error("Get Categories Controller Error:", err.message);
        const statusCode = err.statusCode || Number(err.status) || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal server error"
        });
    }
};

const manageProductsController = async (req, res) => {
    try {
        const { id, org_id, category_id, name, price, is_available, description, image_url, is_active, is_deleted, food_type } = req.body;

        // Validation
        if (!org_id || !category_id || !name || price === undefined) {
            return res.status(400).json({
                success: false,
                message: "org_id, category_id, name, and price are required."
            });
        }

        const product = await manageProductsService({
            id, org_id, category_id, name, price, is_available, description, image_url, food_type,is_active, is_deleted,
        });

        const isUpdate = !!id;
        return res.status(isUpdate ? 200 : 201).json({
            success: true,
            message: isUpdate ? "Product updated successfully" : "Product added successfully",
            data: product
        });

    } catch (err) {
        const statusCode = err.statusCode || Number(err.status) || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal server error"
        });
    }
};

const getProductsController = async (req, res) => {
    try {
        const { 
            org_id, id, 
            category_id, search, food_type, is_available, is_active, 
            page = 1, limit = 10 
        } = req.query;

        if (!org_id) {
            return res.status(400).json({
                success: false,
                message: "org_id is required."
            });
        }

        // 1. Prepare pagination calculations
        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);
        const offset = (parsedPage - 1) * parsedLimit;

        // 2. Prepare filter object
        const filters = {
            category_id: category_id ? parseInt(category_id, 10) : null,
            search: search || null,
            food_type: food_type || null,
            // Convert string "true"/"false" from URL to actual booleans
            is_available: is_available !== undefined ? is_available === 'true' : undefined,
            is_active: is_active !== undefined ? is_active === 'true' : undefined,
            page: parsedPage,
            limit: parsedLimit,
            offset: offset
        };

        const data = await getProductsService(
            parseInt(org_id, 10), 
            id ? parseInt(id, 10) : null,
            filters
        );

        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            data: data
        });

    } catch (err) {
        const statusCode = err.statusCode || Number(err.status) || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal server error"
        });
    }
}

const deleteProductController = async (req, res) => {
    try {
        // Extract parameters from the query string (e.g., ?org_id=1&id=3)
        const { id, org_id } = req.query;

        // Validation
        if (!id || !org_id) {
            return res.status(400).json({
                success: false,
                message: "Both id and org_id are required to delete a product."
            });
        }

        // Call the service
        const deletedProduct = await deleteProductService(parseInt(id, 10), parseInt(org_id, 10));

        return res.status(200).json({
            success: true,
            message: `Product '${deletedProduct.pro_name}' has been successfully deleted.`
        });

    } catch (err) {
        console.error("Delete Product Controller Error:", err.message);
        
        const statusCode = err.statusCode || Number(err.status) || 500;
        
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal server error"
        });
    }
}

const deleteCategoryController = async (req, res) => {
    try {
        const { id, org_id } = req.query;

        // Validation
        if (!id || !org_id) {
            return res.status(400).json({
                success: false,
                message: "Both id and org_id are required to delete a category."
            });
        }

        // Call the service
        const deletedCategory = await deleteCategoryService(parseInt(id, 10), parseInt(org_id, 10));

        return res.status(200).json({
            success: true,
            message: `Category '${deletedCategory.name}' has been successfully deleted.`
        });

    } catch (err) {
        console.error("Delete Category Controller Error:", err.message);
        
        const statusCode = err.statusCode || Number(err.status) || 500;
        
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal server error"
        });
    }
}

export {
    manageCategoriesController,
    getCategoriesController,
    manageProductsController,
    getProductsController,
    deleteProductController,
    deleteCategoryController
}