import { createOrderRepo, getOrdersRepo, updateOrderStatusRepo } from '../repositories/orderRepository.js';
import { AppError } from '../middlewares/erroHandler.js'; // Adjust path if needed
import { deleteOrderRepo } from '../repositories/orderRepository.js';
import { updateOrderDetailsRepo } from '../repositories/orderRepository.js';

const createOrderService = async (orderData) => {
    try {
        // Basic recalculation to ensure the frontend didn't send a manipulated total
        const calculatedTotal = orderData.items.reduce((sum, item) => sum + Number(item.subtotal), 0);

        if (Math.abs(calculatedTotal - orderData.total_amount) > 1) { // Allowing 1 rupee floating point difference
            throw new AppError("Order total does not match the sum of items", 400);
        }

        return await createOrderRepo(orderData);
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Create Order Service Error:", error);
        throw new AppError("Failed to create order", 500);
    }
};

const getOrdersService = async (org_id, filters) => {
    try {
        const result = await getOrdersRepo(org_id, filters);

        if (filters.order_id) {
            if (result.rows.length === 0) throw new AppError("Order not found", 404);
            const { total_count, ...order } = result.rows[0];
            return order;
        }

        const totalItems = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
        const orders = result.rows.map(row => {
            const { total_count, ...cleanRow } = row;
            return cleanRow;
        });

        return {
            orders,
            pagination: {
                total_items: totalItems,
                current_page: filters.page,
                total_pages: Math.ceil(totalItems / filters.limit)
            }
        };
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Get Orders Service Error:", error);
        throw new AppError("Internal Server Error", 500);
    }
};

const updateOrderStatusService = async (id, org_id, order_status, payment_status) => {
    try {
        const result = await updateOrderStatusRepo(id, org_id, order_status, payment_status);
        if (result.rowCount === 0) {
            throw new AppError("Order not found or unauthorized", 404);
        }
        return result.rows[0];
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Update Order Status Error:", error);
        throw new AppError("Internal Server Error", 500);
    }
}

const deleteOrderService = async (id, org_id) => {
    try {
        const result = await deleteOrderRepo(id, org_id);

        if (result.rowCount === 0) {
            throw new AppError("Order not found or unauthorized", 404);
        }

        return result.rows[0];
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Delete Order Service Error:", error);
        throw new AppError("Internal Server Error", 500);
    }
}

const updateOrderDetailsService = async (orderData) => {
    try {
        // Validate that the frontend math is correct to prevent tampering
        const calculatedTotal = orderData.items.reduce((sum, item) => sum + Number(item.subtotal), 0);

        if (Math.abs(calculatedTotal - orderData.total_amount) > 1) {
            throw new AppError("Order total does not match the sum of items", 400);
        }

        return await updateOrderDetailsRepo(orderData);

    } catch (error) {
        if (error.message === "ORDER_NOT_FOUND") {
            throw new AppError("Order not found or unauthorized", 404);
        }
        if (error instanceof AppError) throw error;

        console.error("Update Order Details Service Error:", error);
        throw new AppError("Failed to update order details", 500);
    }
}

export { createOrderService, getOrdersService, updateOrderStatusService, deleteOrderService, updateOrderDetailsService }