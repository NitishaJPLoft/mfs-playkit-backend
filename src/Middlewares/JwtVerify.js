import {verify, decode} from 'jsonwebtoken';
import UserModel from '../Models/User';
import Common from '../DbController/CommonDbController';
import constants from '../../resources/constants';
import { buildResult } from '../Helper/RequestHelper';

/**
 *  Extract token from request
 * @param req  express.Request
 */
const extractToken = req => {
    if (req.headers.authorization) {
        const header = req.headers.authorization.split(' ');
        const type = header[0]; // Bearer
        const token = header[1]; // jwt token
        if (type === 'Bearer') {
            return token;
        }
        return null;
    } else if (req.query && req.query.token) {
        return req.query.token;
    }
    return null;
};

/**
 *  jwt verify middleware
 * @param req  express.Request
 * @param res  express.Response
 * @param next  express.NextFunction
 */
const jwtVerify = async (req, res, next) => {
    if (req.query.token || req.headers.authorization) {
        try {
            const token = extractToken(req);
            const appSecret = process.env.JWT_SECRET;
            const isTokenVerified = verify(token, appSecret); // verify token
            // Returns error if token is not valid
            if (!isTokenVerified)
                return buildResult(res, 401, {}, {}, {message: req.t(constants.INVALID_TOKEN)});

            const decodedToken = decode(token); // decode
            const {uid, scope} = decodedToken; // destructure
            // check if valid id
            const populateFields = {path: 'role', select: 'name'};
            // Find details of logged in user
            const user = await Common.findSingle(UserModel, {_id: uid}, ['firstName', 'lastName', 'role'], populateFields);
            // Returns JWT error if user not exists
            if (!user)
                return buildResult(res, 403, {}, {}, {message: req.t(constants.JWT_TOKEN_ERROR)});
            req.token = token;
            req.uid = uid;
            req.scope = scope;
            req.user = user;
            next();

        } catch (error) {
            // Returns unspecified exceptions
            return buildResult(res, 500, {}, {}, {message: error.message});
        }
    } else {
        // Returns error if token not found
        return buildResult(res, 400, {}, {}, {message: req.t(constants.TOKEN_NOT_FOUND)});
    }
};

export default jwtVerify;
