import ip from 'ip';
import MovementModel from '../Models/MovementType';
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
 *  Movement Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */
class MovementController {

    /**
     * Create Movement
     */
    create = async (req, res) => {
        try {
            const {name} = req.body;
            req.body.createdIp = ip.address();
            req.body.updatedIp = ip.address();
            // Check if movement type exists or not
            const isMovementExists = await Common.findSingle(MovementModel, { name }, ['_id']);
            // Returns error if movement type already exists
            if (isMovementExists) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            // Create Movements type if not exists
            const movementData = await Common.create(MovementModel, req.body);

            // Send response
            const result = {
                message: req.t(constants.CREATED),
                movementData,
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of movements
     */
    index = async (req, res) => {
        try {
            const { queryLimit, page } = req.query;
            const currentPage = parseCurrentPage(page);
            const limit = parseLimit(queryLimit);

            // List of all the Movement types
            const { result, totalCount } = await paginationResult(
                {},
                MovementModel,
                currentPage,
                limit,
                ['_id', 'name', 'color']
            );

            // Paginated data
            const paginationData = pagination(totalCount, currentPage, limit);
            // Send response
            return buildResult(res, 200, result, paginationData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };
}

export default new MovementController();
