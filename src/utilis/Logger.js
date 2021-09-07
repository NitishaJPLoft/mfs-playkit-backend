import winston, { createLogger, format } from 'winston';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Check Node ENVIRONMENT
 */
const ENVIRONMENT = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';

/**
 * Logger Options
 */
const options = {
    format: format.combine(
        format.label({
            label: ENVIRONMENT,
        }),
        format.colorize(),
        format.timestamp({
            format: 'DD-MM-YYYY HH:mm:ss',
        }),
        format.printf(
            info =>
                ` [${info.timestamp}] [${info.label}] ${info.level} =>  ${info.message}`
        )
    ),
    transports: [
        new winston.transports.Console({
            level: ENVIRONMENT === 'production' ? 'error' : 'debug',
        }),
        new winston.transports.File({ filename: 'debug.log', level: 'debug' }),
    ],
};

const logger = createLogger(options);

export default logger;
