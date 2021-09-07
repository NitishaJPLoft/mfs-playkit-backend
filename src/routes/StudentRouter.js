import express from 'express';
const router = express.Router();
import {ObjectId} from 'mongodb';
import {body, param} from 'express-validator';
import Student from '../Controller/StudentController';
import JwtVerify from '../Middlewares/JwtVerify';

router.post('', JwtVerify,
    body('email').exists().withMessage('Email should not be empty')
        .isEmail().withMessage('Email should be in correct format'),
    body('ip').exists().withMessage('IP should not be empty')
        .isIP().withMessage('IP address should be in correct format'),
    Student.create);

router.get('', JwtVerify, Student.index);

router.get('/:id', JwtVerify,
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Student.single);

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
    Student.update);

router.delete('/:id', JwtVerify,
    param('id').customSanitizer(value => {
        try {
            return ObjectId(value);
        } catch (err) {
            return err;
        }
    }),
    Student.remove);

export default router;
