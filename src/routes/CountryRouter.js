import express from 'express';
const router = express.Router();
import {ObjectId} from 'mongodb';
import {body, param, query} from 'express-validator';
import Country from '../Controller/CountryController';
import JwtVerify from '../Middlewares/JwtVerify';
import RolePermission from '../Middlewares/RolePermission';

router.post('', JwtVerify, RolePermission('Country', 'create'),
    body('name').exists().withMessage('Country Name should not be empty'),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Country.create);

router.get('', JwtVerify, RolePermission('Country', 'list'),
    query('status').exists().withMessage('Status for country should not be empty'),
    Country.index);

router.get('/:id', JwtVerify, RolePermission('Country', 'view'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Country.single);

router.put('/:id', JwtVerify, RolePermission('Country', 'edit'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Country.update);

router.delete('/:id', JwtVerify, RolePermission('Country', 'delete'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Country.remove);

export default router;
