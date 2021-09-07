import { sign } from 'jsonwebtoken';

/**
 * generate jwt token
 * @param {string} uid  - uid
 * @param {string} scope  - user/admin
 */
export const generateToken = (uid, scope) => {
    // Generate JWT token
    const appSecret = process.env.JWT_SECRET;
    return sign(
        {
            uid,
            scope,
        },
        appSecret,
        // { expiresIn: 2 * 60 * 60}
    );
};

export const generateTokenForFirstLogin = (email, firstName, lastName) => {
    // Generate JWT token for first login
    const appSecret = process.env.JWT_SECRET;
    return sign(
        {
            email,
            firstName,
            lastName
        },
        appSecret
    );
};
