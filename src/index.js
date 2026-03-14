import express from 'express';
import { config } from './config/env.js';
import { generateCalendar } from './services/calendarService.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();

app.use(requestLogger);

app.get('/', (req, res) => {
    res.redirect('https://github.com/llessi06/icsuntis');
});

async function startServer() {
    app.listen(config.server.port, async () => {
        console.log(`ICSUntis running on http://localhost:${config.server.port}`);
        console.log('Generating initial Google Calendar sync...');

        try {
            await generateCalendar();
        } catch (error) {
            console.error('Failed to run initial Google Calendar sync:', error);
        }

        setInterval(async () => {
            try {
                await generateCalendar();
            } catch (error) {
                console.error('Failed to update Google Calendar:', error);
            }
        }, config.calendar.updateInterval);

        console.log(`Google Calendar will be updated every ${config.calendar.updateInterval / 1000 / 60} minutes`);
    });
}

startServer();
