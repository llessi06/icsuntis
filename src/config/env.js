const requiredEnvVars = [
    'WEBUNTIS_SERVER',
    'WEBUNTIS_SCHOOL',
    'WEBUNTIS_USERNAME',
    'WEBUNTIS_PASSWORD',
    'GOOGLE_CALENDAR_ID',
    'GOOGLE_SERVICE_ACCOUNT_JSON'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
const updateIntervalMinutes = parseUpdateIntervalMinutes(process.env.CALENDAR_UPDATE_INTERVAL_MINUTES);

if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Provide them via your runtime environment (for example Docker environment variables).');
    process.exit(1);
}

export const config = {
    webuntis: {
        server: process.env.WEBUNTIS_SERVER,
        school: process.env.WEBUNTIS_SCHOOL,
        username: process.env.WEBUNTIS_USERNAME,
        password: process.env.WEBUNTIS_PASSWORD
    },
    server: {
        port: process.env.PORT || 3979
    },
    calendar: {
        updateInterval: updateIntervalMinutes * 60 * 1000,
        timezone: process.env.CALENDAR_TIMEZONE || 'Europe/Berlin'
    },
    google: {
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    }
};

function parseUpdateIntervalMinutes(rawValue) {
    if (!rawValue) {
        return 10;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        console.error('CALENDAR_UPDATE_INTERVAL_MINUTES must be a positive number.');
        process.exit(1);
    }

    return parsedValue;
}
