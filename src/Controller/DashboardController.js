import RoleModel from '../Models/Role';
import UserModel from '../Models/User';
import ClassModel from '../Models/Class';
import StudentModel from '../Models/Student';
import TResultModel from '../Models/TrainingResult';
import AssessmentModel from '../Models/Assessment';
import {buildResult} from '../Helper/RequestHelper';
import Common from '../DbController/CommonDbController';
import CommonService from '../Service/CommonService';

/**
 *  Dashboard Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */
class DashboardController {

    /**
     * Find details of user dashboard
     */
    mainDetails = async (req, res) => {
        try {
            const {_id, role} = req.user;
            let query = {isDeleted: false};
            let userCount, label1, completeCount, label2;
            if (role.name === 'practitioner') {
                // Dashboard data for practitioner
                label1 = "NUMBER OF PARTICIPANTS";
                // Total classes of the logged in practitioner
                const classes = await Common.list(ClassModel, {practitioner: _id, isDeleted: false}, ['_id']);
                if (classes && classes.length) {
                    const classIds = [];
                    for (let obj of classes) {
                        obj = obj.toObject();
                        classIds.push(obj._id);
                    }
                    // Total students of practitioner's classes
                    userCount = await Common.count(StudentModel, {class: {$in: classIds}, isDeleted: false});
                }
                label2 = "NUMBER OF ASSESSMENTS COMPLETED";
                // Total assessed students by that practitioner
                completeCount = await Common.count(AssessmentModel, {$or: [{createdBy: _id}, {updatedBy: _id}]});
            } else {
                // Dashboard data for other users except practitioner
                if (role.name !== 'superadmin' && role.name !== 'globaladmin') {
                    const userIds = [_id];
                    // find users under logged in user
                    const ids = await CommonService.findUsers(UserModel, {$or: [{createdBy: {$in: userIds}}, {updatedBy: {$in: userIds}}]}, ['_id', 'role'], {
                        path: 'role',
                        select: 'name'
                    }, role.name);
                    const allIds = [...userIds, ...ids];
                    query['$or'] = [{createdBy: {$in: allIds}}, {updatedBy: {$in: allIds}}];
                }
                // id of practitioner role
                const roleData = await Common.findSingle(RoleModel, {name: 'practitioner'}, ['_id']);
                query['role'] = roleData._id;
                label1 = "NUMBER OF PRACTIONERS";
                // Find count for all practitoners under that user
                userCount = await Common.count(UserModel, query);
                label2 = "NUMBER OF TRAININGS COMPLETED";
                // Find count for those users who have completed their training
                completeCount = await Common.count(TResultModel, {status: 'Completed'});
            }
            const dashboardData = [{label: label1, count: userCount}, {label: label2, count: completeCount}];
            return buildResult(res, 200, dashboardData);
        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };
}

export default new DashboardController();
