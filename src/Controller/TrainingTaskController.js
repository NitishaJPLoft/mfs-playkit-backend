import fs from 'fs';
import ip from 'ip';
import generator from 'generate-password';
import TrainingTaskModel from '../Models/TrainingTask';
import TTQuestionModel from '../Models/TrainingTaskQuestion';
import TResultModel from '../Models/TrainingResult';
import UTrainingModel from '../Models/UserTraining';
import TaskModel from '../Models/Task';
import {
    pagination,
    parseCurrentPage,
    parseLimit,
} from '../Helper/Pagination';
import {buildResult} from '../Helper/RequestHelper';
import {paginationResult} from '../Helper/Mongo';
import constants from '../../resources/constants';
import Common from '../DbController/CommonDbController';
import CommonService from "../Service/CommonService";

/**
 *  Training Task Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['name', 'language', 'publishDate', 'task', 'video', 'createdAt', 'status'];

class TrainingTaskController {

    /**
     * Create Training task for the given task
     */
    create = async (req, res) => {
        try {
            let {task, ip, qa} = req.body;
            req.body.createdIp = ip;
            req.body.updatedIp = ip;
            // Convert publish date in milliseconds
            req.body.publishDate = new Date(req.body.publishDate).getTime();
            req.body.createdBy = req.body.updatedBy = req.user._id;
            // Parse stringified question answers list
            qa = qa && JSON.parse(qa);
            // Set path for video file
            const splitUrl = req.baseUrl.split('/');
            const folderName = splitUrl[splitUrl.length - 1];
            if (req.file && req.file.filename) {
                req.body.video = process.env.IMAGE_URL + folderName + '/' + req.file.filename;
            }

            // Set training task status if video file is here
            req.body.status = !!req.body.video;

            // Returns error if question - answers not in training task
            if (!qa || !qa.length) {
                return buildResult(res, 400, {}, {}, {message: req.t(constants.INADEQUATE_DATA)});
            }

            /*const isTrainingExists = await Common.findSingle(TrainingTaskModel, {task}, ['_id']);
            if (isTrainingExists) return buildResult(res, 404, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});*/

            // Find count of training tasks
            const trainingCount = await Common.count(TrainingTaskModel, {});

            // Get name of training task according to count
            req.body.name = `Training-${trainingCount + 1}`;

            // Create training task
            let trainingData = await Common.create(TrainingTaskModel, req.body);
            trainingData = trainingData.toObject();
            const quesArr = [], wrongEntries = [];
            for (const obj of qa) {
                // Wrong entry if question & answer is blank
                if (!obj.question || !obj.answer)
                    wrongEntries.push(obj);
                else {
                    // create valid entry for question answers
                    obj.createdIp = ip;
                    obj.updatedIp = ip;
                    obj.createdBy = req.user._id;
                    obj.updatedBy = req.user._id;
                    obj.trainingTask = trainingData._id;
                    delete obj._id;
                    quesArr.push(obj);
                }
            }
            // Multiple insert of question answers
            trainingData.questions = await Common.multipleInsert(TTQuestionModel, quesArr);

            // Send response
            const result = {
                message: req.t(constants.CREATED),
                trainingData,
                wrongEntries
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the training tasks
     */
    index = async (req, res) => {
        try {
            const {queryLimit, page, search} = req.query;
            const currentPage = parseCurrentPage(page);
            const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
            let query = {isDeleted: false};
            if (search) {
                query['$or'] = [{title: {$regex: search, $options: "i"}},
                    {slug: {$regex: search, $options: "i"}}]
            }
            const populateFields = [
                {path: 'language', select: 'name slug'},
                {path: 'task', select: 'name slug'}
            ];
            if (limit === 'all') {
                // Find all the training tasks
                const trainingTasks = await Common.list(TrainingTaskModel, query, params, populateFields);
                if (trainingTasks && trainingTasks.length) {
                    for (const i in trainingTasks) {
                        if (trainingTasks.hasOwnProperty(i)) {
                            trainingTasks[i] = trainingTasks[i].toObject();
                            // Convert publish date format
                            trainingTasks[i].publishDate = await CommonService.convertTimeToDate(trainingTasks[i].publishDate);
                            // Find total questions of training task
                            trainingTasks[i].quesCount = await Common.count(TTQuestionModel, {
                                trainingTask: trainingTasks[i]._id,
                                isDeleted: false
                            });
                        }
                    }
                }
                // Send response
                return buildResult(res, 200, trainingTasks);
            } else {
                // Find pagination list
                const {result, totalCount} = await paginationResult(
                    query,
                    TrainingTaskModel,
                    currentPage,
                    limit,
                    params,
                    populateFields
                );

                if (result && result.length) {
                    for (const i in result) {
                        if (result.hasOwnProperty(i)) {
                            result[i] = result[i].toObject();
                            // Convert publish date format
                            result[i].publishDate = await CommonService.convertTimeToDate(result[i].publishDate);
                            // Find total questions of training task
                            result[i].quesCount = await Common.count(TTQuestionModel, {
                                trainingTask: result[i]._id,
                                isDeleted: false
                            });
                        }
                    }
                }
                // Get data for pagination
                const paginationData = pagination(totalCount, currentPage, limit);
                // Send response
                return buildResult(res, 200, result, paginationData);
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Find the details of single training task
     */
    single = async (req, res) => {
        try {
            const {id} = req.params;
            const populateFields = [
                {path: 'language', select: 'name slug'},
                {
                    path: 'task',
                    select: 'name slug',
                    populate: [{path: "phase", select: 'name'}, {path: 'movementType', select: 'name'}]
                }
            ];
            // Find training task
            let trainingData = await Common.findById(TrainingTaskModel, id, params, populateFields);
            if (trainingData && trainingData._id) {
                trainingData = trainingData.toObject();
                if (trainingData.task) {
                    // Set display name of training task
                    trainingData.task.displayName = `${trainingData.task.name} - ${trainingData.task.phase.name} - ${trainingData.task.movementType.name}`;
                }
                // Change format of publish date
                trainingData.publishDate = await CommonService.convertTimeToDate(trainingData.publishDate);
                // Find question list of training
                trainingData.quesList = await Common.list(TTQuestionModel, {trainingTask: id, isDeleted: false});
            }
            // Send response
            return buildResult(res, 200, trainingData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update training task
     */
    update = async (req, res) => {
        try {
            const {id} = req.params;
            let {ip, deleted, qa} = req.body;
            // Parse stringified question answers list
            qa = qa && JSON.parse(qa);
            deleted = deleted && JSON.parse(deleted);
            req.body.updatedIp = ip;
            req.body.updatedBy = req.user._id;
            // Convert publish date in milliseconds
            req.body.publishDate = new Date(req.body.publishDate).getTime();
            // Set path for video file
            const splitUrl = req.baseUrl.split('/');
            const folderName = splitUrl[splitUrl.length - 1];
            const dir = 'uploads/' + folderName;
            // Check if training task exists or not
            const trainingData = await Common.findById(TrainingTaskModel, id, ['_id']);
            // Returns error if training task not exists
            if (!trainingData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // Check and delete old file if new file is uploaded
            if (req.file && req.file.filename) {
                if (trainingData && trainingData.video) {
                    const splitFile = trainingData.video.split('/');
                    const file = splitFile[splitFile.length - 1];
                    fs.unlink(dir + '/' + file, (err => {
                        if (err) console.log(err);
                    }));
                }
                // Set path for video file
                req.body.video = process.env.IMAGE_URL + folderName + '/' + req.file.filename;
            }

            let updatedQuestions = 0, deletedQuestions = 0, wrongDeletedEntries = 0;
            const addedQuestions = [], wrongEntries = [];

            // List of questions to create and update
            if (qa && qa.length) {
                for (const obj of qa) {
                    if (obj._id) {
                        // Check if question exists
                        const isQuestionExists = await Common.findSingle(TTQuestionModel, {
                            question: obj.question,
                            trainingTask: obj.trainingTask,
                            _id: {$ne: obj._id}
                        }, ['_id']);
                        // if question not exists, add in wrong entries
                        if (isQuestionExists)
                            wrongEntries.push(obj);
                        else {
                            // Update question if exists
                            obj.updatedIp = ip;
                            obj.updatedBy = req.user._id;
                            await Common.update(TTQuestionModel, {_id: obj._id}, obj);
                            updatedQuestions++;
                        }
                    } else {
                        // Add in wrong entry if question or answer is blank
                        if (!obj.question && !obj.answer) {
                            wrongEntries.push(obj);
                        } else {
                            // Check if question exists
                            const isQuestionExists = await Common.findSingle(TTQuestionModel, {
                                question: obj.question,
                                trainingTask: id
                            }, ['_id']);
                            // if question not exists, add in wrong entries
                            if (isQuestionExists)
                                wrongEntries.push(obj);
                            else {
                                // Create valid entry for question - answer
                                obj.createdIp = ip;
                                obj.updatedIp = ip;
                                obj.createdBy = req.user._id;
                                obj.updatedBy = req.user._id;
                                obj.trainingTask = id;
                                delete obj._id;
                                addedQuestions.push(obj);
                            }
                        }
                    }
                }
            }

            // Multiple insertions of questions and answers
            if (addedQuestions && addedQuestions.length) {
                await Common.multipleInsert(TTQuestionModel, addedQuestions);
            }
            // Check deleted entry
            if (deleted && deleted.length) {
                for (const i in deleted) {
                    if (deleted.hasOwnProperty(i)) {
                        // Check if question exists
                        const isQuestionExists = await Common.findById(TTQuestionModel, deleted[i], ['_id']);
                        // Push into errored array if question id not exists
                        if (!isQuestionExists)
                            wrongDeletedEntries.push(deleted[i]);
                        // Soft delete question
                        await Common.update(TTQuestionModel, {_id: deleted[i]}, {
                            isDeleted: true,
                            updatedIp: ip,
                            updatedBy: req.user._id
                        });
                        deletedQuestions++;
                    }
                }
            }

            // Update training task
            await Common.update(TrainingTaskModel, {_id: id}, req.body);

            // Send response
            const result = {
                message: req.t(constants.UPDATED),
                addedStudents: addedQuestions.length,
                wrongEntries,
                updatedQuestions,
                deletedQuestions,
                wrongDeletedEntries
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete Training task
     */
    remove = async (req, res) => {
        try {
            const {id} = req.params;
            let {ip} = req.body;

            // Check if training task exists
            const trainingData = await Common.findById(TrainingTaskModel, id, ['_id']);
            // Returns error if training task not exists
            if (!trainingData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // Soft delete training task
            await Common.update(TrainingTaskModel, {_id: id}, {
                isDeleted: true,
                updatedIp: ip,
                updatedBy: req.user._id
            });
            // Send response
            const result = {
                message: req.t(constants.DELETED)
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Method to change the status of Training Task
     */
    changeStatus = async (req, res) => {
        try {
            const {id} = req.params;
            const {ip} = req.body;
            // Check if training task exists or not
            const trainingData = await Common.findById(TrainingTaskModel, id, ['_id', 'status', 'video']);
            // Returns error if id is invalid
            if (!trainingData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // Returns error if training video not exists
            if (!trainingData.status && !trainingData.video) {
                return buildResult(res, 400, {}, {}, {message: req.t(constants.UPLOAD_VIDEO)});
            }
            // Update status of training task
            const result = await Common.update(TrainingTaskModel, {_id: id}, {
                status: !trainingData.status,
                updatedIp: ip,
                updatedBy: req.user._id
            });
            // Find training task details
            const trainingTask = await Common.findById(TrainingTaskModel, id, ['_id', 'status']);
            // Send response
            return buildResult(res, 200, {result, trainingTask});
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Method to provide 3 random training tasks to the practitioner for training
     */
    tasksForPractitioner = async (req, res) => {
        try {
            let taskInfo = {};
            const populateField = {
                path: 'trainingTask', select: 'task video',
                populate: {
                    path: 'task',
                    select: 'name assessItVideo assessIt stages movementType phase',
                    populate: [{path: 'movementType', select: 'name color'}, {path: 'phase', select: 'name color'}]
                }
            };
            // Find if training task which is not completed
            let TResult = await Common.findSingle(TResultModel, {
                user: req.user._id,
                status: {$ne: 'Completed'}
            }, ['trainings']);
            if (TResult && TResult._id) {
                TResult = TResult.toObject();
                // Find non completed user trainings
                const trainings = await Common.list(UTrainingModel, {
                    _id: {$in: TResult.trainings},
                    status: {$ne: 'Completed'}
                }, ['trainingTask'], populateField);
                trainings[0] = trainings[0].toObject();
                const trainingTask = trainings[0].trainingTask;
                trainingTask.trainingId = trainings[0]._id;
                // Find questions of training task
                trainingTask.questions = await Common.list(TTQuestionModel, {
                    trainingTask: trainingTask._id,
                    isDeleted: false
                }, ['question']);
                // Find task count accordig to previous training task performed
                const taskCount = trainings.length === 3 ? 1 : trainings.length === 2 ? 2 : 3;
                taskInfo = {task: trainingTask, taskCount};
            } else {
                const {isFinishLater} = req.query;
                let attempt = 1, testId = generator.generate({length: 10, numbers: true});
                // Find list of training result of the user
                const info = await Common.list(TResultModel, {user: req.user._id}, ['attempt', 'marks', 'rating', 'nextTrainingDate', 'status', 'testId'], '', {updatedAt: -1});
                if (info && info.length) {
                    info[0] = info[0].toObject();
                    const data = info[0];
                    if (data.status === 'Completed') {
                        // Check the training attempt
                        if (data.attempt === 1 && data.rating === 'Unreliable') {
                            attempt = 2;
                            testId = data.testId;
                        } else if (data.nextTrainingDate > new Date().getTime()) {
                            // Returns error if training is not allowed
                            return buildResult(res, 400, {}, {}, {message: req.t(constants.NOT_ALLOWED)});
                        }
                    }
                }
                // Find 3 random training tasks
                const tasks = await TrainingTaskModel.aggregate(
                    [{$sample: {size: 3}}, {
                        $project: {
                            task: 1,
                            video: 1
                        }
                    }]
                );
                const data = [];
                for (let obj of tasks) {
                    const params = ['name', 'assessItVideo', 'assessIt', 'stages', 'movementType', 'phase'];
                    const populateField = [{path: 'movementType', select: 'name color'}, {
                        path: 'phase',
                        select: 'name color'
                    }];
                    // Find task of selected training task
                    obj.task = await Common.findSingle(TaskModel, {_id: obj.task}, params, populateField);
                    data.push({
                        user: req.user._id,
                        trainingTask: obj._id,
                        attempt,
                        createdBy: req.user._id,
                        updatedBy: req.user._id,
                        createdIp: ip.address(),
                        updatedIp: ip.address()
                    })
                }
                // Insert all the 3 selected training task for the practitioner
                const result = await Common.multipleInsert(UTrainingModel, data);
                const resIds = [];
                // Get first training id
                tasks[0].trainingId = result[0]._id;
                // Get all the ids of user trainings
                for (let obj of result) {
                    resIds.push(obj._id);
                }
                // Create Training result entry with 3 user training ids
                const tResult = {
                    user: req.user._id,
                    trainings: resIds,
                    attempt,
                    testId,
                    status: isFinishLater ? 'In Progress' : 'Not Started',
                    createdBy: req.user._id,
                    updatedBy: req.user._id,
                    createdIp: ip.address(),
                    updatedIp: ip.address()
                };
                await Common.create(TResultModel, tResult);
                // Questions for the selected training task
                tasks[0].questions = await Common.list(TTQuestionModel, {
                    trainingTask: tasks[0]._id,
                    isDeleted: false
                }, ['question']);
                taskInfo = {task: tasks[0], taskCount: 1}
            }
            // Send response
            return buildResult(res, 200, taskInfo);
        } catch (err) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, err);
        }
    };
}

export default new TrainingTaskController();
