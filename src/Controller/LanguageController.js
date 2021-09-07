import ip from 'ip';
import LanguageModel from '../Models/Language';
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
 *  Language Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */
class LanguageController {

    /**
     * Create Language
     */
    create = async (req, res) => {
        try {
            let  {name} = req.body;
            req.body.createdIp = ip.address();
            req.body.updatedIp = ip.address();
            // Check if language exists or not
            const isLanguageExists = await Common.findSingle(LanguageModel, { name }, ['_id']);
            // Returns error if language already exists
            if (isLanguageExists) return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            // Create language
            let languageData = await Common.create(LanguageModel, req.body);

            // Send Response
            const result = {
                message: req.t(constants.CREATED),
                languageData,
            };
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of languages
     */
    index = async (req, res) => {
        try {
            const { queryLimit, page } = req.query;
            const currentPage = parseCurrentPage(page);
            const limit = parseLimit(queryLimit);

            // List of all the languages
            const { result, totalCount } = await paginationResult(
                {},
                LanguageModel,
                currentPage,
                limit,
                ['_id', 'name', 'slug']
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

export default new LanguageController();
