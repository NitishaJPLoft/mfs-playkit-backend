import UserModel from '../Models/User';
import PermissionModel from '../Models/Permission';
import RoleModel from '../Models/Role';
import Common from '../DbController/CommonDbController';
import constants from '../../resources/constants';
import { buildResult } from '../Helper/RequestHelper';

/**
 *  Role Permission middleware
 */
const rolePermission = (module, task) => {
    return async (req, res, next) => {
        try {
            // Find permission for the user role and module
            const data = await Common.findSingle(PermissionModel, {module, role: req.user.role._id}, ['role', 'module', 'permissions']);
            // Returns to next method
            if (!data) next();
            else {
                // Find index of action in permission
                const index = data.permissions.findIndex((x) => x.name === task);
                if (index > -1) {
                    // Find permission for the action to be performed
                    const permission = data.permissions[index];
                    // If permission exists for action
                    if (permission.value) {
                        //
                        if (permission.subPermissions && permission.subPermissions.others) {
                            const acceptedRoles = permission.subPermissions.others;
                            if (acceptedRoles && acceptedRoles.length) {
                                if (module === 'User') {
                                    if (req.body.role) {
                                        const index = acceptedRoles.findIndex(x => x === req.body.role);
                                        if (index > -1) {
                                            // Returns to next method
                                            next();
                                        } else {
                                            // Returns unauthorized error if user is not having permission for the action
                                            return buildResult(res, 401, {}, {}, {message: req.t(constants.UNAUTHORIZED)});
                                        }
                                    } else if (req.query.role) {
                                        // Find accepted roles for user module
                                        const index = acceptedRoles.findIndex(x => x === req.query.role);
                                        if (index > -1) {
                                            req.user.roles = [req.query.role];
                                            // Returns to next method
                                            next();
                                        } else {
                                            // Returns unauthorized error if user is not having permission for the action
                                            return buildResult(res, 401, {}, {}, {message: req.t(constants.UNAUTHORIZED)});
                                        }
                                    } else if (req.params && req.params.id) {
                                        // Find details of logged in user
                                        const userInfo = await Common.findById(UserModel, req.params.id, ['_id', 'role', 'firstName']);
                                        const index = acceptedRoles.findIndex(x => x === userInfo.role.toString());
                                        if (index > -1) {
                                            // Returns to next method
                                            next();
                                        } else {
                                            // Returns unauthorized error if user is not having permission for the action
                                            return buildResult(res, 401, {}, {}, {message: req.t(constants.UNAUTHORIZED)});
                                        }
                                    } else {
                                        req.user.roles = acceptedRoles;
                                        // Returns to next method
                                        next();
                                    }
                                } else {
                                    // Returns to next method
                                    next();
                                }
                            } else {
                                // Returns to next method
                                next();
                            }
                        } else {
                            if (module === 'User') {
                                if (req.user.role.name === 'superadmin') {
                                    // Find list of all roles
                                    const roles = await Common.list(RoleModel, {_id: {$ne: req.user.role._id}}, ['_id']);
                                    if (roles && roles.length) {
                                        const roleIds = [];
                                        for (const obj of roles) {
                                            roleIds.push(obj._id);
                                        }
                                        req.user.roles = roleIds;
                                    }
                                    // Returns to next method
                                    next();
                                } else {
                                    if (req.baseUrl.includes('roles') && req.user.role.name === 'practitioner') {
                                        // Returns to next method
                                        next();
                                    } else {
                                        if (task === 'view') {
                                            // Returns to next method
                                            next();
                                        } else {
                                            // Returns unauthorized error if user is not having permission for the action
                                            return buildResult(res, 401, {}, {}, {message: req.t(constants.UNAUTHORIZED)});
                                        }
                                    }
                                }
                            } else {
                                // Returns to next method
                                next();
                            }
                        }
                    } else {
                        // Returns unauthorized error if user is not having permission for the action
                        return buildResult(res, 401, {}, {}, {message: req.t(constants.UNAUTHORIZED)});
                    }
                } else {
                    // Returns to next method
                    next();
                }
            }
        } catch (err) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, {message: err.message});
        }

    }
};

export default rolePermission;
