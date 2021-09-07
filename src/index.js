import express from 'express';
import cors from 'cors';
import path from 'path';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import morgan from 'morgan';
import i18next from 'i18next';
import Backend from 'i18next-node-fs-backend';
import i18nextMiddleware from 'i18next-express-middleware';
import fs from 'fs';
import logger from './utilis/Logger'; // logger
import router from './routes'; //routes
import './utilis/Db';
import NotFoundController from './Controller/NotFoundController';
// dotenv configuration
fs.existsSync('.env')
    ? dotenv.config({ path: '.env' })
    : logger.error(
          'can not find .env file. Please make sure .env file is present'
      );

i18next
    .use(Backend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
        backend: {
            loadPath: __dirname + '/../resources/locales/{{lng}}/{{ns}}.json'
        },
        fallbackLng: 'en',
        preload: ['en', 'es']
    });

// Create Express server
const app = express();

app.use(i18nextMiddleware.handle(i18next));

/** Get port from environment and store in Express. */
const port = process.env.PORT || '5000';
const host = process.env.HOST || 'localhost';
app.set('port', port);
app.disable('x-powered-by');

// apply middlewares
app.use(
    bodyParser.json({limit: '1024mb'}),
    bodyParser.urlencoded({
        limit: '1024mb',
        extended: true
    }),
    cors(),
    morgan('dev')
);

app.use(express.static(path.join(__dirname, '..', 'uploads')));

const distDir = '../front-end/dist/';

app.use(express.static(path.join(__dirname, distDir)));

app.use('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, distDir + '/index.html'));
});

app.use('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, distDir + '/index.html'));
});

app.use('/index', (req, res) => {
    res.sendFile(path.join(__dirname, distDir + '/index.html'));
});

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    res.setHeader("Content-Security-Policy", "default-src 'self';script-src 'self'; img-src 'self' blob: data:; " +
        "media-src 'self' data:;frame-ancestors http://* https://*  'unsafe-inline' 'unsafe-eval';font-src 'self' data:;connect-src 'self';style-src 'self'; object-src 'self' blob:;");

    next();
});

// remove sound from video
//ffmpeg -i $input_file -c copy -an $output_file
// routing
app.use(router);
// error handling for non exsistent routes
app.all('*', NotFoundController.for0For);
// app.get('*', NotFoundController.for0For);

app.listen(port, () => {
    console.log(`Listening on port:: ${host}:${port}/`);
});
