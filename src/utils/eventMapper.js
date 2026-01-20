export function mapLessonToEvent(lesson) {
    const dateStr = lesson.date.toString();
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6));
    const day = parseInt(dateStr.slice(6, 8));

    const startHour = Math.floor(lesson.startTime / 100);
    const startMinute = lesson.startTime % 100;
    const endHour = Math.floor(lesson.endTime / 100);
    const endMinute = lesson.endTime % 100;

    const subjects = extractSubjects(lesson);
    const rooms = extractRooms(lesson);
    const teachers = extractTeachers(lesson);
    const classes = extractClasses(lesson);

    const title = buildTitle(subjects, teachers, rooms);
    const description = buildDescription(lesson, teachers, classes);

    const uid = generateEventUID(lesson, dateStr, startHour, startMinute);

    return {
        start: [year, month, day, startHour, startMinute],
        startInputType: 'local',
        startOutputType: 'local',
        end: [year, month, day, endHour, endMinute],
        endInputType: 'local',
        endOutputType: 'local',
        title,
        location: rooms || 'Kein Raum angegeben',
        description,
        uid,
        sequence: 1
    };
}

function generateEventUID(lesson, dateStr, startHour, startMinute) {
    const subjects = lesson.su && lesson.su.length > 0
        ? lesson.su.map(subject => subject.longname).join('-')
        : 'lesson';
    
    const rooms = lesson.ro && lesson.ro.length > 0
        ? lesson.ro.map(room => room.name).join('-')
        : 'no-room';
    
    const teachers = lesson.te && lesson.te.length > 0
        ? lesson.te.map(teacher => teacher.longname).join('-')
        : 'no-teacher';

    return `${dateStr}-${startHour}${startMinute}-${subjects}-${rooms}-${teachers}@icsuntis`;
}

function extractSubjects(lesson) {
    return lesson.su && lesson.su.length > 0
        ? lesson.su.map(subject => subject.longname).join(', ')
        : null;
}

function extractRooms(lesson) {
    return lesson.ro && lesson.ro.length > 0
        ? lesson.ro.map(room => room.name).join(', ')
        : null;
}

function extractTeachers(lesson) {
    return lesson.te && lesson.te.length > 0
        ? lesson.te.map(teacher => teacher.longname).join(', ')
        : null;
}

function extractClasses(lesson) {
    return lesson.kl && lesson.kl.length > 0
        ? lesson.kl.map(kl => kl.longname).join(', ')
        : null;
}

function buildTitle(subjects, teachers, rooms) {
    if (subjects) return subjects;
    if (teachers) return `Stunde (${teachers})`;
    if (rooms) return `Stunde (${rooms})`;
    return 'Stunde';
}

function buildDescription(lesson, teachers, classes) {
    const parts = [];

    if (teachers) parts.push(`Lehrer: ${teachers}`);
    if (classes) parts.push(`Klasse: ${classes}`);
    if (lesson.code && lesson.code !== 'regular') parts.push(`Status: ${lesson.code}`);
    if (lesson.substText) parts.push(`Vertretung: ${lesson.substText}`);
    if (lesson.info) parts.push(`Info: ${lesson.info}`);
    if (lesson.activityType) parts.push(`Typ: ${lesson.activityType}`);

    return parts.join('\n');
}
