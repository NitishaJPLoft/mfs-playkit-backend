import ip from 'ip';
import PhaseModel from '../Models/Phase';
import TaskModel from '../Models/Task';
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
 *  Phase Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */
class PhaseController {

    /**
     * Create Phase
     */
    create = async (req, res) => {
        try {
            const {name} = req.body;
            req.body.createdIp = ip.address();
            req.body.updatedIp = ip.address();
            // Check if phase exists
            const isPhaseExists = await Common.findSingle(PhaseModel, {name}, ['_id']);
            // Returns error if phase exists
            if (isPhaseExists) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            // Create phase
            const phaseData = await Common.create(PhaseModel, req.body);

            // Send Response
            const result = {
                message: req.t(constants.CREATED),
                phaseData
            };
            return buildResult(res, 200, result);
        } catch (error) {
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of phases
     */
    index = async (req, res) => {
        try {
            const {queryLimit, page} = req.query;
            const currentPage = parseCurrentPage(page);
            const limit = parseLimit(queryLimit);

            // Get list of all phases
            const {result, totalCount} = await paginationResult(
                {},
                PhaseModel,
                currentPage,
                limit,
                ['_id', 'name', 'color']
            );

            // Pagination data
            const paginationData = pagination(totalCount, currentPage, limit);
            // Send Response
            return buildResult(res, 200, result, paginationData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Detail of phase including it's all the tasks
     */
    single = async (req, res) => {
        try {
            const {id} = req.params;
            // Find phase for the given id
            let phaseData = await Common.findById(PhaseModel, id, ['name', 'color']);
            // Returns error if phase not exists
            if (!phaseData) buildResult(res, 404, {}, {}, {message: req.t(constants.NOT_EXISTS)});
            phaseData = phaseData.toObject();

            // Paramters need to get from task
            const params = ['name', 'language', 'phase', 'taskNumber', 'movementType', 'assessIt', 'stages', 'playItThumb',
                'playItIOD', 'isPlayItIOD', 'assessItThumb', 'assessItIOD', 'isAssessItIOD', 'assessItVideo', 'isAssessItVideo',
                'activityCard', 'isActivityCard', 'nextUrl', 'slug', 'typeOfPlayItIOD', 'typeOfAssessItIOD'];

            const populateFields = [
                {path: 'taskNumber', select: 'name number'},
                {path: 'movementType', select: 'name color'}
            ];
            // Find all the tasks of given phase
            phaseData.tasks = await Common.list(TaskModel, {phase: id, isDeleted: false}, params, populateFields);
            // Sort task by task number
            phaseData.tasks.sort(function(a, b){
                a = a.toObject();
                b = b.toObject();
                return a.taskNumber.number - b.taskNumber.number;
            });
            // Send Response
            return buildResult(res, 200, phaseData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    }
}

export default new PhaseController();
