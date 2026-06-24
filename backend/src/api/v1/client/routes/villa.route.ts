import express from 'express';
import { index, getVillaDetail, searchVillas } from '../controllers/villa.controller';

const router = express.Router();

// Get all villas
router.get('/', index);

router.get('/search', searchVillas);

router.get('/detail/:id', getVillaDetail);

export default router;