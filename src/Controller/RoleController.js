import ip from 'ip';
import RoleModel from '../Models/Role';
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
 *  Role Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */
class RoleController {

    /**
     * Create role
     */
    create = async (req, res) => {
        try {
            const {name} = req.body;
            req.body.createdIp = ip.address();
            req.body.updatedIp = ip.address();
            // Check if role exists
            const isRoleExists = await Common.findSingle(RoleModel, {name},['_id']);
            // Returns error if role exists
            if (isRoleExists) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            // Create Role
            const roleData = await Common.create(RoleModel, req.body);
            // Send Response
            const result = {
                message: req.t(constants.CREATED),
                roleData,
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the roles
     */
    index = async (req, res) => {
        try {
            const { queryLimit, page } = req.query;
            const {roles} = req.user;
            const currentPage = parseCurrentPage(page);
            const limit = parseLimit(queryLimit);
            const query = {_id: {$in: roles}};
            // Get list of all roles
            const { result, totalCount } = await paginationResult(
                query,
                RoleModel,
                currentPage,
                limit,
                ['_id', 'name', 'displayName']
            );

            // Get pagination data
            const paginationData = pagination(totalCount, currentPage, limit);
            // Send Response
            return buildResult(res, 200, result, paginationData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };
}

export default new RoleController();
