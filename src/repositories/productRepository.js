import { AppError } from '../middlewares/erroHandler.js';
import pool from '../utils/db.js';

const updateCategoryRepo = async (values) => {
    const query = `
        UPDATE categories 
        SET name = $1, description = $2, display_order = $3, is_active = $4
        WHERE id = $5 AND org_id = $6
        RETURNING *;
    `;
    return await pool.query(query, values);
};

const insertCategoryRepo = async (values) => {
    const query = `
        INSERT INTO categories (org_id, name, description, display_order, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    return await pool.query(query, values);
};

// Fetch a single category by ID (ensuring it belongs to the correct org)
const getCategoryByIdRepo = async (id, org_id) => {
    const query = `
        SELECT * FROM categories 
        WHERE id = $1 AND org_id = $2 AND is_deleted = FALSE;
    `;
    return await pool.query(query, [id, org_id]);
};

// Fetch all categories for a specific organization, sorted by display_order
const getAllCategoriesRepo = async (org_id, filters = {}) => {
    const { search, is_active, limit, offset } = filters;

    // Added COUNT(*) OVER() to track the total items before LIMIT/OFFSET are applied
    let query = `
        SELECT id, org_id, name, description, display_order, is_active, created_at,
               COUNT(*) OVER() AS total_count
        FROM categories 
        WHERE org_id = $1 AND is_deleted = FALSE
    `;
    
    const values = [org_id];
    let paramIndex = 2;

    // --- APPLY DYNAMIC FILTERS ---
    if (search) {
        query += ` AND name ILIKE $${paramIndex}`;
        values.push(`%${search}%`);
        paramIndex++;
    }

    if (is_active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        values.push(is_active);
        paramIndex++;
    }

    // --- APPLY ORDERING & PAGINATION ---
    query += ` ORDER BY display_order ASC, created_at DESC `;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1};`;
    values.push(limit, offset);

    return await pool.query(query, values);
}

const manageProductRepo = async (data) => {
    // 1. Added is_active and is_deleted to the destructuring with safe defaults
    const {
        id, org_id, category_id, name, price, is_available = true,
        is_active = true, is_deleted = false,
        description, image_url, food_type
    } = data;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let productResult;

        if (id) {
            // 🔄 UPDATE (Now includes is_active and is_deleted)
            const updateProduct = `
                UPDATE products 
                SET category_id = $1, name = $2, price = $3, is_available = $4, is_active = $5, is_deleted = $6
                WHERE id = $7 AND org_id = $8
                RETURNING *;
            `;
            productResult = await client.query(updateProduct, [
                category_id, name, price, is_available, is_active, is_deleted, id, org_id
            ]);

            if (productResult.rowCount === 0) throw new Error("NOT_FOUND");

            const updateDetails = `
                UPDATE product_details 
                SET description = $1, image_url = $2, food_type = $3
                WHERE product_id = $4;
            `;
            await client.query(updateDetails, [description, image_url, food_type, id]);

        } else {
            // ➕ INSERT (Fixed the 'pro_name' typo to 'name' and added new columns)
            const insertProduct = `
                INSERT INTO products (org_id, category_id, pro_name, price, is_available, is_active, is_deleted)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            productResult = await client.query(insertProduct, [
                org_id, category_id, name, price, is_available, is_active, is_deleted
            ]);
            const newProductId = productResult.rows[0].id;

            const insertDetails = `
                INSERT INTO product_details (product_id, description, image_url, food_type)
                VALUES ($1, $2, $3, $4);
            `;
            await client.query(insertDetails, [newProductId, description, image_url, food_type]);
        }

        await client.query('COMMIT');

        return { ...productResult.rows[0], description, image_url, food_type };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

const getProductsRepo = async (org_id, id = null, filters = {}) => {
    const { category_id, search, food_type, is_available, is_active, limit, offset } = filters;

    // Notice the COUNT(*) OVER() - this gives us the total row count BEFORE limit/offset are applied!
    let query = `
        SELECT p.id, p.org_id, p.category_id, p.pro_name, p.price, p.is_available, 
               p.is_active, p.is_deleted, p.created_at,
               pd.description, pd.image_url, pd.food_type,
               COUNT(*) OVER() AS total_count 
        FROM products p
        LEFT JOIN product_details pd ON p.id = pd.product_id
        WHERE p.org_id = $1 AND p.is_deleted = FALSE 
    `;
    
    const values = [org_id];
    let paramIndex = 2; // Starts at 2 because $1 is already org_id

    // If ID is provided, skip all filters/pagination and return the single item
    if (id) {
        query += ` AND p.id = $2;`;
        values.push(id);
        return await pool.query(query, values);
    }

    // --- APPLY DYNAMIC FILTERS ---
    if (category_id) {
        query += ` AND p.category_id = $${paramIndex}`;
        values.push(category_id);
        paramIndex++;
    }

    if (search) {
        // ILIKE makes the search case-insensitive (e.g., "Noodles" matches "Hakka noodles")
        query += ` AND p.pro_name ILIKE $${paramIndex}`;
        values.push(`%${search}%`);
        paramIndex++;
    }

    if (food_type) {
        query += ` AND pd.food_type = $${paramIndex}`;
        values.push(food_type);
        paramIndex++;
    }

    if (is_available !== undefined) {
        query += ` AND p.is_available = $${paramIndex}`;
        values.push(is_available);
        paramIndex++;
    }

    if (is_active !== undefined) {
        query += ` AND p.is_active = $${paramIndex}`;
        values.push(is_active);
        paramIndex++;
    }

    // --- APPLY ORDERING & PAGINATION ---
    query += ` ORDER BY p.category_id ASC, p.pro_name ASC `;
    
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1};`;
    values.push(limit, offset);

    return await pool.query(query, values);
};

const deleteProductRepo = async (id, org_id) => {
    const query = `
        UPDATE products 
        SET is_deleted = TRUE, is_active = FALSE
        WHERE id = $1 AND org_id = $2 AND is_deleted = FALSE
        RETURNING id, pro_name;
    `;
    
    return await pool.query(query, [id, org_id]);
}

const deleteCategoryRepo = async (id, org_id) => {
    const query = `
        UPDATE categories 
        SET is_deleted = TRUE, is_active = FALSE
        WHERE id = $1 AND org_id = $2 AND is_deleted = FALSE
        RETURNING id, name;
    `;
    return await pool.query(query, [id, org_id]);
}

export {
    updateCategoryRepo,
    insertCategoryRepo,
    getCategoryByIdRepo,
    getAllCategoriesRepo,
    manageProductRepo,
    getProductsRepo,
    deleteProductRepo,
    deleteCategoryRepo
}