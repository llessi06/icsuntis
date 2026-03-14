import { google } from 'googleapis';
import { config } from '../config/env.js';
import { fetchTimetable } from './untisService.js';
import { mapLessonToEvent } from '../utils/eventMapper.js';
import { mergeConsecutiveEvents } from '../utils/eventMerger.js';

const ICAL_SOURCE_TAG = 'icsuntis';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const MAX_RATE_LIMIT_RETRIES = 5;

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
    const existingEventsByUid = await listManagedEventsByUid();

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    const targetUids = new Set();
    for (const event of googleEvents) {
        const sourceUid = event.extendedProperties.private.sourceUid;
        targetUids.add(sourceUid);

        const existingEvent = existingEventsByUid.get(sourceUid);
        if (!existingEvent) {
            await createEvent(event);
            inserted++;
            continue;
        }

        if (isSameEvent(existingEvent, event)) {
            continue;
        }

        await updateEvent(existingEvent.id, event);
        updated++;
    }

    for (const [sourceUid, existingEvent] of existingEventsByUid.entries()) {
        if (targetUids.has(sourceUid)) {
            continue;
        }

        await deleteEvent(existingEvent.id);
        deleted++;
    }

    console.log(
        `Google Calendar sync completed: total=${googleEvents.length}, inserted=${inserted}, updated=${updated}, deleted=${deleted}`
    );
}

function parseServiceAccountJson(rawJson) {
    try {
        return JSON.parse(rawJson);
    } catch (error) {
        throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: ${error.message}`);
    }
}

async function listManagedEventsByUid() {
    const eventByUid = new Map();
    let pageToken;

    do {
        const { data } = await withRateLimitRetry(
            () => calendarClient.events.list({
                calendarId: config.google.calendarId,
                privateExtendedProperty: [`source=${ICAL_SOURCE_TAG}`],
                showDeleted: false,
                singleEvents: true,
                pageToken
            }),
            'list managed events'
        );

        const managedEvents = data.items || [];
        for (const event of managedEvents) {
            const sourceUid = event.extendedProperties?.private?.sourceUid;
            if (sourceUid) {
                eventByUid.set(sourceUid, event);
            }
        }

        pageToken = data.nextPageToken;
    } while (pageToken);

    return eventByUid;
}

async function createEvent(event) {
    await withRateLimitRetry(
        () => calendarClient.events.insert({
            calendarId: config.google.calendarId,
            requestBody: event
        }),
        'insert event'
    );
}

async function updateEvent(eventId, event) {
    await withRateLimitRetry(
        () => calendarClient.events.patch({
            calendarId: config.google.calendarId,
            eventId,
            requestBody: event
        }),
        'update event'
    );
}

async function deleteEvent(eventId) {
    await withRateLimitRetry(
        () => calendarClient.events.delete({
            calendarId: config.google.calendarId,
            eventId
        }),
        'delete event'
    );
}

function isSameEvent(existingEvent, expectedEvent) {
    return (
        existingEvent.summary === expectedEvent.summary &&
        (existingEvent.location || '') === (expectedEvent.location || '') &&
        (existingEvent.description || '') === (expectedEvent.description || '') &&
        existingEvent.start?.dateTime === expectedEvent.start.dateTime &&
        existingEvent.start?.timeZone === expectedEvent.start.timeZone &&
        existingEvent.end?.dateTime === expectedEvent.end.dateTime &&
        existingEvent.end?.timeZone === expectedEvent.end.timeZone
    );
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

async function withRateLimitRetry(operation, contextLabel) {
    let attempt = 0;

    while (true) {
        try {
            return await operation();
        } catch (error) {
            if (!isRetryableRateLimitError(error) || attempt >= MAX_RATE_LIMIT_RETRIES) {
                throw error;
            }

            const delayMs = getRetryDelayMs(attempt);
            attempt++;
            console.warn(`Google API rate limit hit during ${contextLabel}. Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RATE_LIMIT_RETRIES})`);
            await sleep(delayMs);
        }
    }
}

function isRetryableRateLimitError(error) {
    if (!error || (error.code !== 403 && error.code !== 429)) {
        return false;
    }

    const reasons = error.errors?.map(item => item.reason) || [];
    if (reasons.length === 0) {
        const message = String(error.message || '').toLowerCase();
        return message.includes('rate limit') || message.includes('quota');
    }

    return reasons.some(reason => [
        'rateLimitExceeded',
        'userRateLimitExceeded',
        'quotaExceeded'
    ].includes(reason));
}

function getRetryDelayMs(attempt) {
    const exponential = Math.min(1000 * (2 ** attempt), 10000);
    const jitter = Math.floor(Math.random() * 300);
    return exponential + jitter;
}

function sleep(delayMs) {
    return new Promise(resolve => {
        setTimeout(resolve, delayMs);
    });
}
