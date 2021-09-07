import express from 'express';
const router = express.Router();
import Language from '../Controller/LanguageController';
import JwtVerify from '../Middlewares/JwtVerify';

router.post('', JwtVerify, Language.create);
router.get('', JwtVerify, Language.index);

export default router;
