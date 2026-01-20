import fs from 'fs';
import path from 'path';
import { createEvents } from 'ics';
import { fetchTimetable } from './untisService.js';
import { mapLessonToEvent } from '../utils/eventMapper.js';
import { mergeConsecutiveEvents } from '../utils/eventMerger.js';

const ICAL_FILE_PATH = path.join(process.cwd(), 'timetable.ics');

let lastModified = new Date();

export async function generateCalendar() {
    console.log('Generating iCal file...');

    const timetable = await fetchTimetable();
    const events = timetable.map(mapLessonToEvent);
    const mergedEvents = mergeConsecutiveEvents(events);

    const calendarOptions = {
        productId: '//ICSUntis//Timetable Calendar//EN',
        method: 'PUBLISH'
    };

    return new Promise((resolve, reject) => {
        createEvents(mergedEvents, calendarOptions, (error, value) => {
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
}

export function getCalendarPath() {
    return ICAL_FILE_PATH;
}

export function getLastModified() {
    return lastModified;
}

export function calendarExists() {
    return fs.existsSync(ICAL_FILE_PATH);
}
