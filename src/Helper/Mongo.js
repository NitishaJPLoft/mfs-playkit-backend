export const paginationResult = async (
    query = {},
    Model,
    currentPage = 1,
    limit = 10,
    params,
    populate,
    sort
) => {
    query = query ? query : {};
    // Find list of documents with skip, limit and sort parameters
    const result = await Model.find(query, params)
        .populate(populate)
        .skip(limit * (currentPage - 1))
        .limit(limit)
        .sort(sort ? sort : {updatedAt: -1});

    // Count no. of documents
    const totalCount = await Model.countDocuments(query);
    return {
        result,
        totalCount,
    };
};
