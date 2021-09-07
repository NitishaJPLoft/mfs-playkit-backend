import ip from 'ip';
import PermissionModel from '../Models/Permission';
import {
    pagination,
    parseCurrentPage,
    parseLimit,
} from '../Helper/Pagination';
import { buildResult } from '../Helper/RequestHelper';
import { paginationResult } from '../Helper/Mongo';
import constants from '../../resources/constants';
import Common from '../DbController/CommonDbController';

/**
 *  Permission Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */
class PermissionController {

    /**
     * Create Permission
     */
    create = async (req, res) => {
        try {
            const {role, module} = req.body;
            req.body.createdIp = ip.address();
            req.body.updatedIp = ip.address();
            // Check if permission exists
            const isPermissionExists = await Common.findSingle(PermissionModel, {role, module}, ['_id']);
            // Returns error if permission exists
            if (isPermissionExists) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            // Create permission
            await Common.create(PermissionModel, req.body);
            // Send Response
            const result = {
                message: req.t(constants.CREATED)
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Create Permission in bulk
     */
    bulkCreate = async (req ,res) => {
        try {
            if (req.body && req.body.permissions && req.body.permissions.length) {
                const permissions = [];
                for (const obj of req.body.permissions) {
                    obj.createdIp = req.body.ip;
                    obj.updatedIp = req.body.ip;
                    // Check if any permission exists
                    const isPermissionExist = await Common.findSingle(PermissionModel, {role: obj.role, module: obj.module}, ['_id']);
                    if (isPermissionExist) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
                    permissions.push(obj);
                }
                // Create all the permissions
                const list = await Common.multipleInsert(PermissionModel, permissions);

                // Send Response
                const result = {
                    message: req.t(constants.PERMISSIONS_REGISTERED),
                    list
                };
                return buildResult(res, 201, result);
            } else {
                // Returns error if permissions array missing
                const error = {
                    message: req.t(constants.INADEQUATE_DATA)
                };
                return buildResult(res, 422, {}, {}, error);
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the permissions
     */
    index = async (req, res) => {
        try {
            const { queryLimit, page, role } = req.query;
            const currentPage = parseCurrentPage(page);
            const limit = parseLimit(queryLimit);
            const query = {};
            if (role) {
                query['role'] = role;
            }
            const populateField = {path: 'role', select: 'name'};

            // Find all the permissions
            const { result, totalCount } = await paginationResult(
                query,
                PermissionModel,
                currentPage,
                limit,
                ['role', 'module', 'permissions'],
                populateField
            );

            // Get paginated data
            const paginationData = pagination(totalCount, currentPage, limit);
            // Send Response
            return buildResult(res, 200, result, paginationData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };
}

export default new PermissionController();
