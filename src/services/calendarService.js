import { google } from 'googleapis';
import { config } from '../config/env.js';
import { fetchTimetable } from './untisService.js';
import { mapLessonToEvent } from '../utils/eventMapper.js';
import { mergeConsecutiveEvents } from '../utils/eventMerger.js';

const ICAL_SOURCE_TAG = 'icsuntis';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

const serviceAccountCredentials = parseServiceAccountJson(config.google.serviceAccountJson);

const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountCredentials,
    scopes: [CALENDAR_SCOPE]
});

const calendarClient = google.calendar({
    version: 'v3',
    auth
});

export async function generateCalendar() {
    console.log('Syncing timetable to Google Calendar...');

    const timetable = await fetchTimetable();
    const events = timetable.map(mapLessonToEvent);
    const mergedEvents = mergeConsecutiveEvents(events);
    const googleEvents = mergedEvents.map(mapToGoogleEvent);

    await removeManagedEvents();
    await createEvents(googleEvents);

    console.log(`Google Calendar updated successfully with ${googleEvents.length} events`);
}

function parseServiceAccountJson(rawJson) {
    try {
        return JSON.parse(rawJson);
    } catch (error) {
        throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: ${error.message}`);
    }
}

async function removeManagedEvents() {
    let pageToken;

    do {
        const { data } = await calendarClient.events.list({
            calendarId: config.google.calendarId,
            privateExtendedProperty: [`source=${ICAL_SOURCE_TAG}`],
            showDeleted: false,
            singleEvents: true,
            pageToken
        });

        const managedEvents = data.items || [];
        for (const event of managedEvents) {
            await calendarClient.events.delete({
                calendarId: config.google.calendarId,
                eventId: event.id
            });
        }

        pageToken = data.nextPageToken;
    } while (pageToken);
}

async function createEvents(events) {
    for (const event of events) {
        await calendarClient.events.insert({
            calendarId: config.google.calendarId,
            requestBody: event
        });
    }
}

function mapToGoogleEvent(event) {
    const startDate = createDateFromArray(event.start);
    const endDate = createDateFromArray(event.end);

    return {
        summary: event.title,
        location: event.location,
        description: event.description,
        start: {
            dateTime: startDate.toISOString(),
            timeZone: config.calendar.timezone
        },
        end: {
            dateTime: endDate.toISOString(),
            timeZone: config.calendar.timezone
        },
        extendedProperties: {
            private: {
                source: ICAL_SOURCE_TAG,
                sourceUid: event.uid
            }
        }
    };
}

function createDateFromArray([year, month, day, hours, minutes]) {
    return new Date(year, month - 1, day, hours, minutes);
}
