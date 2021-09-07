import {validationResult} from 'express-validator';
import StudentModel from '../Models/Student';
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
 *  Student Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['firstName', 'lastName', 'gender', 'dob', 'email', 'status', 'class', 'createdAt'];

class StudentController {

    /**
     * Create Student
     */
    create = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            let {email, ip} = req.body;
            req.body.createdIp = ip;
            req.body.updatedIp = ip;
            req.body.createdBy = req.user._id;
            req.body.updatedBy = req.user._id;
            // Check if student exists or not
            const isStudentExists = await Common.findSingle(StudentModel, {email}, ['_id']);
            // Returns error if student exists
            if (isStudentExists) buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            // Create student
            const studentData = await Common.create(StudentModel, req.body);

            // Send response
            const result = {
                message: req.t(constants.CREATED),
                studentData,
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * list of all the students
     */
    index = async (req, res) => {
        try {
            const {queryLimit, page, classId} = req.query;
            // Set pagination and limit
            const currentPage = parseCurrentPage(page);
            const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
            const query = {isDeleted: false};
            if (classId) {
                query.class = classId;
            }
            const populateFields = [
                {path: 'class', select: 'name'}
            ];
            if (limit === 'all') {
                // List for all students
                let students = await Common.list(StudentModel, query, params, populateFields, {lastName: 1});
                if (students && students.length) {
                    const arr = [];
                    for (let obj of students) {
                        obj = obj.toObject();
                        obj.dob = await CommonService.convertTimeToDate(obj.dob);
                        arr.push(obj);
                    }
                    students = arr;
                }
                return buildResult(res, 200, students);
            } else {
                // List of paginated students
                let {result, totalCount} = await paginationResult(
                    query,
                    StudentModel,
                    currentPage,
                    limit,
                    params,
                    populateFields,
                    {lastName: 1}
                );
                if (result && result.length) {
                    const arr = [];
                    for (let obj of result) {
                        obj = obj.toObject();
                        obj.dob = await CommonService.convertTimeToDate(obj.dob);
                        arr.push(obj);
                    }
                    result = arr;
                }
                // Get pagination data
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
     * Detail of single Student
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
                {
                    path: 'class', select: 'name',
                    populate: {
                        path: 'school', select: 'name',
                        populate: [{path: 'country', select: 'name'}, {path: 'region', select: 'name'}]
                    }
                }
            ];
            // Find student data
            let studentData = await Common.findById(StudentModel, id, params, populateFields);
            if (studentData && studentData._id) {
                studentData = studentData.toObject();
                studentData.dob = await CommonService.convertTimeToDate(studentData.dob); // Change DOB format
            }
            // Send response
            return buildResult(res, 200, studentData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update student details
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
            // Check if student exists or not
            const studentData = await Common.findById(StudentModel, id, ['_id']);
            // Returns error if student not exists
            if (!studentData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // Update student data
            const result = await Common.update(StudentModel, {_id: id}, req.body);
            // Send response
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete student
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
            // Check if student exists or not
            const student = await Common.findById(StudentModel, id, ['_id']);
            // Error if student not exists
            if (!student) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});

            // Soft delete assessments of requested student
            await Common.update(AssessmentModel, {student: id}, {
                isDeleted: true,
                updatedIp: ip,
                updatedBy: req.user._id
            });
            // Soft delete students
            await Common.update(StudentModel, {_id: id}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id});
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
}

export default new StudentController();
