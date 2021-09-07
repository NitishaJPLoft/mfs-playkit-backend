export const buildResult = (res, status, result, pagination = {}, error) => {
    if (error) {
        // Generate error response
        return res.status(status).json({
            status,
            message: 'error',
            data: {
                message: error.message,
                pagination
            }
        });
    } else {
        // Generate success response
        return res.status(status).json({
            status,
            message: 'success',
            data: {
                result,
                pagination
            }
        });
    }
};
