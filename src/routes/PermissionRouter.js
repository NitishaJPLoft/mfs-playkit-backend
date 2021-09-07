import express from 'express';
const router = express.Router();
import Permission from '../Controller/PermissionController';
import JwtVerify from '../Middlewares/JwtVerify';

router.post('', JwtVerify, Permission.create);
router.post('/bulk-insert', JwtVerify, Permission.bulkCreate);
router.get('', JwtVerify, Permission.index);

export default router;
