import express from 'express';
const router = express.Router();
import Movement from '../Controller/MovementController';
import JwtVerify from '../Middlewares/JwtVerify';

router.post('', JwtVerify, Movement.create);
router.get('', JwtVerify, Movement.index);

export default router;
