import Common from '../DbController/CommonDbController';

/**
 * Reused methods throughout the application
 */
class CommonService {
    /**
     * Find assessed students of selected class for given task
     * @param {object} Model - Database schema to run query
     * @param {string} task - Id of task
     * @param {object} set - object containing all the filters
     * @param {object} ClassModel - DB Schema of Class Model
     * @param {object} StudentModel - DB Schema of Student Model
     */
    findAssessedStudents = async (Model, task, set, ClassModel, StudentModel) => {
        try {
            const query = {task};
            let classes, student;
            // Creating query according to given filters
            if (set.student === 'All') {
                if (set.students && set.students.length) {
                    query.student = {$in: set.students}
                }
                if (set.class && set.class.length) {
                    query.class = {$in: set.class};
                }
                // Finding Class Name of selected class id
                classes = await Common.list(ClassModel, {_id: {$in: set.class}}, ['name']);
            } else {
                query.student = set.student;
                // Finding Name of selected student id
                student = await Common.list(StudentModel, {_id: set.student}, ['firstName', 'lastName']);
            }

            if (set.assessDate) {
                query.createdAt = set.assessDate;
            }

            // Finding average of details (head, arms, legs, body) of selected students
            const average = (list, field) => {
                let sum = 0;
                for (let obj of list) {
                    sum += obj[field];
                }
                return (sum / list.length).toFixed(2);
            };
            const params = ['head', 'arms', 'legs', 'body'];

            // Find list of Assessments
            const result = await Common.list(Model, query, params);

            return {
                head: average(result, 'head'),
                arms: average(result, 'arms'),
                legs: average(result, 'legs'),
                body: average(result, 'body'),
                assessDate: set.assessDate,
                classes,
                student
            };

        } catch (err) {
            return err;
        }
    };

    /**
     * Find ids from the array of objects of given schema
     * @param {object} Model - Database schema to run query
     * @param {object} query - condition
     * @param {array} params - parameters which need to get from DB
     */
    findIds = async (Model, query, params) => {
        // Finding list of given schema for the given query
        const data = await Common.list(Model, query, params);
        const ids = [];
        for (let obj of data) {
            obj = obj.toObject();
            ids.push(obj[params]);
        }
        return ids;
    };

    /**
     * Find ids of all the users under the logged in user
     * @param {object} Model - Database schema to run query
     * @param {object} query - condition
     * @param {array} params - parameters which need to get from DB
     * @param {array} populate - query for finding data from referenced schema
     * @param {object} role - role object having id and name in its object
     */
    findUsers = async (Model, query, params, populate, role) => {
        // Finding list of all the users of specific condition
        const adminUsers = await Common.list(Model, query, params, populate);
        const mIds = [], pcIds = [], pIds = [];
        if (role === 'admin' && adminUsers && adminUsers.length) {
            for (let obj of adminUsers) {
                obj = obj.toObject();
                if (obj.role.name === 'manager') {
                    mIds.push(obj._id);
                } else if (obj.role.name === 'programcordinator') {
                    pcIds.push(obj._id);
                } else if (obj.role.name === 'practitioner') {
                    pIds.push(obj._id);
                }
            }
        }
        if ((mIds && mIds.length) || role.name === 'manager') {
            const query1 = (mIds && mIds.length) ? {$or: [{createdBy: {$in: mIds}}, {updatedBy: {$in: mIds}}]} : query;
            // Finding list of all the users of specific condition
            const managerUsers = await Common.list(Model, query1, params, populate);
            if (managerUsers && managerUsers.length) {
                for (let obj of managerUsers) {
                    obj = obj.toObject();
                    if (obj.role.name === 'programcordinator') {
                        pcIds.push(obj._id);
                    } else if (obj.role.name === 'practitioner') {
                        pIds.push(obj._id);
                    }
                }
            }
        }
        if ((pcIds && pcIds.length) || role.name === 'programcordinator') {
            const query1 = (pcIds && pcIds.length) ? {$or: [{createdBy: {$in: pcIds}}, {updatedBy: {$in: pcIds}}]} : query;
            // Finding list of all the users of specific condition
            const pcUsers = await Common.list(Model, query1, params);
            if (pcUsers && pcUsers.length) {
                for (let obj of pcUsers) {
                    obj = obj.toObject();
                    pIds.push(obj._id);
                }
            }
        }
        // Getting all the users which are under the logged in user
        return [...mIds, ...pcIds, ...pIds];
    };

    /**
     * Find given time to specific date format
     * @param {string} time in milliseconds
     */
    convertTimeToDate = async (time) => {
        const date = new Date(time);
        const year = date.getFullYear();
        let month = parseInt(date.getMonth(), 10) + 1;
        month = month < 10 ? '0' + month : month;
        let day = parseInt(date.getDate(), 10);
        day = day < 10 ? '0' + day : day;
        return day + '-' + month + '-' + year;
    };

    /**
     * Check the email existence in existing entries of DB and given array (list)
     * @param {object} Model - Database schema to run query
     * @param {string} email
     * @param {array} list
     */
    checkEmailExistence = async (Model, email, list) => {
        let isEmailExist = false;
        if (list && list.length) {
            // Check existence of given email in array
            const entryIndex = list.findIndex(x => x.email === email);
            if (entryIndex > -1) {
                isEmailExist = true;
            } else {
                // Check existence of given email in DB
                const isEmailExists = await Common.findSingle(Model, {
                    email,
                    isDeleted: false
                }, ['_id']);
                if (isEmailExists) {
                    isEmailExist = true;
                }
            }
        } else {
            // Check existence of given email in DB
            const isEmailExists = await Common.findSingle(Model, {
                email,
                isDeleted: false
            }, ['_id']);
            if (isEmailExists) {
                isEmailExist = true;
            }
        }
        return isEmailExist;
    };

    /**
     * Finding Tasks which satisfy given condition
     * @param {object} Model - Database schema to run query
     * @param {object} query - Condition
     */
    findTasks = async (Model, query) => {
        const populateFields = [{path: 'phase', select: 'name'}, {path: 'movementType', select: 'name'}];
        // Finding tasks
        const tasks = await Common.list(Model, query, ['name', 'phase', 'movementType'], populateFields);
        if (tasks && tasks.length) {
            for (const i in tasks) {
                if (tasks.hasOwnProperty(i)) {
                    tasks[i] = tasks[i].toObject();
                    tasks[i].displayName = `${tasks[i].name} - ${tasks[i].phase.name} - ${tasks[i].movementType.name}`;
                }
            }
        }
        return tasks;
    }
}

export default new CommonService();