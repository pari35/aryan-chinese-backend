import { registerUser } from "../repositories/userRepository.js"
import bcrypt from 'bcrypt'
import pool from '../utils/db.js';
import { AppError } from "../middlewares/erroHandler.js";
import jwt from 'jsonwebtoken'
import Joi from 'joi';

const registerUserService = async (userData) => {
    // 1. Extract the password from userData
    const { org_id, phone_number, name, password, role = 'customer' } = userData;

    try {
        // 🔍 Check if user exists within the specific organization
        const getUser = `SELECT * FROM users WHERE org_id = $1 AND phone_number = $2`;
        const existingUser = await pool.query(getUser, [org_id, phone_number]);

        if (existingUser.rows.length > 0) {
            throw new AppError("User with this phone number already exists in this organization", 409);
        }

        // 🧾 Insert user
        // 2. Add password to the INSERT statement and $4 to VALUES
        const query = `
            INSERT INTO users (org_id, phone_number, name, password, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        // 3. Add password to the parameter array
        const result = await pool.query(query, [org_id, phone_number, name, password, role]);

        return result.rows[0];

    } catch (error) {
        console.error("Service Error:", error);

        // ✅ If it's already an AppError → rethrow
        if (error instanceof AppError) {
            throw error;
        }

        // ❗ Handle PostgreSQL unique constraint (extra safety)
        if (error.code === "23505") {
            throw new AppError("User already exists in this organization", 409);
        }

        // ❌ Unknown error
        throw new AppError("Internal Server Error", 500);
    }
};

const loginUserService = async ({ org_id, phone_number, password, ipAddress }) => {

    // 1. Fetch user matching BOTH org_id and phone_number
    const getUser = `SELECT * FROM users WHERE org_id = $1 AND phone_number = $2`;
    const result = await pool.query(getUser, [org_id, phone_number]);
    
   const user = result.rows[0];

    if (!user) {
        throw new AppError('Invalid organization or phone number', 401);
    }

    // 🚨 NEW SAFETY CHECK: Make sure the user actually has a password in the DB
    if (!user.password) {
        throw new AppError('No password set for this user. Please register again.', 400);
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
        throw new AppError('Invalid password', 401);
    }

    // 3. Create JWT token
    const token = jwt.sign(
        {
            userid: user.id,
            org_id: user.org_id,
            phone_number: user.phone_number,
            role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
console.log("ewfrd",token);
    // process.exit()
    // 4. Return the data to the Controller
    return {
        userid: user.id,
        org_id: user.org_id,
        phone_number: user.phone_number,
        name: user.name,
        role: user.role,
        token
    };
};

const authenticate = async ({ org_id, phone_number, password, ipAddress }) => {

    // 1. Fetch user by BOTH org_id and phone_number
    const getUser = `SELECT * FROM users WHERE org_id = $1 AND phone_number = $2`;
    const result = await pool.query(getUser, [org_id, phone_number]);
    
    const user = result.rows[0];

    if (!user) {
        throw new AppError('Invalid organization or phone number', 401);
    }

    // 2. Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new AppError('Invalid password', 401);
    }

    // 3. Create JWT token 
    // Pro-tip: Injecting role and org_id makes middleware authorization much easier later
    const token = jwt.sign(
        {
            userid: user.id,
            org_id: user.org_id,
            phone_number: user.phone_number,
            role: user.role 
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '24h'
        }
    );

    // 4. Return useful user metadata to the frontend along with the token
    return {
        userid: user.id,
        org_id: user.org_id,
        phone_number: user.phone_number,
        name: user.name,
        role: user.role,
        token
    };
};

export {
    registerUserService,
    loginUserService
}