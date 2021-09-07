import {validationResult} from 'express-validator';
import ClassModel from '../Models/Class';
import SchoolModel from '../Models/School';
import StudentModel from '../Models/Student';
import UserModel from '../Models/User';
import AssessmentModel from '../Models/Assessment';
import {
    pagination,
    parseCurrentPage,
    parseLimit,
} from '../Helper/Pagination';
import {buildResult} from '../Helper/RequestHelper';
import {EmailValidator} from "../Helper/EmailValidator";
import {paginationResult} from '../Helper/Mongo';
import constants from '../../resources/constants';
import Common from '../DbController/CommonDbController';
import CommonService from '../Service/CommonService';

/**
 *  Class Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['name', 'status', 'school', 'practitioner', 'createdAt'];

class ClassController {

    /**
     * Create class with list of students
     */
    create = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {_id, role} = req.user;

            // Check whether requested data is proper or not
            if (req.body.practitioner) {
                const userData = await Common.findById(UserModel, req.body.practitioner, ['role', 'school']);
                if (userData && userData._id) {
                    req.body.school = userData.school[0];
                }
            } else if (role.name === 'practitioner') {
                req.body.practitioner = _id;
                const userData = await Common.findById(UserModel, _id, ['school']);
                if (userData && userData._id) {
                    req.body.school = userData.school[0];
                }
            } else {
                return buildResult(res, 400, {}, {}, {message: req.t(constants.INADEQUATE_DATA)});
            }
            let {name, school, practitioner, students, csv, ip} = req.body;

            req.body.createdIp = ip;
            req.body.updatedIp = ip;
            req.body.createdBy = req.body.updatedBy = req.user._id;

            // Check whether Class exists or not
            const isClassExists = await Common.findSingle(ClassModel, {name, school, practitioner, isDeleted: false}, ['_id']);
            // Returns error if class exists
            if (isClassExists) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});

            // Create class
            let classData = await Common.create(ClassModel, req.body);
            classData = classData.toObject();
            const studentList = [], wrongEntries = [], wrongCsvs = [];
            if (students && students.length) {
                for (const [index, obj] of students.entries()) {
                    // Check if requested data is proper
                    if (!obj.email || !obj.firstName || !obj.lastName) {
                        obj.index = index;
                        obj.message = req.t(constants.INADEQUATE_DATA);
                        wrongEntries.push(obj);
                    } else {
                        const isEmail = EmailValidator(obj.email); // Check whether Email is valid or not
                        if (!isEmail) {
                            obj.message = req.t(constants.WRONG_EMAIL);
                            obj.index = index;
                            wrongEntries.push(obj);
                        } else {
                            // Create valid entry for student
                            obj.class = classData._id;
                            obj.dob = new Date(obj.dob).getTime();
                            obj.createdIp = obj.updatedIp = ip;
                            obj.createdBy = obj.updatedBy = req.user._id;
                            delete obj._id;
                            studentList.push(obj);
                        }
                    }
                }
            }

            if (csv && csv.length) {
                for (const [index, obj] of csv.entries()) {
                    // Check if requested csv data is proper
                    if (!obj.email || !obj.firstName || !obj.lastName) {
                        obj.index = index;
                        obj.message = req.t(constants.INADEQUATE_DATA);
                        wrongCsvs.push(obj);
                    } else {
                        const isEmail = EmailValidator(obj.email); // Check whether Email is valid or not
                        if (!isEmail) {
                            obj.message = req.t(constants.WRONG_EMAIL);
                            obj.index = index;
                            wrongCsvs.push(obj);
                        } else {
                            // Create valid entry for student
                            obj.class = classData._id;
                            obj.dob = new Date(obj.dob).getTime();
                            obj.createdIp = obj.updatedIp = ip;
                            obj.createdBy = obj.updatedBy = req.user._id;
                            studentList.push(obj);
                        }
                    }
                }
            }
            if (studentList && studentList.length) {
                // Create all the valid entries of students
                classData.students = await Common.multipleInsert(StudentModel, studentList);
            }

            // Send Response
            const result = {
                message: req.t(constants.CREATED),
                classData,
                wrongEntries,
                wrongCsvs
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Find list of all the classes
     */
    index = async (req, res) => {
        try {
            const {queryLimit, page, search, school} = req.query;
            const {_id, role} = req.user;
            // Set pagination and limit
            const currentPage = parseCurrentPage(page);
            const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
            const userInfo = await Common.findById(UserModel, _id, ['country', 'region', 'school']);
            let query = {isDeleted: false};

            if (school) {
                // Query for finding list of selected school
                if (role.name === 'practitioner') {
                    query['$and'] = [{school}, {practitioner: _id}];
                } else {
                    query.school = school;
                }
            } else {
                // Query for finding list for all classes related to the logged in user
                if (role.name !== 'superadmin' && role.name !== 'globaladmin') {
                    const schIds = [];
                    const schQuery = role.name === 'admin' ? {country: {$in: userInfo.country}} :
                        role.name === 'manager' ? {region: {$in: userInfo.region}} :
                            {_id: {$in: userInfo.school}};
                    const schools = await Common.list(SchoolModel, schQuery, ['_id']);
                    for (let obj of schools) {
                        obj = obj.toObject();
                        schIds.push(obj._id);
                    }
                    if (role.name === 'practitioner') {
                        query['$and'] = [{school: {$in: schIds}}, {practitioner: _id}];
                    } else {
                        query.school = {$in: schIds};
                    }
                }
            }

            if (search) {
                query['$and'] = [{
                    $or: [{name: {$regex: search, $options: "i"}},
                        {status: {$regex: search, $options: "i"}}
                    ]
                }]
            }

            const populateFields = [
                {
                    path: 'school',
                    select: 'name',
                    populate: [{path: 'country', select: 'name'}, {path: 'region', select: 'name'}]
                },
                {path: 'practitioner', select: 'firstName lastName email'}
            ];
            if (limit === 'all') {
                // List for all Classes
                const classes = await Common.list(ClassModel, query, params, populateFields);
                return buildResult(res, 200, classes);
            } else {
                // List for paginated data
                const {result, totalCount} = await paginationResult(
                    query,
                    ClassModel,
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
     * Find single class detail
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
                    path: 'school',
                    select: 'name',
                    populate: [{path: 'country', select: 'name'}, {path: 'region', select: 'name'}]
                },
                {path: 'practitioner', select: 'firstName lastName email'}
            ];
            // Find class data
            let classData = await Common.findById(ClassModel, id, params, populateFields);
            if (classData && classData._id) {
                classData = classData.toObject();
                const sParams = ['firstName', 'lastName', 'gender', 'dob', 'email'];
                // Find students of requested class
                classData.students = await Common.list(StudentModel, {class: id, isDeleted: false}, sParams, '', {lastName: 1});
                for (const i in classData.students) {
                    if (classData.students.hasOwnProperty(i)) {
                        classData.students[i] = classData.students[i].toObject();
                        classData.students[i].dob = await CommonService.convertTimeToDate(classData.students[i].dob);
                    }
                }
            }
            return buildResult(res, 200, classData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update Class
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
            const {ip, students, deleted, csv} = req.body;
            req.body.updatedIp = ip;
            req.body.updatedBy = req.user._id;

            let updatedStudents = 0, deletedStudents = 0, wrongDeletedEntries = 0;
            const addedStudents = [], wrongEntries = [];

            // Check whether class exists or not
            const classData = await Common.findById(ClassModel, id, ['_id']);
            if (!classData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});

            // If students list exists
            if (students && students.length) {
                for (const [index, obj] of students.entries()) {
                    if (obj._id) {
                        // Update if edit is true
                        if (obj.edit) {
                            // Check whether student exists or not
                            const isStudentExists = await Common.findById(StudentModel, obj._id, ['_id']);
                            if (!isStudentExists) {
                                obj.message = req.t(constants.INVALID_ID);
                                obj.index = index;
                                wrongEntries.push(obj);
                            } else {
                                // Update entry if student exists
                                updatedStudents++; // count for updated students
                                obj.updatedIp = ip;
                                obj.updatedBy = req.user._id;
                                obj.dob = new Date(obj.dob).getTime();
                                await Common.update(StudentModel, {_id: obj._id}, obj);
                            }
                        }
                    } else {
                        // Add new entries for students
                        if (!obj.email) {
                            obj.message = req.t(constants.INADEQUATE_DATA);
                            obj.index = index;
                            wrongEntries.push(obj);
                        } else {
                            const isEmail = EmailValidator(obj.email); // Check if email is valid
                            if (!isEmail) {
                                obj.message = req.t(constants.WRONG_EMAIL);
                                obj.index = index;
                                wrongEntries.push(obj);
                            } else {
                                obj.createdIp = obj.updatedIp = ip;
                                obj.createdBy = obj.updatedBy = req.user._id;
                                obj.dob = new Date(obj.dob).getTime();
                                obj.class = id;
                                delete obj._id;
                                addedStudents.push(obj);
                            }
                        }
                    }
                }
            }

            // Soft delete requested entries
            if (deleted && deleted.length) {
                for (const i in deleted) {
                    if (deleted.hasOwnProperty(i)) {
                        // Check if the id exists
                        const isStudentExists = await Common.findById(StudentModel, deleted[i], ['_id']);
                        if (!isStudentExists)
                            wrongDeletedEntries.push(deleted[i]);
                        else {
                            // Update the data as soft deleted
                            await Common.update(StudentModel, {_id: deleted[i]}, {
                                isDeleted: true,
                                updatedIp: ip,
                                updatedBy: req.user._id
                            });
                            deletedStudents++;
                        }
                    }
                }
            }

            const wrongCsvs = [];
            // New entries coming from csv file
            if (csv && csv.length) {
                for (const [index, obj] of csv.entries()) {
                    if (!obj.firstName || !obj.lastName || !obj.email) {
                        obj.message = req.t(constants.INADEQUATE_DATA);
                        obj.index = index;
                        wrongCsvs.push(obj);
                    } else {
                        const isEmail = EmailValidator(obj.email); // Check if email is valid
                        if (!isEmail) {
                            obj.message = req.t(constants.WRONG_EMAIL);
                            obj.index = index;
                            wrongCsvs.push(obj);
                        } else {
                            obj.createdIp = obj.updatedIp = ip;
                            obj.createdBy = obj.updatedBy = req.user._id;
                            obj.dob = new Date(obj.dob).getTime();
                            obj.class = id;
                            addedStudents.push(obj);
                        }
                    }
                }
            }
            if (addedStudents.length) {
                // Multiple insert for new entries
                await Common.multipleInsert(StudentModel, addedStudents);
            }

            // Update class data
            await Common.update(ClassModel, {_id: id}, req.body);
            const result = {
                message: req.t(constants.UPDATED),
                classData,
                addedStudents: addedStudents.length,
                wrongCsvs,
                wrongEntries,
                updatedStudents,
                deletedStudents,
                wrongDeletedEntries
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete Class
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

            // Check if class exists
            const classData = await Common.findById(ClassModel, id, ['_id']);
            // Returns error if class not exists
            if (!classData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // Find all the students of class
            const students = await Common.list(StudentModel, {class: id}, ['_id']);
            if (students && students.length) {
                const sdntIds = [];
                for (const obj of students) {
                    sdntIds.push(obj._id);
                }
                // Soft delete all the assessments related to students of the class
                await Common.update(AssessmentModel, {student: {$in: sdntIds}}, {
                    isDeleted: true,
                    updatedIp: ip,
                    updatedBy: req.user._id
                });
            }
            // Soft delete students
            await Common.update(StudentModel, {class: id}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id});
            // Soft delete class
            await Common.update(ClassModel, {_id: id}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id});

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

export default new ClassController();
