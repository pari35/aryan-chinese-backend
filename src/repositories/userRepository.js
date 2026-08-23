
import { AppError } from '../middlewares/erroHandler.js';
import pool from '../utils/db.js';

const registerUser = async (userRegData) => {
    try {
        const { username, emailid, password } = userRegData;

        const addUser = await prisma.users.create({
            data: userRegData
        })

        return addUser
    } catch (error) {
        console.error("Error registering user:", error.message);
        throw error;
    }

}

export {
    registerUser
}