import express from 'express';
const router = express.Router();
import {ObjectId} from 'mongodb';
import {body, param} from 'express-validator';
import School from '../Controller/SchoolController';
import JwtVerify from '../Middlewares/JwtVerify';
import RolePermission from '../Middlewares/RolePermission';

router.post('', JwtVerify, RolePermission('School', 'create'),
    body('name').exists().withMessage('Class Name should not be empty'),
    body('region').exists().withMessage('Region/State should not be empty').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('country').exists().withMessage('Country should not be empty').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    School.create);

router.get('', JwtVerify, RolePermission('School', 'list'), School.index);

router.get('/:id', JwtVerify, RolePermission('School', 'view'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    School.single);

router.put('/:id', JwtVerify, RolePermission('School', 'edit'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    School.update);

router.delete('/:id', JwtVerify, RolePermission('School', 'delete'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    School.remove);

export default router;
