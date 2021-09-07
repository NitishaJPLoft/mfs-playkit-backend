import {validationResult} from 'express-validator';
import {verify, decode} from 'jsonwebtoken';
import UserModel from '../Models/User';
import {compareSync, hashSync} from 'bcryptjs';
import {buildResult} from '../Helper/RequestHelper';
import {generateToken} from '../Helper/JWT';
import constants from '../../resources/constants';
import Common from '../DbController/CommonDbController';

/**
 *  Auth Controller Class
 *  @author Nitisha Khandelwal <nitisha.khandelwal@jploft.in>
 */

const params = ['_id', 'firstName', 'lastName', 'role', 'password', 'firstLoggedIn', 'isDeleted'];

class AuthController {
    /**
     * Login Method
     */
    login = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {email, password} = req.body;
            // Check whether email and password exists
            if (!email || !password)
                return buildResult(res, 400, {}, {}, {message: req.t(constants.INADEQUATE_DATA)});
            // Get user details
            const populateField = {path: 'role', select: 'name'};
            const user = await Common.findSingle(UserModel, {email, isDeleted: false}, params, populateField);
            // Returns error if email not exists in DB
            if (!user) return buildResult(res, 400, {}, {}, {message: req.t(constants.NO_MATCH_WITH_EMAIL)});

            // Returns error if user is deleted
            if (user.isDeleted) return buildResult(res, 400, {}, {}, {message: req.t(constants.ACCOUNT_NOT_EXISTS)});

            // Returns error if user is not activated
            if (!user.firstLoggedIn) return buildResult(res, 400, {}, {}, {message: req.t(constants.ACTIVATE_ACCOUNT)});

            // Check whether password is correct
            if (!compareSync(password.toString(), user.password))
                return buildResult(res, 400, {}, {}, {message: req.t(constants.INVALID_DETAILS)});

            // Generate token
            const token = generateToken(user._id, {role: user.role, name: user.firstName + ' ' + user.lastName, email: user.email});
            // send response
            const result = {
                message: req.t(constants.LOGIN_SUCCESS),
                token
            };
            return buildResult(res, 200, result);

        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    };

    /**
     * Login method for the first time to set the password
     */
    firstLogin = async (req, res) => {
        try {
            // Errors of the express validators from route
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const error = errors.array();
                return res.status(400).json(error);
            }
            const {token, password} = req.body;
            const appSecret = process.env.JWT_SECRET;
            const isTokenVerified = verify(token, appSecret); // verify token
            // Check whether token is verified
            if (!isTokenVerified)
                return buildResult(res, 401, {}, {}, {message: req.t(constants.INVALID_TOKEN)});

            const decodedToken = decode(token); // decode
            const {email, firstName, lastName} = decodedToken;

            // Check whether the request details are proper
            if (!firstName || !lastName || !email || !password)
                return buildResult(res, 400, {}, {}, {message: req.t(constants.INADEQUATE_DATA)});

            // Find User detail
            const populateField = {path: 'role', select: 'name'};
            const query = {firstName, lastName, email, isDeleted: false};
            const user = await Common.findSingle(UserModel, query, params, populateField);

            // Check whether user with this email exists
            if (!user) return buildResult(res, 404, {}, {}, {message: req.t(constants.NO_MATCH_WITH_EMAIL_OR_NAME)});

            // Check whether user is activated or not
            if (user.firstLoggedIn) {
                return buildResult(res, 400, {}, {}, {message: req.t(constants.PASSWORD_ALREADY_SET)});
            } else {
                const hashedPassword = hashSync(password.toString()); // Encrypt password
                // Set password for the user
                await Common.update(UserModel, {_id: user._id}, {password: hashedPassword, firstLoggedIn: true});

                // Generate token
                const token = generateToken(user._id, {role: user.role, name: user.firstName + ' ' + user.lastName});
                // Send response
                const result = {
                    message: req.t(constants.LOGIN_SUCCESS),
                    token,
                };
                return buildResult(res, 200, result);
            }

        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, error);
        }
    }
}

export default new AuthController();
