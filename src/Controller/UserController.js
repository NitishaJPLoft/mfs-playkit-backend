import {validationResult} from 'express-validator';
import UserModel from '../Models/User';
import RoleModel from '../Models/Role';
import ClassModel from '../Models/Class';
import TResultModel from '../Models/TrainingResult';
import CountryModel from '../Models/Country';
import StateModel from '../Models/State';
import SchoolModel from '../Models/School';
import AssessmentModel from '../Models/Assessment';
import StudentModel from '../Models/Student';
import {
    pagination,
    parseCurrentPage,
    parseLimit,
} from '../Helper/Pagination';
import {buildResult} from '../Helper/RequestHelper';
import {paginationResult} from '../Helper/Mongo';
import {EmailValidator} from "../Helper/EmailValidator";
import Mail from '../Helper/Mail';
import {hashSync} from 'bcryptjs';
import constants from '../../resources/constants';
import Common from '../DbController/CommonDbController';
import CommonService from '../Service/CommonService';

/**
 *  User Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['firstName', 'lastName', 'email', 'role', 'school', 'region', 'country', 'createdAt'];

class UserController {
    /**
     * Register user
     */
    register = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            let {firstName, lastName, email, role, ip, password, country, region, school} = req.body;
            req.body.createdIp = ip;
            req.body.updatedIp = ip;
            req.body.createdBy = req.user._id;
            req.body.updatedBy = req.user._id;
            req.body.firstLoggedIn = false;

            // Find role name of the requested user
            const roleData = await Common.findById(RoleModel, role, ['name']);
            // Returns error if role not exists
            if (!roleData) {
                return buildResult(res, 400, {}, {}, {message: req.t(constants.NOT_EXISTS)});
            }

            // Check data validation according to user's role
            const condition1 = roleData.name === 'admin' && (!country || (country && country.length === 0));
            const condition2 = roleData.name === 'manager' && (!region || (region && region.length === 0));
            const condition3 = (roleData.name === 'programcordinator' || roleData.name === 'practitioner') && (!school || (school && school.length === 0));

            // Returns error if any condition fails for validation (incomplete data)
            if (condition1 || condition2 || condition3)
                return buildResult(res, 400, {}, {}, {message: req.t(constants.INADEQUATE_DATA)});

            // Manage data according to role
            if (roleData.name === 'globaladmin' || roleData.name === 'admin' || roleData.name === 'manager') {
                delete req.body.school;
                if (roleData.name === 'globaladmin' || roleData.name === 'admin') {
                    delete req.body.region;
                    if (roleData.name === 'globaladmin')
                        delete req.body.country;
                }
            }

            // Hash password for superadmin user
            if (roleData.name === 'superadmin') {
                req.body.firstLoggedIn = true;
                req.body.password = hashSync(password.toString()); // hash password
            } else {
                // Delete password for other roles
                if (password) {
                    delete req.body.password;
                }
            }

            // Check if email already exists or not
            const isEmailExist = await Common.findSingle(UserModel, {email, isDeleted: false}, ['_id']);
            // Returns error if email exists
            if (isEmailExist)
                return buildResult(res, 400, {}, {}, {message: req.t(constants.EMAIL_ALREADY_EXISTS)});

            // Condition to check if region exists
            const regionCondition = req.body.region && (typeof region === 'string' || region.length);
            // Condition to check if school exists
            const schoolCondition = req.body.school && (typeof school === 'string' || school.length);

            if (schoolCondition) {
                // Condition for finding school(s)
                const query = typeof school === 'string' ? {_id: school} : {_id: {$in: school}};
                // Find list of schools
                const schools = await Common.list(SchoolModel, query, ['country', 'region']);
                const countryIds = [], regionIds = [];
                for (let obj of schools) {
                    obj = obj.toObject();
                    countryIds.push(obj.country);
                    regionIds.push(obj.region);
                }
                req.body.country = [...new Set(countryIds)];
                req.body.region = [...new Set(regionIds)];
            } else if (regionCondition) {
                // Condition for finding country(s) from region(s)
                const query = typeof region === 'string' ? {_id: region} : {_id: {$in: region}};
                // Find all the countries of the regions
                req.body.country = await CommonService.findIds(StateModel, query, ['country']);
            }

            // Create user
            const user = await Common.create(UserModel, req.body);
            if (user && user._id) {
                // Send activation mail to registered user
                Mail.send(email, `${req.t(constants.EMAIL_MSG)} ${roleData.name}`, `${firstName}`, `${lastName}`, `${roleData.name}`);
            }
            // Send response
            const result = {
                message: req.t(constants.CREATED),
                user
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Register users in bulk
     */
    bulkCreate = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {users, csv, role, ip} = req.body;

            const userArr = [], wrongEntries = [], wrongCsvs = [];
            // If users list or csv list of users requested to register
            if ((users && users.length) || (csv && csv.length)) {
                // Find role name for all the users
                const roleData = await Common.findById(RoleModel, role, ['name']);
                // Returns error if role not exists
                if (!roleData) {
                    return buildResult(res, 400, {}, {}, {message: req.t(constants.NOT_EXISTS)});
                }
                // Check if users entry exists
                if (users && users.length) {
                    for (const [index, obj] of users.entries()) {
                        // Condition for users according to role
                        const condition1 = roleData.name === 'admin' && (!obj.country || (obj.country && obj.country.length === 0));
                        const condition2 = roleData.name === 'manager' && (!obj.region || (obj.region && obj.region.length === 0));
                        const condition3 = (roleData.name === 'programcordinator' || roleData.name === 'practitioner') && (!obj.school || (obj.school && obj.school.length === 0));

                        if (roleData.name !== 'globaladmin') {
                            // Returns error if data is incomplete for the user
                            if (condition1 || condition2 || condition3) {
                                obj.message = req.t(constants.INADEQUATE_DATA);
                                obj.index = index;
                                wrongEntries.push(obj);
                            }
                        }

                        // Set data according to role
                        if (roleData.name === 'globaladmin' || roleData.name === 'admin' || roleData.name === 'manager') {
                            delete obj.school;
                            if (roleData.name === 'globaladmin' || roleData.name === 'admin') {
                                delete obj.region;
                                if (roleData.name === 'globaladmin')
                                    delete obj.country;
                            }
                        }
                        if (!obj.firstName || !obj.lastName || !obj.email) {
                            // Push user entry in wrong entries if any field is missing
                            obj.message = req.t(constants.INADEQUATE_DATA);
                            obj.index = index;
                            wrongEntries.push(obj);
                        } else {
                            // Check if email is valid
                            const isEmail = EmailValidator(obj.email);
                            if (!isEmail) {
                                // Push user entry in wrong entries if email is invalid
                                obj.message = req.t(constants.WRONG_EMAIL);
                                obj.index = index;
                                wrongEntries.push(obj);
                            } else {
                                // Check if email already exists or not
                                const isEmailExist = await CommonService.checkEmailExistence(UserModel, obj.email, userArr);
                                if (isEmailExist) {
                                    // Push user entry in wrong entries if email already exists
                                    obj.message = req.t(constants.EMAIL_ALREADY_EXISTS);
                                    obj.index = index;
                                    wrongEntries.push(obj);
                                } else {
                                    // Add valid user entry
                                    obj.createdIp = ip;
                                    obj.updatedIp = ip;
                                    obj.createdBy = req.user._id;
                                    obj.updatedBy = req.user._id;
                                    obj.firstLoggedIn = false;
                                    obj.role = role;
                                    userArr.push(obj);
                                }
                            }
                        }
                    }
                }

                if (csv && csv.length) {
                    // Check users from csv list
                    for (const [index, obj] of csv.entries()) {
                        // Condition for users according to role
                        const condition1 = roleData.name === 'admin' && (!obj.country || (obj.country && obj.country.length === 0));
                        const condition2 = roleData.name === 'manager' && (!obj.region || (obj.region && obj.region.length === 0));
                        const condition3 = (roleData.name === 'programcordinator' || roleData.name === 'practitioner') && (!obj.school || (obj.school && obj.school.length === 0));

                        if (condition1 || condition2 || condition3) {
                            // Returns error if data is incomplete for the user
                            obj.message = req.t(constants.INADEQUATE_DATA);
                            obj.index = index;
                            wrongCsvs.push(obj);
                        }

                        // Set data according to role
                        if (roleData.name === 'globaladmin' || roleData.name === 'admin' || roleData.name === 'manager') {
                            delete obj.school;
                            if (roleData.name === 'globaladmin' || roleData.name === 'admin') {
                                delete obj.region;
                                if (roleData.name === 'globaladmin')
                                    delete obj.country;
                            }
                        }
                        if (!obj.firstName || !obj.lastName || !obj.email) {
                            // Push user entry in wrong entries if any field is missing
                            obj.message = req.t(constants.INADEQUATE_DATA);
                            obj.index = index;
                            wrongCsvs.push(obj);
                        }
                        else {
                            // Check if email is valid
                            const isEmail = EmailValidator(obj.email);
                            if (!isEmail) {
                                // Push user entry in wrong entries if email is invalid
                                obj.message = req.t(constants.WRONG_EMAIL);
                                obj.index = index;
                                wrongCsvs.push(obj);
                            } else {
                                let country, region, school;
                                if (obj.country) {
                                    // Find country id from the name
                                    country = await Common.findSingle(CountryModel, {
                                        name: {
                                            $regex: '^' + obj.country + '$',
                                            $options: "i"
                                        },
                                        isAdded: true
                                    }, ['_id']);
                                }

                                if (obj.region && country && country._id) {
                                    // Find region id from the name
                                    region = await Common.findSingle(StateModel, {
                                        name: {
                                            $regex: '^' + obj.region + '$',
                                            $options: "i",
                                        },
                                        country: country._id,
                                        isAdded: true
                                    }, ['_id']);
                                }

                                if (obj.school && country && country._id && region && region._id) {
                                    // Find school id from the name
                                    school = await Common.findSingle(SchoolModel, {
                                        name: {
                                            $regex: '^' + obj.school + '$',
                                            $options: "i"
                                        }, country: country._id, region: region._id, isDeleted: false
                                    }, ['_id']);
                                }

                                // Check if email already exists or not
                                const isEmailExist = await CommonService.checkEmailExistence(UserModel, obj.email, userArr);
                                // Check condition if email, country, region and school exists or not
                                if (isEmailExist || (obj.country && !country) || (obj.region && !region) || (obj.school && !school)) {
                                    obj.index = index;
                                    // Returns error if any of the data missing
                                    obj.message = isEmailExist ? req.t(constants.EMAIL_ALREADY_EXISTS) :
                                        (obj.country && !country) ? req.t(constants.COUNTRY_NOT_EXISTS) :
                                            (obj.region && !region) ? req.t(constants.REGION_NOT_EXISTS) : req.t(constants.SCHOOL_NOT_EXISTS);
                                    wrongCsvs.push(obj);
                                } else {
                                    // Add valid user entry
                                    obj.country = country && country._id;
                                    obj.region = region && region._id;
                                    obj.school = school && school._id;
                                    obj.createdIp = ip;
                                    obj.updatedIp = ip;
                                    obj.createdBy = req.user._id;
                                    obj.updatedBy = req.user._id;
                                    obj.firstLoggedIn = false;
                                    obj.role = role;
                                    userArr.push(obj);

                                }
                            }
                        }
                    }
                }
                let userList = [];
                if (userArr && userArr.length) {
                    // If there is wrong entries in list or csv, then no user will be added
                    if ((wrongEntries && wrongEntries.length) || (wrongCsvs && wrongCsvs.length)) {
                        userList = [];
                    } else {
                        for (const obj of userArr) {
                            // Send activation mail to registered user
                            Mail.send(obj.email, `${req.t(constants.EMAIL_MSG)} ${roleData.name}`, `${obj.firstName}`, `${obj.lastName}`, `${roleData.name}`);
                        }
                        // Multiple insert for all the users
                        userList = await Common.multipleInsert(UserModel, userArr);
                    }
                }

                // Send response
                const result = {
                    message: userList.length === 0 ? req.t(constants.INADEQUATE_DATA) : req.t(constants.USERS_REGISTERED),
                    userList,
                    wrongEntries,
                    wrongCsvs
                };
                return buildResult(res, 201, result);
            } else {
                return buildResult(res, 400, {}, {}, {message: req.t(constants.INADEQUATE_DATA)});
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List all the users
     */
    index = async (req, res) => {
        try {
            const {_id, roles} = req.user;
            const {queryLimit, page, search, role} = req.query;
            const userRole = req.user.role.name;
            const currentPage = parseCurrentPage(page);
            const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
            // Find details of logged in user
            const userInfo = await Common.findById(UserModel, _id, ['country', 'region', 'school']);

            // Condition to find the user list according to logged in user role
            const query = role ? {role} : (userRole === 'superadmin' || userRole === 'globaladmin') ?
                {$or: [{role: {$in: roles}}, {createdBy: req.user._id}]} : {
                    $or: [{
                        $and: [{
                            role: {$in: roles},
                            createdBy: req.user._id
                        }]
                    }]
                };

            query['_id'] = {$nin: _id};

            // Manage condition according to role
            if (userRole !== 'superadmin' && userRole !== 'globaladmin') {
                if (userRole === 'admin' && userInfo.country) {
                    if (role) {
                        query.country = {$in: userInfo.country}
                    } else {
                        query['$or'].push({country: {$in: userInfo.country}, role: {$in: roles}});
                    }
                } else if (userRole === 'manager' && userInfo.region) {
                    if (role) {
                        query.region = {$in: userInfo.region}
                    } else {
                        query['$or'].push({region: {$in: userInfo.region}, role: {$in: roles}});
                    }
                } else if (userInfo.school) {
                    if (role) {
                        query.school = {$in: userInfo.school};
                    } else {
                        query['$or'].push({school: {$in: userInfo.school}, role: {$in: roles}});
                    }
                }
            }

            query['isDeleted'] = false;

            if (search) {
                query['$and'] = [{
                    $or: [{firstName: {$regex: search, $options: "i"}},
                        {lastName: {$regex: search, $options: "i"}},
                        {email: {$regex: search, $options: "i"}}
                    ]
                }]
            }

            const populateFields = [
                {path: 'school', select: 'name'},
                {path: 'region', select: 'name'},
                {path: 'country', select: 'name code'},
                {path: 'role', select: 'name displayName'}
            ];
            if (limit === 'all') {
                // Get list of all the users according to condition
                const users = await Common.list(UserModel, query, params, populateFields);
                // Send response
                return buildResult(res, 200, users);
            } else {
                // Get paginated list of user
                const {result, totalCount} = await paginationResult(
                    query,
                    UserModel,
                    currentPage,
                    limit,
                    params,
                    populateFields
                );

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
     * Find detail of requested user
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
                {path: 'school', select: 'name'},
                {path: 'region', select: 'name'},
                {path: 'country', select: 'name code'},
                {path: 'role', select: 'name displayName'}
            ];
            // Find user details
            let user = await Common.findById(UserModel, id, params, populateFields);

            if (user && user._id && user.role.name === 'practitioner') {
                user = user.toObject();
                // Condition to find classes of user
                const classQuery = {practitioner: user._id, isDeleted: false};
                const popFields = [
                    {path: 'school', select: 'name'},
                    {path: 'practitioner', select: 'firstName lastName email'}
                ];
                const classParams = ['name', 'status', 'school', 'practitioner'];
                // Find all the classes of user
                user.classes = await Common.list(ClassModel, classQuery, classParams, popFields);
                // Condition to find trainings of user
                const tQuery = {
                    $and: [{user: user._id},
                        {$or: [{rating: 'Reliable'}, {$and: [{rating: 'Unreliable'}, {attempt: 2}, {status: 'Completed'}]}]}]
                };
                const tParams = ['updatedAt', 'attempt', 'rating', 'status', 'nextTrainingDate', 'marks', 'testId'];
                // Find all the trainings of user
                user.trainings = await TResultModel.find(tQuery, tParams).sort({nextTrainingDate: 1}).limit(2);
                if (user.trainings && user.trainings.length) {
                    for (const i in user.trainings) {
                        if (user.trainings.hasOwnProperty(i)) {
                            user.trainings[i] = user.trainings[i].toObject();
                            // Change date format of nextTrainingDate
                            user.trainings[i].nextTrainingDate = user.trainings[i].nextTrainingDate && await CommonService.convertTimeToDate(user.trainings[i].nextTrainingDate);
                        }
                    }
                }
                // Find current training of user
                const currentTraining = await TResultModel.find({user: user._id}, ['status', 'attempt', 'rating']).sort({nextTrainingDate: -1}).limit(1);
                // Get the status of user's current training
                if (currentTraining && currentTraining.length) {
                    user.Trainingstatus = currentTraining[0].attempt === 1 && currentTraining[0].status === 'Completed' &&
                    currentTraining[0].rating === 'Unreliable' ? 'Not Started' : currentTraining[0].status;
                } else {
                    user.Trainingstatus = 'Not Started';
                }

            }
            // Send response
            return buildResult(res, 200, user);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update selected user
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
            const {ip, firstName, lastName, email, role, country, region, school} = req.body;
            req.body.updatedIp = ip;
            req.body.updatedBy = req.user._id;
            // Check if user exists or not
            const user = await Common.findById(UserModel, id, ['_id', 'role']);
            // Returns error if user id is invalid
            if (!user) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            if (email) {
                // Check user exists or not for the email
                const data = await Common.findSingle(UserModel, {email, _id: {$ne: id}, isDeleted: false}, '_id');
                if (data && data._id) {
                    // Returns error if email already exists
                    return buildResult(res, 400, {}, {}, {message: req.t(constants.EMAIL_ALREADY_EXISTS)});
                }
            }
            // Check if user role is updating
            if (role.toString() !== user.role.toString()) {
                const roleData = await Common.findById(RoleModel, role, ['name']);
                if (!roleData) {
                    // Returns error if role not exists
                    return buildResult(res, 400, {}, {}, {message: req.t(constants.NOT_EXISTS)});
                }

                // Check data validation according to user's role
                const condition1 = roleData.name === 'admin' && (!country || (country && country.length === 0));
                const condition2 = roleData.name === 'manager' && (!region || (region && region.length === 0));
                const condition3 = (roleData.name === 'programcordinator' || roleData.name === 'practitioner') && (!school || (school && school.length === 0));

                // Returns error if data is incomplete
                if (condition1 || condition2 || condition3)
                    return buildResult(res, 400, {}, {}, {message: req.t(constants.INADEQUATE_DATA)});

                // Manage data according to role
                if (roleData.name === 'globaladmin' || roleData.name === 'admin' || roleData.name === 'manager') {
                    delete req.body.school;
                    if (roleData.name === 'globaladmin' || roleData.name === 'admin') {
                        delete req.body.region;
                        if (roleData.name === 'globaladmin')
                            delete req.body.country;
                    }
                }
            }

            // Condition for region
            const regionCondition = req.body.region && (typeof region === 'string' || region.length);
            // Condition for school
            const schoolCondition = req.body.school && (typeof school === 'string' || school.length);

            if (schoolCondition) {
                // Condition for the school
                const query = typeof school === 'string' ? {_id: school} : {_id: {$in: school}};
                // Get list of schools according to condition
                const schools = await Common.list(SchoolModel, query, ['country', 'region']);
                const countryIds = [], regionIds = [];
                for (let obj of schools) {
                    obj = obj.toObject();
                    countryIds.push(obj.country);
                    regionIds.push(obj.region);
                }
                req.body.country = [...new Set(countryIds)];
                req.body.region = [...new Set(regionIds)];
            } else if (regionCondition) {
                // Condition for the region
                const query = typeof region === 'string' ? {_id: region} : {_id: {$in: region}};
                // Find country ids for the region(s)
                req.body.country = await CommonService.findIds(StateModel, query, ['country']);
            }

            // Check if email
            if(email) {
                // Find details of user
                const userData = await Common.findSingle(UserModel, {_id: id}, ['email', 'firstLoggedIn']);
                // check if email has changed and it is not activated
                if (email !== userData.email && !userData.firstLoggedIn) {
                    // Find role of user
                    const roleData = await Common.findById(RoleModel, role, ['name']);
                    // Send activation mail to updated user
                    Mail.send(email, `${req.t(constants.EMAIL_MSG)} ${roleData.name}`, `${firstName}`, `${lastName}`, `${roleData.name}`);
                }
            }

            // Update user data
            const result = await Common.update(UserModel, {_id: id}, req.body);
            // Send response
            result.message = req.t(result.message);
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete selected user
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
            const {newPractitioner} = req.query;
            const {ip} = req.body;
            // Find user details
            const user = await Common.findById(UserModel, id, ['_id', 'role'], {path: 'role', select: 'name'});
            // Returns error if user is invalid
            if (!user) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // If user role is practitioner
            if (user.role.name === 'practitioner') {
                // Find classes of user
                const classes = await Common.list(ClassModel, {practitioner: id}, ['_id']);
                if (classes && classes.length) {
                    const classIds = [];
                    for (const obj of classes) {
                        classIds.push(obj._id);
                    }
                    // Update classes with the new practitioner to the classes of old practitioner
                    await Common.update(ClassModel, {_id: {$in: classIds}}, {practitioner: newPractitioner});
                    // Find list of students of the classes of deleted user
                    const students = await Common.list(StudentModel, {class: {$in: classIds}}, ['_id']);
                    if (students && students.length) {
                        const sdntIds = [];
                        for (const obj of students) {
                            sdntIds.push(obj._id);
                        }
                        // Find the assessments of old user
                        const assessments = await Common.list(AssessmentModel, {$or: [{student: {$in: sdntIds}}, {practitioner: id}]}, ['_id']);
                        if (assessments && assessments.length) {
                            const assIds = [];
                            for (const obj of assessments) {
                                assIds.push(obj._id);
                            }
                            // Soft delete Assessments
                            await Common.update(AssessmentModel, {_id: {$in: assIds}}, {
                                isDeleted: true,
                                updatedIp: ip,
                                updatedBy: req.user._id
                            })
                        }
                    }
                }
            }
            // Soft delete user
            await Common.update(UserModel, {_id: id}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id});
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

export default new UserController();
