import ip from 'ip';
import TaskNumberModel from '../Models/TaskNumber';
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
 *  Task Number Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */
class TaskNumberController {

    /**
     * Create Task Number
     */
    create = async (req, res) => {
        try {
            const {name} = req.body;
            req.body.number = parseInt(name.split(' ')[1]);
            req.body.createdIp = ip.address();
            req.body.updatedIp = ip.address();
            // Check if task number exists
            const isTaskNumberExists = await Common.findSingle(TaskNumberModel, {name}, ['_id']);
            // Returns error if task number exists
            if (isTaskNumberExists) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            // Create task number
            const taskNumberData = await Common.create(TaskNumberModel, req.body);
           // Send response
            const result = {
                message: req.t(constants.CREATED),
                taskNumberData,
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the task numbers
     */
    index = async (req, res) => {
        try {
            const { queryLimit, page } = req.query;
            const currentPage = parseCurrentPage(page);
            const limit = parseLimit(queryLimit);

            // Get list of total task numbers
            const { result, totalCount } = await paginationResult(
                {},
                TaskNumberModel,
                currentPage,
                limit,
                ['name']
            );

            // Get pagination data
            const paginationData = pagination(totalCount, currentPage, limit);
            // Send response
            return buildResult(res, 200, result, paginationData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };
}

export default new TaskNumberController();
