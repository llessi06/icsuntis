import express from 'express';
import { createEvents } from 'ics';
import { WebUntis } from 'webuntis';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3979;
const ICAL_FILE_PATH = path.join(process.cwd(), 'timetable.ics');
const UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Track last modification time for efficient caching
let lastModified = new Date();

// Validate required environment variables
const requiredEnvVars = ['WEBUNTIS_SERVER', 'WEBUNTIS_SCHOOL', 'WEBUNTIS_USERNAME', 'WEBUNTIS_PASSWORD', 'ICAL_SECRET_PATH'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Please create a .env file based on .env.example');
    process.exit(1);
}

// Function to generate and save the iCal file
async function generateICalFile() {
    try {
        console.log('Generating iCal file...');

        const untis = new WebUntis(
            process.env.WEBUNTIS_SCHOOL,
            process.env.WEBUNTIS_USERNAME,
            process.env.WEBUNTIS_PASSWORD,
            process.env.WEBUNTIS_SERVER
        );

        await untis.login();

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 2);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 2);

        const timetable = await untis.getOwnTimetableForRange(startDate, endDate);
        await untis.logout();

        const events = timetable
            .filter(lesson => lesson.code !== 'cancelled')
            .map(lesson => {
                const dateStr = lesson.date.toString();
                const year = parseInt(dateStr.slice(0, 4));
                const month = parseInt(dateStr.slice(4, 6));
                const day = parseInt(dateStr.slice(6, 8));

                const startHour = Math.floor(lesson.startTime / 100);
                const startMinute = lesson.startTime % 100;
                const endHour = Math.floor(lesson.endTime / 100);
                const endMinute = lesson.endTime % 100;

                const subjects = lesson.su.map(subject => subject.longname).join(', ');
                const rooms = lesson.ro ? lesson.ro.map(room => room.name).join(', ') : 'No room specified';
                const teachers = lesson.te ? lesson.te.map(teacher => teacher.longname).join(', ') : 'No teacher specified';

                const inf = lesson.info ? `\n\nInfo: ${lesson.info || ''}` : '';
                const fullinfo = `Teacher: ${teachers}${inf}`;

                return {
                    start: [year, month, day, startHour, startMinute],
                    startInputType: 'local',
                    startOutputType: 'local',
                    end: [year, month, day, endHour, endMinute],
                    endInputType: 'local',
                    endOutputType: 'local',
                    title: subjects || 'Stunde',
                    location: rooms,
                    description: fullinfo,
                };
            });

        const mergedEvents = [];
        for (let i = 0; i < events.length; i++) {
            const currentEvent = events[i];
            const nextEvent = events[i + 1];

            if (
                nextEvent &&
                currentEvent.title === nextEvent.title &&
                currentEvent.location === nextEvent.location &&
                currentEvent.description === nextEvent.description &&
                currentEvent.start[0] === nextEvent.start[0] && // Same year
                currentEvent.start[1] === nextEvent.start[1] && // Same month
                currentEvent.start[2] === nextEvent.start[2] && // Same day
                currentEvent.end[3] === nextEvent.start[3] && // End hour equals next start hour
                currentEvent.end[4] === nextEvent.start[4] // End minute equals next start minute
            ) {
                mergedEvents.push({
                    ...currentEvent,
                    end: nextEvent.end,
                    endInputType: nextEvent.endInputType,
                    endOutputType: nextEvent.endOutputType
                });
                i++; // Skip the next event
            } else {
                mergedEvents.push(currentEvent);
            }
        }

        return new Promise((resolve, reject) => {
            createEvents(mergedEvents, (error, value) => {
                if (error) {
                    console.error('Error during calendar creation:', error);
                    reject(error);
                    return;
                }

                fs.writeFileSync(ICAL_FILE_PATH, value);
                lastModified = new Date();
                console.log(`iCal file updated successfully at ${lastModified.toLocaleString()}`);
                resolve();
            });
        });
    } catch (error) {
        console.error('Error when generating iCal file:', error);
        throw error;
    }
}

// Root route - redirect to GitHub
app.get('/', (req, res) => {
    res.redirect('https://github.com/llessi06/icsuntis');
});

// Function to serve the iCal file with proper headers
function serveICalFile(req, res) {
    if (!fs.existsSync(ICAL_FILE_PATH)) {
        return res.status(503).send('iCal file not yet generated. Please wait a moment and try again.');
    }

    // Set proper headers for calendar subscription services (Google Calendar, Apple Calendar, etc.)
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="timetable.ics"');
    res.setHeader('Cache-Control', 'max-age=600, must-revalidate'); // 10 minutes cache
    res.setHeader('Last-Modified', lastModified.toUTCString());
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for calendar apps

    // Support for conditional requests (If-Modified-Since)
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince && new Date(ifModifiedSince) >= lastModified) {
        return res.status(304).end(); // Not Modified
    }

    res.sendFile(ICAL_FILE_PATH);
}

// Secret routes to serve the iCal file (with and without .ics extension)
app.get(`/${process.env.ICAL_SECRET_PATH}`, serveICalFile);
app.get(`/${process.env.ICAL_SECRET_PATH}.ics`, serveICalFile);

// Support HEAD requests for calendar apps that check for updates
app.head(`/${process.env.ICAL_SECRET_PATH}`, (req, res) => {
    if (!fs.existsSync(ICAL_FILE_PATH)) {
        return res.status(503).end();
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Last-Modified', lastModified.toUTCString());
    res.setHeader('Cache-Control', 'max-age=600, must-revalidate');
    res.status(200).end();
});

app.head(`/${process.env.ICAL_SECRET_PATH}.ics`, (req, res) => {
    if (!fs.existsSync(ICAL_FILE_PATH)) {
        return res.status(503).end();
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Last-Modified', lastModified.toUTCString());
    res.setHeader('Cache-Control', 'max-age=600, must-revalidate');
    res.status(200).end();
});

// Start the server
app.listen(port, async () => {
    console.log(`ICSUntis running on http://localhost:${port}`);
    console.log(`iCal file will be available at: http://localhost:${port}/${process.env.ICAL_SECRET_PATH}`);
    console.log('Generating initial iCal file...');

    // Generate the iCal file immediately on startup
    try {
        await generateICalFile();
    } catch (error) {
        console.error('Failed to generate initial iCal file:', error);
    }

    // Schedule periodic updates every 10 minutes
    setInterval(async () => {
        try {
            await generateICalFile();
        } catch (error) {
            console.error('Failed to update iCal file:', error);
        }
    }, UPDATE_INTERVAL);

    console.log(`iCal file will be updated every ${UPDATE_INTERVAL / 1000 / 60} minutes`);
});
