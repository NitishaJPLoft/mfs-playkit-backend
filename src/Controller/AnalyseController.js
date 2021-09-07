import AssessmentModel from '../Models/Assessment';
import TResultModel from '../Models/TrainingResult';
import TaskModel from '../Models/Task';
import StudentModel from '../Models/Student';
import UserModel from '../Models/User';
import ClassModel from '../Models/Class';
import {buildResult} from '../Helper/RequestHelper';
import Common from '../DbController/CommonDbController';
import CommonService from '../Service/CommonService';

/**
 *  Analyse Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */
class AnalyseController {
    /**
     * find tasks which are analysed
     */
    assessedTasks = async (req, res) => {
        try {
            const {isReliable} = req.query;
            const reliable = isReliable === 'true';
            // Find the tasks for reliable users
            if (reliable) {
                // Find distinct practitioners who have taken Assessments
                const userList = await Common.distinct(AssessmentModel, 'practitioner');
                if (userList && userList.length) {
                    // Find Reliable Users
                    const reliableUsers = await Common.list(TResultModel, {
                        user: {$in: userList},
                        rating: 'Reliable'
                    }, ['user']);
                    if (reliableUsers && reliableUsers.length) {
                        const relIds = [];
                        for (let obj of reliableUsers) {
                            obj = obj.toObject();
                            relIds.push(obj.user);
                        }
                        // Finding Assessments done by reliable practitioners
                        const assessments = await Common.list(AssessmentModel, {practitioner: {$in: relIds}}, ['task']);
                        if (assessments && assessments.length) {
                            const taskIds = [];
                            for (let data of assessments) {
                                data = data.toObject();
                                taskIds.push(data.task);
                            }
                            // Find Tasks assessed by Reliable practitioners
                            const tasks = await CommonService.findTasks(TaskModel, {_id: {$in: taskIds}});
                            return buildResult(res, 200, tasks);
                        } else
                            return buildResult(res, 200, []);
                    } else
                        return buildResult(res, 200, []);
                } else
                    return buildResult(res, 200, []);
            } else {
                // Find distinct task ids
                const list = await Common.distinct(AssessmentModel, 'task');
                if (list && list.length) {
                    // Finding task list of distinct task ids
                    const tasks = await CommonService.findTasks(TaskModel, {_id: {$in: list}});
                    return buildResult(res, 200, tasks);
                } else
                    return buildResult(res, 200, []);
            }
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * find assessed classes of given task
     */
    assessedClasses = async (req, res) => {
        try {
            const {id} = req.params;
            const populateFields = {path: 'class', select: 'name'};
            const query = {task: id};
            const {_id, role} = req.user;

            const userIds = [_id];
            // find all the practitioners who are under the logged in user
            if (role.name !== 'superadmin' && role.name !== 'globaladmin') {
                if (role.name !== 'practitioner') {
                    const ids = await CommonService.findUsers(UserModel, {$or: [{createdBy: {$in: userIds}}, {updatedBy: {$in: userIds}}]}, ['_id', 'role'], {
                        path: 'role',
                        select: 'name'
                    }, role.name);
                    const allIds = [...userIds, ...ids];
                    query['$or'] = [{createdBy: {$in: allIds}}, {updatedBy: {$in: allIds}}, {practitioner: {$in: allIds}}];
                } else {
                    query['$or'] = [{createdBy: {$in: userIds}}, {updatedBy: {$in: userIds}}, {practitioner: {$in: userIds}}];
                }
            }

            // Finding all the assessments which are performed on the given class by all the practitioners under logged in user
            const list = await Common.list(AssessmentModel, query, ['class'], populateFields);
            const classes = [];
            if (list && list.length) {
                for (const obj of list) {
                    classes.push(obj.class);
                }
            }
            // Sending unique classes in response
            return buildResult(res, 200, [...new Set(classes)]);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * find assessed students of selected class for given task
     */
    totalStudents = async (req, res) => {
        try {
            // Method to calculate age by the DOB
            const _calculateAge = (dob) => { // birthday is a date
                const ageDifMs = Date.now() - new Date(dob).getTime();
                const ageDate = new Date(ageDifMs); // miliseconds from epoch
                return Math.abs(ageDate.getUTCFullYear() - 1970);
            };
            const {classIds, task} = req.body;
            const populateFields = {path: 'student', select: 'firstName lastName'};

            // Finding list of assessed students of seleced class for given task
            const list = await Common.list(AssessmentModel, {
                class: {$in: classIds},
                task
            }, ['student', 'date', 'createdAt'], populateFields);
            const students = await Common.list(StudentModel, {class: {$in: classIds}, isDeleted: false}, ['firstName', 'lastName', 'dob', 'gender']);
            const arr = [];
            if (list && list.length) {
                for (let obj of list) {
                    obj = obj.toObject();
                    obj.assessDates = [];
                    const index = arr.map((e) => {
                        return e.student._id.toString();
                    }).indexOf(obj.student._id.toString());
                    if (index > -1) {
                        arr[index].assessDates.push(obj.createdAt);
                    } else {
                        obj.assessDates.push(obj.createdAt);
                        arr.push(obj);
                    }
                    delete obj.date;
                }
            }
            const assessedStudents = [];
            // Rearrange students with age and assessDates
            if (students && students.length) {
                students.forEach(obj => {
                    obj = obj.toObject();
                    obj.assessDates = [];
                    const index = arr.map((e) => {
                        return e.student._id.toString();
                    }).indexOf(obj._id.toString());
                    obj.age = _calculateAge(obj.dob);
                    delete obj.dob;
                    if (index > -1) {
                        obj.assessDates = arr[index].assessDates;
                        assessedStudents.push(obj);
                    }
                });
            }
            return buildResult(res, 200, assessedStudents);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Find avg details of assessed students to compare
     */
    compareData = async (req, res) => {
        try {
            const {task, _set1, _set2} = req.body;

            let dataSet1 = {};
            // Check whether the set 1 exists
            if (_set1 && Object.keys(_set1).length) {
                // Finding avg of assessed students details
                dataSet1 = await CommonService.findAssessedStudents(AssessmentModel, task, _set1, ClassModel, StudentModel);
            }

            let dataSet2 = {};
            // check whether the set 2 exists
            if (_set2 && Object.keys(_set2).length) {
                // Finding avg of assessed students details
                dataSet2 = await CommonService.findAssessedStudents(AssessmentModel, task, _set2, ClassModel, StudentModel);
            }

            // Finding task name
            const taskData = await Common.findById(TaskModel, task, ['name']);

            return buildResult(res, 200, {task: taskData.name, dataSet1, dataSet2});
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };
}

export default new AnalyseController();
