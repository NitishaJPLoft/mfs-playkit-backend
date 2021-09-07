import express from 'express';
const router = express.Router();
import Dashboard from '../Controller/DashboardController';
import JwtVerify from '../Middlewares/JwtVerify';

router.get('', JwtVerify, Dashboard.mainDetails);

export default router;
