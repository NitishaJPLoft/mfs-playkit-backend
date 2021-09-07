import express from 'express';
const router = express.Router();
import {ObjectId} from 'mongodb';
import {body, param} from 'express-validator';
import Class from '../Controller/ClassController';
import JwtVerify from '../Middlewares/JwtVerify';
import RolePermission from '../Middlewares/RolePermission';

router.post('', JwtVerify, RolePermission('Class', 'create'),
    body('name').exists().withMessage('Class Name should not be empty'),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Class.create);

router.get('', JwtVerify, RolePermission('Class', 'list'), Class.index);

router.get('/:id', JwtVerify, RolePermission('Class', 'view'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Class.single);

router.put('/:id', JwtVerify, RolePermission('Class', 'edit'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Class.update);

router.delete('/:id', JwtVerify, RolePermission('Class', 'delete'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Class.remove);

export default router;
