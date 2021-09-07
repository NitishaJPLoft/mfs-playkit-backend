import express from 'express';
const router = express.Router();
import Phase from '../Controller/PhaseController';
import JwtVerify from '../Middlewares/JwtVerify';

router.post('', JwtVerify, Phase.create);
router.get('', JwtVerify, Phase.index);
router.get('/:id', JwtVerify, Phase.single);

export default router;
