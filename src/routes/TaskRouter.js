import express from 'express';
const router = express.Router();
import {ObjectId} from 'mongodb';
import {body, param} from 'express-validator';
import Task from '../Controller/TaskController';
import JwtVerify from '../Middlewares/JwtVerify';
import upload from '../Middlewares/FileUploader';
import RolePermission from '../Middlewares/RolePermission';

router.post('', JwtVerify, RolePermission('Task', 'create'),
    upload.fields([{
        name: 'playItThumb', maxCount: 1
    }, {
        name: 'assessItThumb', maxCount: 1
    }, {
        name: 'assessItVideo', maxCount: 1
    }, {
        name: 'activityCard', maxCount: 1
    }, {
        name: 'playItIOD', maxCount: 1
    }, {
        name: 'assessItIOD', maxCount: 1
    }]),
    body('name').exists().withMessage('Task name should not be empty'),
    body('language').exists().withMessage('Language should not be empty').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Task.create);

router.get('', JwtVerify, RolePermission('Task', 'view'), Task.index);

router.get('/list', JwtVerify, RolePermission('Task', 'view'), Task.listForTraining);

router.get('/:id', JwtVerify, RolePermission('Task', 'view'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Task.single);

router.put('/:id',
    upload.fields([{
        name: 'playItThumb', maxCount: 1
    }, {
        name: 'assessItThumb', maxCount: 1
    }, {
        name: 'assessItVideo', maxCount: 1
    }, {
        name: 'activityCard', maxCount: 1
    }, {
        name: 'playItIOD', maxCount: 1
    }, {
        name: 'assessItIOD', maxCount: 1
    }]),
    JwtVerify,
    RolePermission('Task', 'edit'),
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Task.update);

router.delete('/:id', JwtVerify,
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Task.remove);

router.post('/exists', JwtVerify,
    body('phase').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('taskNumber').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }), Task.phaseTaskExistence);

export default router;
