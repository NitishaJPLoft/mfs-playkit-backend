export const parseTotalPages = (totalCount, limit) => {
    return Math.ceil(totalCount / limit);
};

/**
 * parse Query Limit
 * @param queryLimit
 */
export const parseLimit = queryLimit => {
    return parseInt(
        queryLimit && parseInt(queryLimit) !== 0 ? queryLimit : 10
    );
};

/**
 * Parse current page
 * @param queryPage
 */
export const parseCurrentPage = queryPage => {
    return parseInt(
        queryPage && parseInt(queryPage) !== 0 ? queryPage : 1
    );
};

/**
 * Pagination Object
 * @param {Number} totalCount - Total counts
 * @param {Number}  page  - Current Page
 * @param  {Number} queryLimit - limit
 */

export const pagination = (totalCount, page, queryLimit = 10) => {
    const limit = parseLimit(queryLimit);
    const currentPage = parseCurrentPage(page);
    const totalPages = parseTotalPages(totalCount, limit);
    // Returns data for pagination
    return {
        totalCount,
        totalPages,
        currentPage: currentPage,
        nextPage: currentPage < totalPages ? currentPage + 1 : null,
        prevPage:
            currentPage <= totalPages && currentPage !== 1
                ? currentPage - 1
                : null,
    };
};
