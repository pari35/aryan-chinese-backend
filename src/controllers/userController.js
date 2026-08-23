import Joi from "joi";
import bcrypt from 'bcrypt'
import { loginUserService, registerUserService } from "../services/userService.js";


const registerUserController = async (req, res) => {
    try {
        // 1. Updated Joi schema (password is now optional)
        const schema = Joi.object({
            org_id: Joi.number().integer().positive().required(),
            phone_number: Joi.string().min(10).max(15).required(), 
            name: Joi.string().min(2).max(100).required(),
            password: Joi.string().min(6).max(255).optional(), // 🟢 Made optional
            role: Joi.string().valid('customer', 'admin', 'manager').default('customer')
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const { org_id, phone_number, name, password, role } = value;

        // 2. Hash the password ONLY if the user provided one
        let encpassword = null;
        if (password) {
            encpassword = await bcrypt.hash(password, 10);
        }
        
        // 3. Call the service
        const user = await registerUserService({
            org_id,
            phone_number,
            name,
            password: encpassword, // Will be null for guest checkouts
            role
        });

        // 4. Security measure: Remove the hashed password before sending to client
        if (user && user.password) {
            delete user.password;
        }

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: user,
        });

    } catch (err) {
        console.error("Controller Error:", err);
        const statusCode = err.statusCode || Number(err.status) || 500;

        return res.status(statusCode).json({
            success: false,
            message: err.message || "Internal server error",
        });
    }
};


const loginUserController = async (req, res) => {
    try {
        // Extract multi-tenant payload
        const { org_id, phone_number, password } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;

        console.log(`Login attempt from IP: ${ipAddress} for Org: ${org_id}`);

        // Controller handles the missing data responses (No crashing!)
        if (!org_id || !phone_number || !password) {
            return res.status(400).json({
                success: false,
                message: "org_id, phone_number, and password are required"
            });
        }

        // Call the service with an object, NOT req/res
        const user = await loginUserService({ org_id, phone_number, password, ipAddress });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: user
        });

    } catch (err) {
        console.error("Login Error:", err.message);

        // Safely extract status or default to 401 Unauthorized
        const statusCode = err.statusCode || Number(err.status) || 401;

        return res.status(statusCode).json({
            success: false,
            message: err.message || "Authentication failed"
        });
    }
};

export {
    registerUserController,
    loginUserController
}