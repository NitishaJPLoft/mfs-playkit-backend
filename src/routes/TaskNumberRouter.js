import express from 'express';
const router = express.Router();
import TaskNumber from '../Controller/TaskNumberController';
import JwtVerify from '../Middlewares/JwtVerify';

router.post('', JwtVerify, TaskNumber.create);
router.get('', JwtVerify, TaskNumber.index);

export default router;
