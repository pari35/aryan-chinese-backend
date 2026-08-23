import pkg from 'pg';
const { Pool } = pkg;

import 'dotenv/config'; 

const pool = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "aryan_chinese",
    
    // 🟢 Force the password to be a string to fix the SASL error
    password: String(process.env.DB_PASSWORD || "123"), 
    
    port: process.env.DB_PORT || 5432,
    ssl: {
        rejectUnauthorized: false
    }
});


export default pool