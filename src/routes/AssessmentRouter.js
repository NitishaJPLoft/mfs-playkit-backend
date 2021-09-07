import express from 'express';
const router = express.Router();
import {ObjectId} from 'mongodb';
import {body, param } from 'express-validator';
import Assessment from '../Controller/AssessmentController';
import JwtVerify from '../Middlewares/JwtVerify';

router.post('', JwtVerify,
    body('task').exists().withMessage('Task should not be empty').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('classId').exists().withMessage('Class should not be empty').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should not be empty and should be in correct format'),
    Assessment.create);

router.get('', JwtVerify, Assessment.index);

router.get('/:id', JwtVerify,
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Assessment.single);

router.put('/:id', JwtVerify,
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Assessment.update);

router.delete('/:id', JwtVerify,
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Assessment.remove);

export default router;
