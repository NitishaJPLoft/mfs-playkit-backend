import fs from 'fs';
import {validationResult} from 'express-validator';
import PageModel from '../Models/Pages';
import LanguageModel from '../Models/Language';
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
 *  Page Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */
const params = ['title', 'language', 'fileUrl', 'headingLine1', 'headingLine2', 'bodyText', 'primaryLable',
    'secondryLable', 'sectionHeading1', 'sectionHeading2', 'sectionHeading3', 'slug'];

class PageController {

    /**
     * Create Static Page
     */
    create = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }

            // Path for uploading files
            const splitUrl = req.baseUrl.split('/');
            const folderName = splitUrl[splitUrl.length - 1];
            const dir = 'uploads/' + folderName;

            let {title, language, ip} = req.body;
            req.body.createdIp = ip;
            req.body.updatedIp = ip;
            req.body.createdBy = req.user._id;
            req.body.updatedBy = req.user._id;

            // Check if page already exists
            const isPageExists =  await Common.findSingle(PageModel, {title, language});
            if (isPageExists) {
                // Delete related uploaded files from the folder
                if (req.file.filename && dir + req.file.filename) {
                    fs.unlink(dir + '/' + req.file.filename, (err => {
                        if (err) console.log(err);
                    }));
                }
                // Returns error if page already exists
                return buildResult(res, 400, {}, {}, {message: req.t(constants.ALREADY_REGISTERED)});
            }

            // Set url path for uploaded file
            req.body.fileUrl = process.env.IMAGE_URL + folderName + '/' + req.file.filename;
            // Find language
            const languageData = await Common.findById(LanguageModel, language, ['name', 'slug']);
            // Create slug with the combination of page title and language slug
            if (languageData && languageData._id) {
                req.body.slug = `${title.toLowerCase()}_${languageData.slug}`
            }

            // Create page
            const pageData = await Common.create(PageModel, req.body);

            // Send Response
            const result = {
                message: req.t(constants.CREATED),
                pageData,
            };
            return buildResult(res, 201, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * List of all the static pages
     */
    index = async (req, res) => {
        try {
            // Errors of the express validators from route
            const {queryLimit, page, search} = req.query;
            const currentPage = parseCurrentPage(page);
            const limit = queryLimit === 'all' ? queryLimit : parseLimit(queryLimit);
            let query = {isDeleted: false};
            if (search) {
                query['$or'] = [{title: {$regex: search, $options: "i"}},
                    {slug: {$regex: search, $options: "i"}}]
            }
            const populateFields = [
                {path: 'language', select: 'name slug'}
            ];
            if (limit === 'all') {
                // List all the pages
                const pages = await Common.list(PageModel, query, params, populateFields);
                return buildResult(res, 200, pages);
            } else {
                // List paginated data
                const {result, totalCount} = await paginationResult(
                    query,
                    PageModel,
                    currentPage,
                    limit,
                    params,
                    populateFields
                );

                // Get pagination data
                const paginationData = pagination(totalCount, currentPage, limit);
                // Send Response
                return buildResult(res, 200, result, paginationData);
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Details of single page
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
                {path: 'language', select: 'name slug'}
            ];

            // Find single page detail
            let pageData = await Common.findSingle(PageModel,{title: id},params,populateFields);
            if (pageData && pageData._id) {
                pageData = pageData.toObject();
                pageData.headingLine1 = pageData.headingLine1 && pageData.headingLine1.toUpperCase();
                pageData.headingLine2 = pageData.headingLine2 && pageData.headingLine2.toUpperCase();
            }
            // Send Response
            return buildResult(res, 200, pageData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Update page
     */
    update = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            // Path for uploading files
            const splitUrl = req.baseUrl.split('/');
            const folderName = splitUrl[splitUrl.length - 1];
            const dir = 'uploads/' + folderName;
            const {id} = req.params;
            const {ip} = req.body;
            req.body.updatedIp = ip;
            req.body.updatedBy = req.user._id;

            // Check if page data exists
            const pageData = await Common.findById(PageModel, id, ['_id', 'fileUrl']);
            // Returns error if page not exists
            if (!pageData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            if (req.file && req.file.filename) {
                // Delete old file if new file is there to upload
                if (pageData && pageData.fileUrl) {
                    const splitFile = pageData.fileUrl.split('/');
                    const file = splitFile[splitFile.length - 1];
                    fs.unlink(dir + '/' + file, (err => {
                        if (err) console.log(err);
                    }));
                }
                // Set path for new file
                req.body.fileUrl = process.env.IMAGE_URL + folderName + '/' + req.file.filename;
            }
            // Update page data
            const result = await Common.update(PageModel, {_id: id}, req.body);
            // Send Response
            return buildResult(res, 200, result);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Delete page
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
            // Check if page exists or not
            const pageData = await Common.findById(PageModel, id, ['_id']);
            // Returns error if page not exists
            if (!pageData) return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_ID)});
            // Update Page as deleted true
            await Common.update(PageModel, {_id: id}, {isDeleted: true, updatedIp: ip, updatedBy: req.user._id})
            // Send Response
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

export default new PageController();
