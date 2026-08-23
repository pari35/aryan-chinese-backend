import { createOrderService, deleteOrderService, getOrdersService, updateOrderDetailsService, updateOrderStatusService } from '../services/orderService.js';

const createOrderController = async (req, res) => {
    try {
        const { org_id, user_id, table_number, total_amount, payment_method, items } = req.body;

        if (!org_id || !total_amount || !items || !items.length) {
            return res.status(400).json({ success: false, message: "Missing required order data or items." });
        }

        const order = await createOrderService({ org_id, user_id, table_number, total_amount, payment_method, items });

        return res.status(201).json({ success: true, message: "Order placed successfully", data: order });
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({ success: false, message: err.message });
    }
}

const getOrdersController = async (req, res) => {
    try {
        const { org_id, order_id, user_id, order_status, page = 1, limit = 20 } = req.query;

        if (!org_id) return res.status(400).json({ success: false, message: "org_id is required" });

        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);

        const filters = {
            order_id: order_id ? parseInt(order_id, 10) : null,
            user_id: user_id ? parseInt(user_id, 10) : null,
            order_status: order_status || null,
            page: parsedPage,
            limit: parsedLimit,
            offset: (parsedPage - 1) * parsedLimit
        };

        const data = await getOrdersService(parseInt(org_id, 10), filters);

        return res.status(200).json({ success: true, message: "Orders fetched successfully", data });
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({ success: false, message: err.message });
    }
};

const updateOrderStatusController = async (req, res) => {
    try {
        const { order_id, org_id, order_status, payment_status } = req.body;

        if (!order_id || !org_id) {
            return res.status(400).json({ success: false, message: "order_id and org_id are required" });
        }

        const updatedOrder = await updateOrderStatusService(order_id, org_id, order_status, payment_status);

        return res.status(200).json({ success: true, message: "Order updated successfully", data: updatedOrder });
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({ success: false, message: err.message });
    }
};

const deleteOrderController = async (req, res) => {
    try {
        const { id, org_id } = req.query;

        if (!id || !org_id) {
            return res.status(400).json({
                success: false,
                message: "Both id and org_id are required to delete an order."
            });
        }

        await deleteOrderService(parseInt(id, 10), parseInt(org_id, 10));

        return res.status(200).json({
            success: true,
            message: `Order #${id} has been successfully deleted.`
        });

    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal server error"
        });
    }
}

const updateOrderDetailsController = async (req, res) => {
    try {
        const { order_id, org_id, total_amount, items } = req.body;

        // Validation
        if (!order_id || !org_id || total_amount == null || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: "Missing required order data or items array."
            });
        }

        const updatedOrder = await updateOrderDetailsService({
            order_id, org_id, total_amount, items
        });

        return res.status(200).json({
            success: true,
            message: "Order items updated successfully",
            data: updatedOrder
        });

    } catch (err) {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
}

export { createOrderController, getOrdersController, updateOrderStatusController, deleteOrderController, updateOrderDetailsController }