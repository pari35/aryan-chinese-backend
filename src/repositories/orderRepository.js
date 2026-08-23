import pool from '../utils/db.js'; // Adjust your path

// 🟢 1. CREATE ORDER (Transaction)
const createOrderRepo = async (orderData) => {
    const { org_id, user_id, table_number, total_amount, payment_method, items } = orderData;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Insert the main order
        const insertOrderQuery = `
            INSERT INTO orders (org_id, user_id, table_number, total_amount, payment_method)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const orderResult = await client.query(insertOrderQuery, [
            org_id, user_id, table_number, total_amount, payment_method
        ]);
        const newOrder = orderResult.rows[0];

        // Step 2: Insert all order items
        // We use a parameterized batch insert for security and performance
        const itemValues = [];
        const itemPlaceholders = [];
        let paramIndex = 1;

        items.forEach((item, index) => {
            itemPlaceholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`);
            itemValues.push(
                newOrder.id, item.product_id, item.product_name,
                item.unit_price, item.quantity, item.subtotal, item.special_instructions || null
            );
            paramIndex += 7;
        });

        const insertItemsQuery = `
            INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, special_instructions)
            VALUES ${itemPlaceholders.join(', ')}
            RETURNING *;
        `;
        const itemsResult = await client.query(insertItemsQuery, itemValues);

        await client.query('COMMIT');

        // Return combined data
        return { ...newOrder, items: itemsResult.rows };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// 🔵 2. GET ORDERS (With JSON Aggregation for Items)
const getOrdersRepo = async (org_id, filters = {}) => {
    const { order_id, user_id, order_status, limit = 20, offset = 0 } = filters;
    const values = [org_id];
    let paramIndex = 2;

    // Using json_agg to bundle order_items directly into an array inside the order object
    let query = `
        SELECT o.*, 
               COUNT(*) OVER() AS total_count,
               COALESCE(
                   json_agg(
                       json_build_object(
                           'item_id', oi.id,
                           'product_id', oi.product_id,
                           'product_name', oi.product_name,
                           'unit_price', oi.unit_price,
                           'quantity', oi.quantity,
                           'subtotal', oi.subtotal,
                           'special_instructions', oi.special_instructions
                       )
                   ) FILTER (WHERE oi.id IS NOT NULL), '[]'
               ) AS items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.org_id = $1
    `;

    if (order_id) {
        query += ` AND o.id = $${paramIndex++}`;
        values.push(order_id);
    }
    if (user_id) {
        query += ` AND o.user_id = $${paramIndex++}`;
        values.push(user_id);
    }
    if (order_status) {
        query += ` AND o.order_status = $${paramIndex++}`;
        values.push(order_status);
    }

    // Grouping is required because we are using an aggregate function (json_agg)
    query += ` GROUP BY o.id `;
    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex};`;
    values.push(limit, offset);

    return await pool.query(query, values);
};

// 🟠 3. UPDATE ORDER STATUS
const updateOrderStatusRepo = async (id, org_id, order_status, payment_status) => {
    const query = `
        UPDATE orders 
        SET order_status = COALESCE($1, order_status), 
            payment_status = COALESCE($2, payment_status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND org_id = $4
        RETURNING *;
    `;
    return await pool.query(query, [order_status, payment_status, id, org_id]);
}

const deleteOrderRepo = async (id, org_id) => {
    const query = `
        DELETE FROM orders 
        WHERE id = $1 AND org_id = $2
        RETURNING id;
    `;
    return await pool.query(query, [id, org_id])
}

// 🟢 5. UPDATE FULL ORDER (Items added, updated, or removed)
const updateOrderDetailsRepo = async (orderData) => {
    const { order_id, org_id, total_amount, items } = orderData;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Update main order total
        const updateOrderQuery = `
            UPDATE orders 
            SET total_amount = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND org_id = $3
            RETURNING *;
        `;
        const orderResult = await client.query(updateOrderQuery, [total_amount, order_id, org_id]);

        if (orderResult.rowCount === 0) {
            throw new Error("ORDER_NOT_FOUND");
        }

        // Step 2: Handle Order Items
        // Extract the IDs of the items the user wants to KEEP or UPDATE
        const incomingItemIds = items
            .map(item => item.item_id)
            .filter(id => id != null); // removes undefined/null

        // A. DELETE missing items
        if (incomingItemIds.length > 0) {
            // Delete items that belong to this order but are NOT in the incoming array
            await client.query(`
                DELETE FROM order_items 
                WHERE order_id = $1 AND id != ALL($2::int[])
            `, [order_id, incomingItemIds]);
        } else {
            // If the user removed absolutely everything, clear all items
            await client.query(`DELETE FROM order_items WHERE order_id = $1`, [order_id]);
        }

        // B. INSERT or UPDATE remaining items
        for (const item of items) {
            if (item.item_id) {
                // It has an ID, so it exists -> UPDATE it
                await client.query(`
                    UPDATE order_items 
                    SET quantity = $1, subtotal = $2, special_instructions = $3
                    WHERE id = $4 AND order_id = $5
                `, [item.quantity, item.subtotal, item.special_instructions || null, item.item_id, order_id]);
            } else {
                // It has no ID, so it is brand new -> INSERT it
                await client.query(`
                    INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, special_instructions)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [order_id, item.product_id, item.product_name, item.unit_price, item.quantity, item.subtotal, item.special_instructions || null]);
            }
        }

        await client.query('COMMIT');
        return orderResult.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export { createOrderRepo, getOrdersRepo, updateOrderStatusRepo, deleteOrderRepo, updateOrderDetailsRepo }