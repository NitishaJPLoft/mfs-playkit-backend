import express from 'express';
const router = express.Router();
import TrainingResult from '../Controller/TrainingResultController';
import JwtVerify from '../Middlewares/JwtVerify';

router.get('', JwtVerify, TrainingResult.index);
router.get('/current-training', JwtVerify, TrainingResult.currentTrainingStatus);
router.post('/save', JwtVerify, TrainingResult.saveUserTraining);
router.get('/user/:testId', JwtVerify, TrainingResult.userTrainingResultDetails);

export default router;
