import constants from '../../resources/constants';

// DB Queries
class CommonDbController {
    // Create query
    create = async (model, data) => {
        return await new model({...data}).save();
    };

    // Query for multiple insert
    multipleInsert = async (model ,data) => {
        return await model.insertMany(data);
    };

    // Query for list of data
    list = async (model, query, params, populate, sort) => {
        if (populate) {
            return await model.find(query, params).populate(populate).sort(sort ? sort : {updatedAt: 1});
        } else {
            return await model.find(query, params).sort(sort ? sort : {updatedAt: 1});
        }
    };

    // Query to find data by id
    findById = async (model, query, params = [], populate) => {
        if (populate) {
            return await model.findById(query, params).populate(populate);
        } else {
            return await model.findById(query, params);
        }
    };

    // Query to find single data
    findSingle = async (model, query, params = [], populate) => {
        if (populate) {
            return await model.findOne(query, params).populate(populate);
        } else {
            return await model.findOne(query, params);
        }
    };

    // Query to update data
    update = async (model, query, data) => {
        await model.updateMany(query, {$set: {...data}}, {multi: true});
        return {message: constants.UPDATED};
    };

    // Query to count the data
    count = async (model, query) => {
        return await model.countDocuments(query);
    };

    // Query to get distinct entries
    distinct = async (model, fieldName) => {
        return await  model.find().distinct(fieldName);
    }
}

export default new CommonDbController();