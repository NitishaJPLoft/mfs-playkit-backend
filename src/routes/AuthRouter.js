import express from 'express';
import {body, check} from 'express-validator';
const router = express.Router();
import Auth from '../Controller/AuthController';

router.post('/login',
    body('email').isEmail().withMessage('Email format should be correct'),
    check('password')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 6 chars long'),
    Auth.login);

router.post('/first-login',
    body('token').exists().withMessage('Token should not be blank'),
    check('password')
        .isLength({ min: 4 })
        .withMessage('Password must be at least 6 chars long'), Auth.firstLogin);


export default router;
