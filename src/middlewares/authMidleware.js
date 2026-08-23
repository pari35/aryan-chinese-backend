import { AppError } from "./erroHandler.js";
import jwt from 'jsonwebtoken'

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = {
                userid: decoded.userid,
                emailid: decoded.emailid               
            };

            next();
        } catch (error) {
            console.log("error", error);
            throw new AppError('Invalid or expired token', 401);
        }
    } catch (error) {
        next(error);
    }
};

export {
    authMiddleware
}

