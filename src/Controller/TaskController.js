import {validationResult} from 'express-validator';
import fs from 'fs';
import _ from 'lodash';
import TaskModel from '../Models/Task';
import TrainingTaskModel from '../Models/TrainingTask';
import AssessmentModel from '../Models/Assessment';
import StudentModel from '../Models/Student';
import LanguageModel from '../Models/Language';
import {
    pagination,
    parseCurrentPage,
    parseLimit,
} from '../Helper/Pagination';
import {buildResult} from '../Helper/RequestHelper';
import {paginationResult} from '../Helper/Mongo';
import constants from '../../resources/constants';
import Common from '../DbController/CommonDbController';
import UserTrainingModel from "../Models/UserTraining";

/**
 *  Task Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['name', 'language', 'phase', 'taskNumber', 'movementType', 'assessIt', 'stages', 'playItThumb',
    'playItIOD', 'isPlayItIOD', 'assessItThumb', 'assessItIOD', 'isAssessItIOD', 'assessItVideo', 'isAssessItVideo',
    'activityCard', 'isActivityCard', 'nextUrl', 'slug', 'typeOfPlayItIOD', 'typeOfAssessItIOD', 'isActive'];

class TaskController {

    /**
     * Create Task
     */
    create = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            let {name, taskNumber, phase, language, stages, nextUrl, assessIt, isActivityCard, isPlayItIOD, isAssessItIOD, isAssessItVideo, ip} = req.body;
            // Path for uploading files
            const splitUrl = req.baseUrl.split('/');
            const folderName = splitUrl[splitUrl.length - 1];
            const dir = 'uploads/' + folderName;

            // Parse stringified data
            req.body.stages = stages && JSON.parse(stages);
            req.body.nextUrl = nextUrl && JSON.parse(nextUrl);
            req.body.assessIt = assessIt && JSON.parse(assessIt);
            // Set boolean parameters
            req.body.isActivityCard = isActivityCard === 'true';
            req.body.isPlayItIOD = isPlayItIOD === 'true';
            req.body.isAssessItIOD = isAssessItIOD === 'true';
            req.body.isAssessItVideo = isAssessItVideo === 'true';

            // Set path for all the uploaded files
            if (req.files && Object.keys(req.files).length) {
                const fileKeys = Object.keys(req.files);
                fileKeys.forEach(function(key) {
                    if (req.files[key] && req.files[key].length) {
                        req.body[key] = process.env.IMAGE_URL + folderName + '/' + req.files[key][0].filename;
                    }
                });
            }

            req.body.createdIp = ip;
            req.body.updatedIp = ip;
            req.body.createdBy = req.user._id;
            req.body.updatedBy = req.user._id;

            // Check if task with the same taskNumber and phase exist or not
            const isTaskExists = await Common.findSingle(TaskModel, {taskNumber, phase});
            if (isTaskExists) {
                // Delete files if task already exists
                if (req.files) {
                    const fileKeys = Object.keys(req.files);
                    fileKeys.forEach(function(key) {
                        if (req.files[key] && req.files[key].length) {
                            fs.unlink(dir + '/' + req.files[key][0].filename, (err => {
                                if (err) console.log(err);
                            }));
                        }
                    });
                }
                // Returns error if task exists
                return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            }
            // check nextUrl data, delete null entries
            if (req.body.nextUrl && req.body.nextUrl.length) {
                for (const i in req.body.nextUrl) {
                    if (req.body.nextUrl.hasOwnProperty(i)) {
                        if (req.body.nextUrl[i].url && req.body.nextUrl[i]._id === '') {
                            delete req.body.nextUrl[i]._id;
                        } else if (!req.body.nextUrl[i].url) {
                            delete req.body.nextUrl[i];
                        }
                    }
                }
            } else {
                req.body.nextUrl = [];
            }
            // Find language
            const languageData = await Common.findById(LanguageModel, language, ['name', 'slug']);
            // create slug with task name and language slug
            if (languageData && languageData._id) {
                req.body.slug = `${name.toLowerCase()}_${languageData.slug}`
            }

            // create task
            const taskData = await Common.create(TaskModel, req.body);

            // Send response
            const result = {
                message: req.t(constants.CREATED),
                taskData,
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the tasks
     */
    index = async (req, res) => {
        try {
            const {queryLimit, page} = req.query;
            // Set data for pagination
            const currentPage = parseCurrentPage(page);
            const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
            let query = {isDeleted: false};
            const populateFields = [
                {path: 'language', select: 'name slug'},
                {path: 'phase', select: 'name color phaseNumber'},
                {path: 'taskNumber', select: 'name number'},
                {path: 'nextUrl', select: 'name slug'},
                {path: 'movementType', select: 'name color'}
            ];
            if (limit === 'all') {
                // Get list of all the tasks
                const tasks = await Common.list(TaskModel, query, params, populateFields);
                if (tasks && tasks.length) {
                    for (const i in tasks) {
                        if (tasks.hasOwnProperty(i)) {
                            tasks[i] = tasks[i].toObject();
                            tasks[i].displayName = `${tasks[i].name} - ${tasks[i].phase.name} - ${tasks[i].movementType.name}`;
                        }
                    }
                }
                // Send response
                return buildResult(res, 200, tasks);
            } else {
                // Get paginated list
                let {result, totalCount} = await paginationResult(
                    query,
                    TaskModel,
                    currentPage,
                    limit,
                    params,
                    populateFields
                );

                // Get pagination for data
                const paginationData = pagination(totalCount, currentPage, limit);

                // Sorting array by phase number and then task number
                result.sort((a, b) => {
                    a = a.toObject();
                    b = b.toObject();
                    return a.phase.phaseNumber - b.phase.phaseNumber || a.taskNumber.number - b.taskNumber.number;
                });
                if (result && result.length) {
                    for (const i in result) {
                        if (result.hasOwnProperty(i)) {
                            result[i] = result[i].toObject();
                            result[i].displayName = `${result[i].name} - ${result[i].phase.name} - ${result[i].movementType.name}`;
                        }
                    }
                }
                // Send response
                return buildResult(res, 200, result, paginationData);
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Detail of Task with its assessment count and training count
     */
    single = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {id} = req.params;
            const {classId} = req.query;
            let taskData = {_id: id};
            if (classId) {
                const populateAssess = [
                    {path: 'student', select: 'firstName lastName'}
                ];

                // Assessments for this task and class
                taskData.assessments = await Common.list(AssessmentModel, {
                    task: id,
                    practitioner: req.user._id,
                    class: classId
                }, ['class', 'student', 'head', 'arms', 'legs', 'body'], populateAssess);

                // Total students of the given class
                taskData.students = await Common.list(StudentModel, {class: classId, isDeleted: false}, ['firstName', 'lastName', 'email']);
            } else {
                const populateFields = [
                    {path: 'language', select: 'name slug'},
                    {path: 'phase', select: 'name color'},
                    {path: 'taskNumber', select: 'name'},
                    {path: 'nextUrl.url', select: 'name'},
                    {path: 'movementType', select: 'name color'}
                ];
                // Find task data for given id
                taskData = await Common.findById(TaskModel, id, params, populateFields);
                taskData = taskData.toObject();
                // Find assessment count for the given task
                const assessmentCount = await Common.count(AssessmentModel, {task: id});
                // Find training tasks for given task
                const trainingTasks = await Common.list(TrainingTaskModel, {task: id}, ['_id']);
                const trainingIds = [];
                let userTrainingCount;
                if (trainingTasks && trainingTasks.length) {
                    if (trainingTasks && trainingTasks.length) {
                        for (let obj of trainingTasks) {
                            obj = obj.toObject();
                            trainingIds.push(obj._id);
                        }
                    }
                    // Find training performed on all training tasks of given task
                    userTrainingCount = await Common.count(UserTrainingModel, {trainingTask: {$in: trainingIds}})
                }
                // Check the task status for getting either can delete or deactivate the task
                if (assessmentCount || userTrainingCount) {
                    taskData.status = taskData.isActive ? 'Deactivate' : 'Activate';
                } else {
                    taskData.status = 'Delete';
                }
            }
            // Send response
            return buildResult(res, 200, taskData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update task data
     */
    update = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {id} = req.params;
            const {ip, stages, nextUrl, assessIt, isActivityCard, isPlayItIOD, isAssessItIOD, isAssessItVideo} = req.body;
            // Parse stringified data
            req.body.stages = JSON.parse(stages);
            req.body.nextUrl = JSON.parse(nextUrl);
            req.body.assessIt = JSON.parse(assessIt);
            // Set boolean parameters
            req.body.isActivityCard = isActivityCard === 'true';
            req.body.isPlayItIOD = isPlayItIOD === 'true';
            req.body.isAssessItIOD = isAssessItIOD === 'true';
            req.body.isAssessItVideo = isAssessItVideo === 'true';
            req.body.updatedIp = ip;
            req.body.updatedBy = req.user._id;
            // Set path for uploaded files
            const splitUrl = req.baseUrl.split('/');
            const folderName = splitUrl[splitUrl.length - 1];
            const dir = 'uploads/' + folderName;
            // Set path for all the uploaded files
            if (req.files && Object.keys(req.files).length) {
                const fileKeys = Object.keys(req.files);
                fileKeys.forEach(function(key) {
                    if (req.files[key] && req.files[key].length) {
                        req.body[key] = process.env.IMAGE_URL + folderName + '/' + req.files[key][0].filename;
                    }
                });
            }
            // check nextUrl data, delete null entries
            if (req.body.nextUrl && req.body.nextUrl.length) {
                for (const i in req.body.nextUrl) {
                    if (req.body.nextUrl.hasOwnProperty(i)) {
                        if (req.body.nextUrl[i].url && req.body.nextUrl[i]._id === '') {
                            delete req.body.nextUrl[i]._id;
                        } else if (!req.body.nextUrl[i].url) {
                            delete req.body.nextUrl[i];
                        }
                    }
                }
            }
            // Check if task exists
            const taskData = await Common.findById(TaskModel, id, ['_id']);
            if (!taskData) {
                // Delete files if uploaded and task not exists
                if (req.files) {
                    const fileKeys = Object.keys(req.files);
                    fileKeys.forEach(function(key) {
                        if (req.files[key] && req.files[key].length) {
                            fs.unlink(dir + '/' + req.files[key][0].filename, (err => {
                                if (err) console.log(err);
                            }));
                        }
                    });
                }
                // Returns error if task not exists
                return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            }
            // Update Task
            const result = await Common.update(TaskModel, {_id: id}, req.body);
            // Send response
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete task
     */
    remove = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {id} = req.params;
            const {status} = req.query;
            const {ip} = req.body;
            // Check if task exists
            const taskData = await Common.findById(TaskModel, id, ['_id']);
            // Returns error if id is invalid
            if (!taskData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            if (status === 'Delete') {
                // Delete the task
                await Common.update(TrainingTaskModel, {task: id}, {isDeleted: true, updatedIp: ip, updatedBy: ip});
                await Common.update(TaskModel, {_id: id}, {isDeleted: true, updatedIp: ip, updatedBy: ip});
            } else {
                // Actiate / Deactivate the task
                const isActive = !(status === 'Deactivate');
                await Common.update(TaskModel, {_id: id}, {isActive, updatedIp: ip, updatedBy: ip});
            }
            // Send response
            const result = {
                message: req.t(status === 'Delete' ? constants.DELETED : status === 'Deactivate' ? constants.DEACTIVATED : constants.ACTIVATED)
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the tasks to create training task
     */
    listForTraining = async (req, res) => {
        try {
            // Errors of the express validators from route
            const err = validationResult(req);
            if (!err.isEmpty()) {
                const errors = err.array();
                return res.status(400).json(errors);
            }
            const {movementType} = req.query;
            /*const trainingTasks = await Common.list(TrainingTaskModel, {isDeleted: false}, ['task']);
            const taskIds = [];
            if (trainingTasks && trainingTasks.length) {
                for (let obj of trainingTasks) {
                    obj = obj.toObject();
                    taskIds.push(obj.task);
                }
            }
            const query = {_id: {$nin: taskIds}}; */
            const query = {};
            if (movementType) {
                query.movementType = movementType;
            }
            const populateFields = [
                {path: 'phase', select: 'name color'},
                {path: 'movementType', select: 'name color'}
            ];
            // Find task list
            const tasks = await Common.list(TaskModel, query, ['name', 'phase', 'movementType'], populateFields);
            if (tasks && tasks.length) {
                for (const i in tasks) {
                    if (tasks.hasOwnProperty(i)) {
                        tasks[i] = tasks[i].toObject();
                        tasks[i].displayName = `${tasks[i].name} - ${tasks[i].phase.name} - ${tasks[i].movementType.name}`;
                    }
                }
            }
            // Send response
            return buildResult(res, 200, tasks);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Check the combination of taskNumber and phase to create task
     */
    phaseTaskExistence = async (req, res) => {
        try {
            // Errors of the express validators from route
            const err = validationResult(req);
            if (!err.isEmpty()) {
                const errors = err.array();
                return res.status(400).json(errors);
            }
            const {phase, taskNumber} = req.body;
            // Check if task exists or not
            const isTaskExists = await Common.findSingle(TaskModel, {taskNumber, phase}, ['_id']);
            // Returns error if task is already exists
            if (isTaskExists) {
                return buildResult(res, 400, {}, {}, {message: req.t(constants.TASK_ALREADY_EXISTS)});
            }
            // Send response
            return buildResult(res, 200, {message: req.t(constants.SUCCESS)});
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    }

}

export default new TaskController();
