import express from 'express';
const router = express.Router();
import TrainingTask from '../Controller/TrainingTaskController';
import JwtVerify from '../Middlewares/JwtVerify';
import upload from '../Middlewares/FileUploader';
import RolePermission from '../Middlewares/RolePermission';

router.post('', JwtVerify, RolePermission('Training Task', 'create'), upload.single('video'), TrainingTask.create);
router.get('', JwtVerify, RolePermission('Training Task', 'list'), TrainingTask.index);
router.get('/random', JwtVerify, RolePermission('Page', 'review task'), TrainingTask.tasksForPractitioner);
router.get('/:id', JwtVerify, RolePermission('Training Task', 'view'), TrainingTask.single);
router.put('/:id', JwtVerify, RolePermission('Training Task', 'edit'), upload.single('video'), TrainingTask.update);
router.delete('/:id', JwtVerify, RolePermission('Training Task', 'delete'), TrainingTask.remove);
router.put('/status/:id', JwtVerify, RolePermission('Training Task', 'edit'), TrainingTask.changeStatus);

export default router;
