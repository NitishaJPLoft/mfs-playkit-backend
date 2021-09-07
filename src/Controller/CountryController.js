import {validationResult} from 'express-validator';
import CountryModel from '../Models/Country';
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
 *  Country Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['name', 'code', 'phoneCode', 'createdAt'];

class CountryController {

    /**
     * Create country
     */
    create = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            let {name, ip} = req.body;
            const query = {name: {$regex: '^' + name + '$', $options: "i"}};
            // Find Country data
            const countryData = await Common.findSingle(CountryModel, query, ['_id']);
            let country;
            if (countryData && countryData._id) {
                // Update added true to create Country if that country already exists
                await Common.update(CountryModel, {_id: countryData._id}, {
                    isAdded: true,
                    updatedIp: ip,
                    createdIp: ip,
                    createdBy: req.user._id,
                    updatedBy: req.user._id
                });
                // Find country data
                country = await Common.findSingle(CountryModel, {_id: countryData._id});
            } else {
                // Create new country if doesn't exist
                req.body.isAdded = true;
                req.body.createdBy = req.user._id;
                req.body.updatedBy = req.user._id;
                req.body.createdIp = ip;
                req.body.updatedIp = ip;
                country = await Common.create(CountryModel, req.body);
            }
            // Send Response
            const result = {
                message: req.t(constants.CREATED),
                country,
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Find list of all the countries
     */
    index = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {queryLimit, page, status, search} = req.query;
            const {_id, role} = req.user;
            if (status) {
                const currentPage = parseCurrentPage(page);
                const isAdded = status === 'true';
                const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
                // Find country of logged in user
                const userInfo = await Common.findById(UserModel, _id, ['country']);
                let query = {isAdded};

                if (role.name !== 'superadmin' && role.name !== 'globaladmin') {
                    query._id = {$in: userInfo.country};
                }

                if (search) {
                    query['$and'] = [{
                        $or: [{name: {$regex: search, $options: "i"}},
                            {code: {$regex: search, $options: "i"}},
                            {phoneCode: {$regex: search, $options: "i"}}
                        ]
                    }];
                }

                if (limit === 'all') {
                    // List for all Countries
                    const countries = await Common.list(CountryModel, query);
                    return buildResult(res, 200, countries);
                } else {
                    // List for paginated data
                    const {result, totalCount} = await paginationResult(
                        query,
                        CountryModel,
                        currentPage,
                        limit,
                        params
                    );
                    // Get pagination data
                    const paginationData = pagination(totalCount, currentPage, limit);
                    // Send Response
                    return buildResult(res, 200, result, paginationData);
                }
            } else {
                // Returns error if status is missing
                return buildResult(res, 400, {}, {}, {message: req.t(constants.STATUS)});
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Find single country detail
     */
    single = async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {id} = req.params;
            let countryData = await Common.findById(CountryModel, id);
            if (countryData && countryData._id) {
                countryData = countryData.toObject();
                countryData.regions = await Common.list(StateModel, {country: id, isAdded: true}, ['name']);
            }
            return buildResult(res, 200, countryData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update Country
     */
    update = async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {id} = req.params;
            const {ip} = req.body;
            req.body.updatedIp = ip;
            req.body.updatedBy = req.user._id;
            req.body.isAdded = true;
            const countryData = await Common.findById(CountryModel, id, ['_id']);
            if (!countryData) buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            const result = Common.update(CountryModel, {_id: id}, req.body);
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete Country
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
            const countryData = await Common.findById(CountryModel, id, ['_id']);
            if (!countryData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});

            const regions = await Common.list(StateModel, {country: id}, ['_id']);
            if (regions && regions.length) {
                const regIds = [];
                for (const obj of regions) {
                    regIds.push(obj._id);
                }
                const schools = await Common.list(SchoolModel, {$or: [{country: id}, {region: {$in: regIds}}]}, ['_id']);
                if ((schools && schools.length)) {
                    const schIds = [];
                    for (const obj of schools) {
                        schIds.push(obj._id);
                    }
                    const users = await Common.list(UserModel, {$or: [{country: id}, {region: {$in: regIds}}, {school: {$in: schIds}}]}, ['_id']);
                    if (users && users.length) {
                        const userIds = [];
                        for (const obj of users) {
                            userIds.push(obj._id);
                        }
                        const classes = await Common.list(ClassModel, {$or: [{school: {$in: schIds}}, {practitioner: {$in: userIds}}]}, ['_id']);
                        if (classes && classes.length) {
                            const classIds = [];
                            for (const obj of classes) {
                                classIds.push(obj._id);
                            }
                            const students = await Common.list(StudentModel, {class: {$in: classIds}}, ['_id']);
                            if (students && students.length) {
                                const sdntIds = [];
                                for (const obj of students) {
                                    sdntIds.push(obj._id);
                                }
                                const assessments = await Common.list(AssessmentModel, {$or: [{student: {$in: sdntIds}}, {practitioner: {$in: userIds}}]}, ['_id']);
                                if (assessments && assessments.length) {
                                    const assIds = [];
                                    for (const obj of assessments) {
                                        assIds.push(obj._id);
                                    }
                                    await Common.update(AssessmentModel, {_id: {$in: assIds}}, {
                                        isDeleted: true,
                                        updatedIp: ip,
                                        updatedBy: req.user._id
                                    })
                                }
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
                            });
                        }
                        await Common.update(UserModel, {_id: {$in: userIds}}, {
                            isDeleted: true,
                            updatedIp: ip,
                            updatedBy: req.user._id
                        });
                    }
                    await Common.update(SchoolModel, {_id: {$in: schIds}}, {
                        isDeleted: true,
                        updatedIp: ip,
                        updatedBy: req.user._id
                    });
                }
            }

            await Common.update(StateModel, {country: id}, {isAdded: false, updatedIp: ip, updatedBy: req.user._id});
            await Common.update(CountryModel, {_id: id}, {isAdded: false, updatedIp: ip, updatedBy: req.user._id});
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

export default new CountryController();
