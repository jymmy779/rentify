import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connect as connectDatabase } from './config/database';
import clientRoutesApiVer1 from './api/v1/client/routes/index.route';


const app = express();
const port = process.env.PORT || 8000;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Connect database
connectDatabase();

// Setup Middlewares
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Rentify API v1.0' });
});

// Initialize Version 1 Routes
clientRoutesApiVer1(app);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
