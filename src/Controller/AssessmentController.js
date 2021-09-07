import {validationResult} from 'express-validator';
import AssessmentModel from '../Models/Assessment';
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
 *  Assessment Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['task', 'practitioner', 'student', 'head', 'arms', 'legs', 'body', 'createdAt', 'updatedAt'];

class AssessmentController {
    /**
     * Create Assessments for students
     */
    create = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const practitioner = req.user._id;
            let {task, students, classId, ip} = req.body;

            let assessArr = [], wrongEntries = [], updatedCount = 0, assessmentData;
            // Check whether students assessed or not
            if (students && students.length) {
                for (const obj of students) {
                    if (obj._id && (!obj.head || !obj.legs || !obj.arms || !obj.body)) {
                        // Set wrong entries in array
                        wrongEntries.push(obj);
                    } else {
                        // Adjust students assessment for creating DB entry
                        obj.task = task;
                        obj.practitioner = practitioner;
                        obj.student = obj._id;
                        obj.class = classId;
                        obj.createdIp = ip;
                        obj.updatedIp = ip;
                        delete obj._id;
                        obj.createdBy = obj.updatedBy = practitioner;
                        assessArr.push(obj);
                    }
                }
                if (assessArr && assessArr.length) {
                    assessmentData = await Common.multipleInsert(AssessmentModel, assessArr);
                }
            } else {
                return buildResult(res, 400, {}, {}, req.t(constants.NO_ASSESSMENT_FOUND));
            }

            const result = {
                message: req.t(constants.CREATED),
                assessmentData,
                updatedCount,
                wrongEntries
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the assessments
     */
    index = async (req, res) => {
        try {
            const {queryLimit, page, search, student} = req.query;
            // Set pagination and limit
            const currentPage = parseCurrentPage(page);
            const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
            let query = {isDeleted: false};
            if (student) {
                query['student'] = student;
            }
            if (search) {
                query['$or'] = [{name: {$regex: search, $options: "i"}},
                    {status: {$regex: search, $options: "i"}}]
            }

            const populateFields = [
                {
                    path: 'task',
                    select: 'name phase movementType',
                    populate: [{path: 'phase', select: 'phaseNumber'}, {path: 'movementType', select: 'name'}]
                },
                {path: 'student', select: 'firstName lastName email'},
                {path: 'practitioner', select: 'firstName lastName email'}
            ];
            if (limit === 'all') {
                // List for all assessments
                const assessments = await Common.list(AssessmentModel, query, params, populateFields);
                return buildResult(res, 200, assessments);
            } else {
                // List for paginated data
                const {result, totalCount} = await paginationResult(
                    query,
                    AssessmentModel,
                    currentPage,
                    limit,
                    params,
                    populateFields
                );

                const paginationData = pagination(totalCount, currentPage, limit);
                return buildResult(res, 200, result, paginationData);
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Find single assessment detail
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

            const populateFields = [
                {path: 'task', select: 'name'},
                {
                    path: 'student', select: 'firstName lastName email',
                    populate: {
                        path: 'class', select: 'name school practitioner',
                        populate: [
                            {path: 'school', select: 'name'}
                        ]
                    }
                },
                {path: 'practitioner', select: 'firstName lastName email'}
            ];

            // Find assessment details
            const assessmentData = await Common.findById(AssessmentModel, id, params, populateFields);
            return buildResult(res, 200, assessmentData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update assessment
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
            const {ip} = req.body;
            req.body.updatedIp = ip;
            req.body.updatedBy = req.user._id;
            const assessmentData = await Common.findById(AssessmentModel, id, ['_id']);
            // Check whether this assessment exists
            if (!assessmentData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});

            // Update data
            const result = await Common.update(AssessmentModel, {_id: id}, req.body);
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete Assessment
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
            const {ip} = req.body;
            req.body.updatedIp = ip;
            req.body.updatedBy = req.user._id;
            const assessmentData = await Common.findById(AssessmentModel, id, ['_id']);
            // Check whether this assessment exists
            if (!assessmentData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});

            // Soft delete assessment
            await Common.update(AssessmentModel, {_id: id}, {isDeleted: true});
            const result = {
                message: req.t(constants.DELETED)
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };
}

export default new AssessmentController();
