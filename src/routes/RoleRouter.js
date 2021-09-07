import express from 'express';
const router = express.Router();
import Role from '../Controller/RoleController';
import JwtVerify from '../Middlewares/JwtVerify';
import RolePermission from '../Middlewares/RolePermission';

router.post('', JwtVerify, Role.create);
router.get('', JwtVerify, RolePermission('User', 'list'), Role.index);

export default router;
