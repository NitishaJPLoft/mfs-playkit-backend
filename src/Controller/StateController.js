import {validationResult} from 'express-validator';
import StateModel from '../Models/State';
import UserModel from '../Models/User';
import SchoolModel from '../Models/School';
import AssessmentModel from '../Models/Assessment';
import ClassModel from '../Models/Class';
import StudentModel from '../Models/Student';
import {
    pagination,
    parseCurrentPage,
    parseLimit,
} from '../Helper/Pagination';
import {buildResult} from '../Helper/RequestHelper';
import {paginationResult} from '../Helper/Mongo';
import constants from '../../resources/constants';
import Common from '../DbController/CommonDbController';
import CommonService from '../Service/CommonService';

/**
 *  State Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['name', 'country', 'createdAt', 'updatedAt'];

class StateController {

    /**
     * Create State in particular country
     */
    create = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            let {name, country, ip} = req.body;
            req.body.createdIp = ip;
            req.body.updatedIp = ip;

            req.body.createdBy = req.user._id;
            req.body.updatedBy = req.user._id;
            // Find state data
            const stateData = await Common.findSingle(StateModel, {
                name: {$regex: '^' + name + '$', $options: "i"},
                country
            }, ['_id']);
            let state;
            if (stateData && stateData._id) {
                // Update added true to create State if that state already exists
                await Common.update(StateModel, {_id: stateData._id}, {
                    isAdded: true,
                    updatedIp: ip,
                    createdIp: ip,
                    createdBy: req.user._id,
                    updatedBy: req.user._id
                });
                // Find updated state data
                state = await Common.findSingle(StateModel, {_id: stateData._id}, params);
            } else {
                // Create new state if not exists
                req.body.isAdded = true;
                state = await Common.create(StateModel, req.body);
            }
            // Send response
            const result = {
                message: req.t(constants.CREATED),
                state
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of regions for the selected country
     */
    index = async (req, res) => {
        try {
            const {queryLimit, page, status, country, search} = req.query;
            const {_id, role} = req.user;
            if (status) {
                const currentPage = parseCurrentPage(page);
                const isAdded = status === 'true';
                const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
                const userInfo = await Common.findById(UserModel, _id, ['country', 'region']);
                const query = {isAdded};

                if (country) {
                    // Find state of particular country
                    if (role.name === 'superadmin' || role.name === 'globaladmin' || role.name === 'admin') {
                        query.country = country;
                    } else {
                        query['$and'] = [{country}, {_id: {$in: userInfo.region}}];
                    }
                } else {
                    // Find all the regions of logged in user
                    if (role.name !== 'superadmin' && role.name !== 'globaladmin') {
                        if (role.name === 'admin') {
                            query.country = {$in: userInfo.country};
                        } else {
                            query._id = {$in: userInfo.region};
                        }
                    }
                }

                if (search) {
                    query['$and'] = [{
                        $or: [{name: {$regex: search, $options: "i"}}
                        ]
                    }];
                }

                const populateFields = [
                    {path: 'country', select: 'name code phoneCode createdAt'}
                ];

                if (limit === 'all') {
                    // Find all the states
                    const states = await Common.list(StateModel, query, params, populateFields);
                    return buildResult(res, 200, states);
                } else {
                    // Find paginated list of states
                    const {result, totalCount} = await paginationResult(
                        query,
                        StateModel,
                        currentPage,
                        limit,
                        params,
                        populateFields
                    );
                    // Get pagination data
                    const paginationData = pagination(totalCount, currentPage, limit);
                    // Send response
                    return buildResult(res, 200, result, paginationData);
                }
            } else {
                // Returns error if not getting status in request
                return buildResult(res, 400, {}, {}, {message: req.t(constants.STATUS)});
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Detail of State including its school list
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
                {path: 'country', select: 'name code phoneCode'}
            ];
            // Find state data
            let stateData = await Common.findById(StateModel, id, params, populateFields);
            stateData = stateData.toObject();
            // Find schools of state
            stateData.schools = await Common.list(SchoolModel, {region: id}, ['name']);
            // Send response
            return buildResult(res, 200, stateData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update State data
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
            // Check if state exists or not
            const stateData = await Common.findById(StateModel, id, ['_id']);
            // Returns error if state not exists
            if (!stateData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // Update state data
            req.body.isAdded = true;
            const result = await Common.update(StateModel, {_id: id}, req.body);
            // Send response
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete State
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
            // Find state data
            const stateData = await Common.findById(StateModel, id, ['_id']);
            req.body.createdIp = ip;
            req.body.updatedIp = ip;
            req.body.isAdded = false;
            // Returns error if state not exists
            if (!stateData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});

            // Find all the schools of requested state
            const schools = await Common.list(SchoolModel, {region: id}, ['_id']);
            if (schools && schools.length) {
                const schIds = [];
                for (const obj of schools) {
                    schIds.push(obj._id);
                }
                // Find users of requested region and schools of that region
                const users = await Common.list(UserModel, {$or: [{region: id}, {school: {$in: schIds}}]}, ['_id']);
                if (users && users.length) {
                    const userIds = [];
                    for (const obj of users) {
                        userIds.push(obj._id);
                    }
                    // Find all the classes
                    const classes = await Common.list(ClassModel, {$or: [{school: {$in: schIds}}, {practitioner: {$in: userIds}}]}, ['_id']);
                    if (classes && classes.length) {
                        const classIds = [];
                        for (const obj of classes) {
                            classIds.push(obj._id);
                        }
                        // Find all the students
                        const students = await Common.list(StudentModel, {class: {$in: classIds}}, ['_id']);
                        if (students && students.length) {
                            const sdntIds = [];
                            for (const obj of students) {
                                sdntIds.push(obj._id);
                            }
                            // Find all the assessments of all related students
                            const assessments = await Common.list(AssessmentModel, {$or: [{student: {$in: sdntIds}}, {practitioner: {$in: userIds}}]}, ['_id']);
                            if (assessments && assessments.length) {
                                const assIds = [];
                                for (const obj of assessments) {
                                    assIds.push(obj._id);
                                }
                                await Common.update(AssessmentModel, {_id: {$in: assIds}}, {
                                    isDeleted: true,
                                    updatedIp: ip
                                })
                            }
                            // Soft delete Students
                            await Common.update(StudentModel, {_id: {$in: sdntIds}}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id});
                        }
                        // Soft delete Classes
                        await Common.update(ClassModel, {_id: {$in: classIds}}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id});
                    }
                    // Soft delete Users
                    await Common.update(UserModel, {_id: {$in: userIds}}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id});
                }
                // Soft delete Schools
                await Common.update(SchoolModel, {_id: {$in: schIds}}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id});
            }

            // Soft delete State
            await Common.update(StateModel, {_id: id}, {isAdded: false, updatedIp: ip, updatedBy: req.user._id});
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

export default new StateController();
