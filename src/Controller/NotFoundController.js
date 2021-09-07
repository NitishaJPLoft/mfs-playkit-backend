import constants from '../../resources/constants';

class NotFoundController {
    /**
     * Not Found Page
     */
    for0For = (req, res) => {
        // Send 404 if any route not exists
        res.status(404).json({
            status: 404,
            message: req.t(constants.ROUTE_NOT_EXISTS),
        });
    };
}

export default new NotFoundController();
