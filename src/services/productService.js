import { AppError } from "../middlewares/erroHandler.js";
import { deleteCategoryRepo, deleteProductRepo, getAllCategoriesRepo, getCategoryByIdRepo, getProductsRepo, insertCategoryRepo, manageProductRepo, updateCategoryRepo } from "../repositories/productRepository.js";


const getCategoriesService = async ({ org_id, id, filters }) => {
    try {
        if (id) {
            // 🔍 Fetch specific category (No pagination needed)
            const result = await getCategoryByIdRepo(id, org_id);

            if (result.rows.length === 0) {
                throw new AppError("Category not found or does not belong to this organization", 404);
            }
            return result.rows[0]; 
        } else {
            // 📋 Fetch paginated list of categories
            const result = await getAllCategoriesRepo(org_id, filters);

            const totalItems = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
            const totalPages = Math.ceil(totalItems / filters.limit);

            // Clean up the total_count property from the actual category objects
            const categories = result.rows.map(row => {
                const { total_count, ...cleanRow } = row;
                return cleanRow;
            });

            return {
                categories: categories,
                pagination: {
                    total_items: totalItems,
                    current_page: filters.page,
                    total_pages: totalPages,
                    limit: filters.limit
                }
            };
        }
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Get Categories Service Error:", error);
        throw new AppError("Internal Server Error", 500);
    }
};

const manageCategoriesService = async (categoryData) => {
    const { id, org_id, name, description, display_order = 0, is_active = true } = categoryData;

    try {
        if (id) {
            // 🔄 UPDATE LOGIC 
            const values = [name, description, display_order, is_active, id, org_id];
            const result = await updateCategoryRepo(values);

            if (result.rowCount === 0) {
                throw new AppError("Category not found or does not belong to this organization", 404);
            }
            return result.rows[0];

        } else {
            // ➕ INSERT LOGIC 
            const values = [org_id, name, description, display_order, is_active];
            const result = await insertCategoryRepo(values);

            return result.rows[0];
        }

    } catch (error) {
        // ✅ Rethrow AppErrors
        if (error instanceof AppError) {
            throw error;
        }

        // ❗ Handle PostgreSQL unique constraint (org_id, name)
        if (error.code === '23505') {
            throw new AppError("A category with this name already exists in your organization", 409);
        }

        console.error("Manage Category Service Error:", error);
        throw new AppError("Internal Server Error", 500);
    }
}

const manageProductsService = async (productData) => {
    const { id, org_id, category_id, name, price, is_available = true, description,is_active, is_deleted, image_url, food_type = 'veg' } = productData;

    try {
        const result = await manageProductRepo({
            id, org_id, category_id, name, price, is_available, description, image_url, food_type,is_active, is_deleted,
        });

        return result;

    } catch (error) {
        if (error.message === "NOT_FOUND") {
            throw new AppError("Product not found or does not belong to this organization", 404);
        }

        // ❗ Catch Foreign Key Violation (e.g., category_id doesn't exist)
        if (error.code === '23503') {
            throw new AppError("The assigned category does not exist.", 400);
        }

        console.error("Manage Product Service Error:", error);
        throw new AppError("Internal Server Error", 500);
    }
}

const getProductsService = async (org_id, id, filters) => {
    try {
        const result = await getProductsRepo(org_id, id, filters);

        // Scenario A: Fetching a single product by ID
        if (id) {
            if (result.rows.length === 0) {
                throw new AppError("Product not found", 404);
            }
            const product = result.rows[0];
            delete product.total_count; // Clean up the window function count
            return product;
        }

        // Scenario B: Fetching a filtered/paginated list of products
        const totalItems = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
        const totalPages = Math.ceil(totalItems / filters.limit);

        // Remove the 'total_count' column from the final output for cleanliness
        const products = result.rows.map(row => {
            const { total_count, ...cleanRow } = row;
            return cleanRow;
        });

        return {
            products: products,
            pagination: {
                total_items: totalItems,
                current_page: filters.page,
                total_pages: totalPages,
                limit: filters.limit
            }
        };

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Get Products Service Error:", error);
        throw new AppError("Internal Server Error", 500);
    }
}

const deleteProductService = async (id, org_id) => {
    try {
        const result = await deleteProductRepo(id, org_id);
        
        // If rowCount is 0, it means the product wasn't found or was already deleted
        if (result.rowCount === 0) {
            throw new AppError("Product not found, already deleted, or unauthorized", 404);
        }
        
        return result.rows[0]; 

    } catch (error) {
        if (error instanceof AppError) throw error;
        
        console.error("Delete Product Service Error:", error);
        throw new AppError("Internal Server Error", 500);
    }
}

const deleteCategoryService = async (id, org_id) => {
    try {
        const result = await deleteCategoryRepo(id, org_id);
        
        if (result.rowCount === 0) {
            throw new AppError("Category not found, already deleted, or unauthorized", 404);
        }
        
        return result.rows[0]; 

    } catch (error) {
        if (error instanceof AppError) throw error;
        
        console.error("Delete Category Service Error:", error);
        throw new AppError("Internal Server Error", 500);
    }
}

export {
    manageCategoriesService,
    getCategoriesService,
    manageProductsService,
    getProductsService,
    deleteProductService,
    deleteCategoryService
}