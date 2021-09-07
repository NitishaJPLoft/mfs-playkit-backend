import express from 'express';
const router = express.Router();
import {ObjectId} from 'mongodb';
import {body, param} from 'express-validator';
import Page from '../Controller/PageController';
import JwtVerify from '../Middlewares/JwtVerify';
import upload from '../Middlewares/FileUploader';
import RolePermission from '../Middlewares/RolePermission';

router.post('', JwtVerify, RolePermission('Page', 'create'),
    upload.single('fileUrl'),
    body('title').exists().withMessage('Page title should not be empty'),
    body('language').exists().withMessage('Language should not be empty').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Page.create);

router.get('', JwtVerify,  RolePermission('Page', 'view'), Page.index);

router.get('/:id', param('id').exists().withMessage('Page title should not be empty'),
    Page.single);

router.put('/:id', JwtVerify, RolePermission('Page', 'edit'),
    upload.single('fileUrl'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Page.update);

router.delete('/:id', JwtVerify, RolePermission('Page', 'delete'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Page.remove);

export default router;
