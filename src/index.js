import express from 'express';
import { config } from './config/env.js';
import { generateCalendar, getCalendarPath, getLastModified, calendarExists } from './services/calendarService.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();

app.use(requestLogger);

function serveCalendar(req, res) {
    if (!calendarExists()) {
        return res.status(503).send('iCal file not yet generated. Please wait a moment and try again.');
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="timetable.ics"');
    res.setHeader('Cache-Control', 'max-age=600, must-revalidate');
    res.setHeader('Last-Modified', getLastModified().toUTCString());
    res.setHeader('Access-Control-Allow-Origin', '*');

    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince && new Date(ifModifiedSince) >= getLastModified()) {
        return res.status(304).end();
    }

    res.sendFile(getCalendarPath());
}

function handleCalendarHead(req, res) {
    if (!calendarExists()) {
        return res.status(503).end();
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Last-Modified', getLastModified().toUTCString());
    res.setHeader('Cache-Control', 'max-age=600, must-revalidate');
    res.status(200).end();
}

app.get('/', (req, res) => {
    res.redirect('https://github.com/llessi06/icsuntis');
});

app.get(`/${config.calendar.secretPath}`, serveCalendar);
app.get(`/${config.calendar.secretPath}.ics`, serveCalendar);

app.head(`/${config.calendar.secretPath}`, handleCalendarHead);
app.head(`/${config.calendar.secretPath}.ics`, handleCalendarHead);

async function startServer() {
    app.listen(config.server.port, async () => {
        console.log(`ICSUntis running on http://localhost:${config.server.port}`);
        console.log(`iCal file will be available at: http://localhost:${config.server.port}/${config.calendar.secretPath}`);
        console.log('Generating initial iCal file...');

        try {
            await generateCalendar();
        } catch (error) {
            console.error('Failed to generate initial iCal file:', error);
        }

        setInterval(async () => {
            try {
                await generateCalendar();
            } catch (error) {
                console.error('Failed to update iCal file:', error);
            }
        }, config.calendar.updateInterval);

        console.log(`iCal file will be updated every ${config.calendar.updateInterval / 1000 / 60} minutes`);
    });
}

startServer();
