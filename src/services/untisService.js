import { WebUntis } from 'webuntis';
import { config } from '../config/env.js';

export async function fetchTimetable() {
    const untis = new WebUntis(
        config.webuntis.school,
        config.webuntis.username,
        config.webuntis.password,
        config.webuntis.server
    );

    await untis.login();

    const startDate = getStartDate();
    const endDate = getEndDate();

    const timetable = await untis.getOwnTimetableForRange(startDate, endDate);
    await untis.logout();

    return timetable.filter(lesson => lesson.code !== 'cancelled');
}

function getStartDate() {
    const date = new Date();
    date.setMonth(date.getMonth() - 2);
    return date;
}

function getEndDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    return date;
}
