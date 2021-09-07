import express from 'express';
import {ObjectId} from 'mongodb';
const router = express.Router();
import {body, param} from 'express-validator';
import User from '../Controller/UserController';
import JwtVerify from '../Middlewares/JwtVerify';
import RolePermission from '../Middlewares/RolePermission';

router.post('/register', JwtVerify, RolePermission('User', 'create'),
    body('firstName').exists().withMessage('FirstName should not be empty'),
    body('lastName').exists().withMessage('LastName should not be empty'),
    body('email').exists().withMessage('Email should not be empty')
        .isEmail().withMessage('Email should be in correct format'),
    body('role').exists().withMessage('Role should not be empty').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    User.register);

router.post('/bulk-register', JwtVerify, RolePermission('User', 'create'),
    body('role').exists().withMessage('Role should not be empty').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should not be empty and should be in correct format'),
    User.bulkCreate);

router.get('', JwtVerify, RolePermission('User', 'list'), User.index);

router.get('/:id', JwtVerify, RolePermission('User', 'view'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    User.single);

router.put('/:id', JwtVerify, RolePermission('User', 'edit'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    User.update);

router.delete('/:id', JwtVerify, RolePermission('User', 'delete'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    User.remove);

export default router;
