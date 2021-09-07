import express from 'express';
const router = express.Router();
import {ObjectId} from 'mongodb';
import {body, param} from 'express-validator';
import State from '../Controller/StateController';
import JwtVerify from '../Middlewares/JwtVerify';
import RolePermission from '../Middlewares/RolePermission';

router.post('', JwtVerify, RolePermission('Region', 'create'),
    body('name').exists().withMessage('State Name should not be empty'),
    body('country').exists().withMessage('Country ID should not be empty').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    State.create);

router.get('', JwtVerify, RolePermission('Region', 'list'), State.index);

router.get('/:id', JwtVerify, RolePermission('Region', 'view'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    State.single);

router.put('/:id', JwtVerify, RolePermission('Region', 'edit'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    State.update);

router.delete('/:id', JwtVerify, RolePermission('Region', 'delete'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    State.remove);

export default router;
