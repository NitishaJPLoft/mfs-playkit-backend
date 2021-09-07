import {validationResult} from 'express-validator';
import SchoolModel from '../Models/School';
import ClassModel from '../Models/Class';
import StudentModel from '../Models/Student';
import AssessmentModel from '../Models/Assessment';
import UserModel from '../Models/User';
import {
    pagination,
    parseCurrentPage,
    parseLimit,
} from '../Helper/Pagination';
import {buildResult} from '../Helper/RequestHelper';
import {paginationResult} from '../Helper/Mongo';
import constants from '../../resources/constants';
import Common from '../DbController/CommonDbController';

/**
 *  School Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['name', 'region', 'country', 'createdAt'];

class SchoolController {

    /**
     * Create school
     */
    create = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            let {name, region, country, ip} = req.body;
            req.body.createdIp = ip;
            req.body.updatedIp = ip;
            req.body.createdBy = req.user._id;
            req.body.updatedBy = req.user._id;
            // Check if the school with the requested name in same country and region exists or not
            const isSchoolExists = await  Common.findSingle(SchoolModel, {name, region, country}, ['_id']);
            // Returns error if school is already registered
            if (isSchoolExists) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            // Create School
            const schoolData = await Common.create(SchoolModel, req.body);

            // Send Response
            const result = {
                message: req.t(constants.CREATED),
                schoolData,
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the schools
     */
    index = async (req, res) => {
        try {
            const {queryLimit, page, search, region} = req.query;
            const {_id, role} = req.user;
            const currentPage = parseCurrentPage(page);
            const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
            // Find country, region and school of the logged in user
            const userInfo = await Common.findById(UserModel, _id, ['country', 'region', 'school']);
            let query = {isDeleted: false};

            if (region) {
                // Create query to find school of particular region
                if (role.name === 'superadmin' || role.name === 'globaladmin' || role.name === 'admin' || role.name === 'manager') {
                    query.region = region;
                } else {
                    query['$and'] = [{region}, {_id: {$in: userInfo.school}}];
                }
            } else {
                // Query to find schools list according to user's role
                if (role.name !== 'superadmin' && role.name !== 'globaladmin') {
                    if (role.name === 'admin') {
                        query.country = {$in: userInfo.country};
                    } else if (role.name === 'manager') {
                        query.region = {$in: userInfo.region};
                    } else {
                        query._id = {$in: userInfo.school};
                    }
                }
            }

            if (search) {
                query['$and'] = [{
                    $or: [{name: {$regex: search, $options: "i"}},
                        {status: {$regex: search, $options: "i"}}
                    ]
                }];
            }

            const populateFields = [
                {path: 'region', select: 'name'},
                {path: 'country', select: 'name code'}
            ];

            if (limit === 'all') {
                // Find all School list according to query
                const schools = await SchoolModel.find(query).populate(populateFields);
                return buildResult(res, 200, schools);
            } else {
                // Find paginated list of schools
                const {result, totalCount} = await paginationResult(
                    query,
                    SchoolModel,
                    currentPage,
                    limit,
                    ['name', 'region', 'country'],
                    populateFields,
                );

                // Get pagination data
                const paginationData = pagination(totalCount, currentPage, limit);
                // Send Response
                return buildResult(res, 200, result, paginationData);
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Details of selected school
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
                {path: 'region', select: 'name'},
                {path: 'country', select: 'name code'}
            ];
            // Find school data
            let school = await Common.findById(SchoolModel, id, params, populateFields);
            if (school && school._id) {
                school = school.toObject();
                school.classes = await Common.list(ClassModel, {school: id}, ['name']);
            }
            // Send response
            return buildResult(res, 200, school);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update School details
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
            const {ip, name, country, region} = req.body;
            req.body.updatedIp = ip;
            req.body.updatedBy = req.user._id;
            // Check if school exists or not
            const school = await Common.findById(SchoolModel, id, ['_id']);
            // Returns error if school not exists
            if (!school) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // Check if same name in same country and region exists
            const isSchoolExists = await Common.findSingle(SchoolModel, {
                name,
                country,
                region,
                _id: {$ne: id}
            }, ['_id']);
            // Returns error if school already is already registered
            if (isSchoolExists) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            // Update school data
            const result = await Common.update(SchoolModel, {_id: id}, req.body);
            // Send response
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete School
     */
    remove = async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {id} = req.params;
            const {ip} = req.body;
            // Check if school exists or not
            const school = await Common.findById(SchoolModel, id, ['_id']);
            // Returns error if school not exists
            if (!school) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // Find all the classes of School
            const classes = await Common.list(ClassModel, {school: id}, ['_id']);
            if (classes && classes.length) {
                const classIds = [];
                for (const obj of classes) {
                    classIds.push(obj._id);
                }
                // Find all the students of classes of requested school
                const students = await Common.list(StudentModel, {class: {$in: classIds}}, ['_id']);
                if (students && students.length) {
                    const sdntIds = [];
                    for (const obj of students) {
                        sdntIds.push(obj._id);
                    }
                    // Soft delete of Assessments of students of requested school
                    await Common.update(AssessmentModel, {student: {$in: sdntIds}}, {
                        isDeleted: true,
                        updatedIp: ip,
                        updatedBy: req.user._id
                    });
                    // Soft delete of students of classes of the requested school
                    await Common.update(StudentModel, {_id: {$in: sdntIds}}, {
                        isDeleted: true,
                        updatedIp: ip,
                        updatedBy: req.user._id
                    });
                }
                await Common.update(ClassModel, {_id: {$in: classIds}}, {
                    isDeleted: true,
                    updatedIp: ip,
                    updatedBy: req.user._id
                })
            }
            // Update school as deleted (soft delete)
            await Common.update(SchoolModel, {_id: id}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id});
            // Send Response
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

export default new SchoolController();
