import express from 'express';
const router = express.Router();
import Analyse from '../Controller/AnalyseController';
import JwtVerify from '../Middlewares/JwtVerify';

router.get('/tasks', JwtVerify, Analyse.assessedTasks);
router.get('/tasks/:id', JwtVerify, Analyse.assessedClasses);
router.post('/students', JwtVerify, Analyse.totalStudents);
router.post('', JwtVerify, Analyse.compareData);

export default router;
