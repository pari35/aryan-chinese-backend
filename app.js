import express from 'express';
import dotenv from 'dotenv';
import routes from './src/routes/index.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration

// Basic middleware
app.use(express.json());

// Static files handling


// Performance Monitoring
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});


// Routes
app.use('/api/v1', routes);


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
})


// Start server
app.listen(port, async () => {
  // await testDatabaseConnection();
  console.log(`Server is running on http://localhost:${port}`);
});


export default app;