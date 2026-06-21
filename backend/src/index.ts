import 'dotenv/config';
import express from 'express';

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TODO: Import routes here
// import villaRoutes from './routes/villas';
// app.use('/api/villas', villaRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Rentify API v1.0' });
});

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
