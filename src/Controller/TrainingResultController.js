import {validationResult} from 'express-validator';
import generator from 'generate-password';
import UserModel from '../Models/User';
import TResultModel from '../Models/TrainingResult';
import UTrainingModel from '../Models/UserTraining';
import TTQuestionModel from '../Models/TrainingTaskQuestion';
import TTQuesResultModel from '../Models/TrainingTaskQuestionResult';
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
 *  Training Result Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['date', 'user', 'attempt', 'rating', 'status', 'nextTrainingDate', 'marks', 'updatedAt', 'testId'];

class TrainingResultController {

    /**
     * Method to save training test given by user
     */
    saveUserTraining = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {_id} = req.user;
            const {trainingId, questions, ip} = req.body;
            // Find entry in training result DB for the trainingId
            let tResult = await Common.findSingle(TResultModel, {trainings: {$in: [trainingId]}}, ['status', 'trainings', 'attempt']);
            tResult = tResult.toObject();
            const answeredQues = [];
            for (const obj of questions) {
                // Create entry for answered questions of the training
                const quesDetail = await Common.findById(TTQuestionModel, obj._id, ['answer']);
                obj.trainingResult = tResult._id;
                obj.trainingTaskQuestion = obj._id;
                obj.correctAnswer = quesDetail.answer;
                obj.answer = obj.answer || 0;
                obj.createdBy = obj.updatedBy = _id;
                obj.createdIp = obj.updatedIp = ip;
                delete obj._id;
                answeredQues.push(obj);
            }
            // Insert all the entries of questions with answers given by practitioner
            const ansQuestions = await Common.multipleInsert(TTQuesResultModel, answeredQues);
            let marks = 0;
            // check marks of practitioner according to given answer
            for (const obj of ansQuestions) {
                marks = obj.answer === obj.correctAnswer ? marks + 1 : marks;
            }
            marks = marks * 100 / ansQuestions.length; // Marks in percentage
            // Update practitioner's training details according to the answers
            await Common.update(UTrainingModel, {_id: trainingId}, {
                status: 'Completed',
                marks,
                date: new Date().getTime(),
                updatedIp: ip,
                updatedBy: _id
            });
            // Get details of all 3 trainings of the user
            const tTasks = await Common.list(UTrainingModel, {_id: {$in: tResult.trainings}}, ['status', 'marks']);
            // set status of user's training
            let status = tTasks.findIndex(x => x.status !== 'Completed') === -1 ? 'Completed' : 'In Progress';
            let totalMarks = 0;
            // Generate total marks if training completed
            if (status === 'Completed') {
                for (const obj of tTasks) {
                    totalMarks = totalMarks + obj.marks;
                }
            }
            // Set rating according to marks
            const rating = totalMarks / tTasks.length >= 80 ? 'Reliable' : 'Unreliable';
            // Set next training date
            const nextDate = new Date(new Date().setMonth(new Date().getMonth() + 6));
            const nextTrainingDate = tResult.attempt === 1 && rating === 'Unreliable' ? new Date().getTime() : nextDate.getTime();
            // Update training detail of user
            await Common.update(TResultModel, {_id: tResult._id}, {
                status,
                marks: totalMarks / tTasks.length,
                rating,
                nextTrainingDate,
                updatedIp: ip,
                updatedBy: _id
            });
            // Find the result of user's current training
            let result = await Common.findById(TResultModel, tResult._id, ['date', 'status', 'marks', 'nextTrainingDate', 'attempt', 'rating']);
            result = result.toObject();
            // Change nextTrainingDate format
            result.nextTrainingDate = result.nextTrainingDate && await CommonService.convertTimeToDate(result.nextTrainingDate);
            // Send response
            return buildResult(res, 200, result);

        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the training results of selected user
     */
    index = async (req, res) => {
        try {
            const {queryLimit, page, search} = req.query;
            const {_id, role} = req.user;
            const currentPage = parseCurrentPage(page);
            const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
            const userQ = {};

            // Condition to find user training detail according to loged in uesr's role
            if (role.name === 'practitioner') {
                userQ.user = _id;
            } else if (role.name !== 'superadmin' && role.name !== 'globaladmin') {
                const userIds = [_id];
                const ids = await CommonService.findUsers(UserModel, {$or: [{createdBy: {$in: userIds}}, {updatedBy: {$in: userIds}}]}, ['_id', 'role'], {
                    path: 'role',
                    select: 'name'
                }, role.name);
                const allIds = [...userIds, ...ids];
                userQ['$or'] = [{createdBy: {$in: allIds}}, {updatedBy: {$in: allIds}}];
            }

            let query = {$and: [userQ, {$or: [{rating: 'Reliable'}, {$and: [{rating: 'Unreliable'}, {attempt: 2}]}, {status: 'In Progress'}]}]};
            if (search) {
                query = {
                    $or: [{date: {$regex: search, $options: "i"}},
                        {status: {$regex: search, $options: "i"}},
                        {marks: {$regex: search, $options: "i"}}]
                }
            }

            const populateFields = [
                {path: 'user', select: 'firstName lastName email'}
            ];
            if (limit === 'all') {
                // Find list of all results according to condition
                let tResults = await Common.list(TResultModel, query, params, populateFields);
                if (tResults && tResults.length) {
                    const arr = [];
                    for (let obj of tResults) {
                        obj = obj.toObject();
                        obj.nextTrainingDate = obj.nextTrainingDate && await CommonService.convertTimeToDate(obj.nextTrainingDate);
                        arr.push(obj);
                    }
                    tResults = arr;
                }
                // Send response
                return buildResult(res, 200, tResults);
            } else {
                // Get paginated list of training results
                let {result, totalCount} = await paginationResult(
                    query,
                    TResultModel,
                    currentPage,
                    limit,
                    params,
                    populateFields
                );

                if (result && result.length) {
                    const arr = [];
                    for (let obj of result) {
                        obj = obj.toObject();
                        obj.nextTrainingDate = obj.nextTrainingDate && await CommonService.convertTimeToDate(obj.nextTrainingDate);
                        arr.push(obj);
                    }
                    result = arr;
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
     * Method to show current training status
     */
    currentTrainingStatus = async (req, res) => {
        try {
            const query = {user: req.user._id};
            const tParams = ['date', 'attempt', 'rating', 'status', 'nextTrainingDate', 'marks'];
            // Find current training status
            let training = await TResultModel.findOne(query, tParams).sort({updatedAt: -1});
            if (training && training._id) {
                training = training.toObject();
                // Change format of next training date
                training.nextTrainingDate = training.nextTrainingDate && await CommonService.convertTimeToDate(training.nextTrainingDate);
            }
            // Send response
            return buildResult(res, 200, training);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Method to get details of training results of selected user
     */
    userTrainingResultDetails = async (req, res) => {
        try {
            const {testId} = req.params;
            const params = ['trainings', 'attempt', 'nextTrainingDate', 'marks', 'rating', 'user', 'updatedAt'];
            const populateFields = [{
                path: 'trainings',
                select: 'trainingTask marks date',
                populate: {path: 'trainingTask', select: 'task name', populate: {path: 'task', select: 'name'}}
            }, {
                path: 'user', select: 'firstName lastName'
            }];
            // Get the result of user according to user's testId
            const result = await Common.list(TResultModel, {testId}, params, populateFields);
            if (result && result.length) {
                for (const i in result) {
                    if (result.hasOwnProperty(i)) {
                        result[i] = result[i].toObject();
                        // Change format of next training date
                        result[i].nextTrainingDate = result[i].nextTrainingDate && await CommonService.convertTimeToDate(result[i].nextTrainingDate);
                        for (const j in result[i].trainings) {
                            if (result[i].trainings.hasOwnProperty(j)) {
                                // Find all the questions of training task
                                const questions = await Common.list(TTQuestionModel, {trainingTask: result[i].trainings[j].trainingTask._id, isDeleted: false}, ['_id']);
                                const quesIds = [];
                                for (let obj of questions) {
                                    obj = obj.toObject();
                                    quesIds.push(obj._id);
                                }
                                // Find attempted questions from the training task result model
                                const attemptQues = await Common.list(TTQuesResultModel, {trainingTaskQuestion: {$in: quesIds}, trainingResult: result[i]._id}, ['answer', 'correctAnswer']);
                                let answerCount = 0;
                                for (let obj of attemptQues) {
                                    obj = obj.toObject();
                                    if (obj.answer === obj.correctAnswer) {
                                        answerCount++;
                                    }
                                }
                                result[i].trainings[j].quesCount = questions.length; // Total questions of training
                                result[i].trainings[j].correctAnsCount = answerCount; // Total answers count
                                // Change format of training date
                                result[i].trainings[j].date = result[i].trainings[j].date && await CommonService.convertTimeToDate(result[i].trainings[j].date);
                            }
                        }
                    }
                }
            }
            // Send response
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    }
}

export default new TrainingResultController();
