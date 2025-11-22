import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
    'WEBUNTIS_SERVER',
    'WEBUNTIS_SCHOOL',
    'WEBUNTIS_USERNAME',
    'WEBUNTIS_PASSWORD',
    'ICAL_SECRET_PATH'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Please create a .env file based on .env.example');
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
        secretPath: process.env.ICAL_SECRET_PATH,
        updateInterval: 10 * 60 * 1000
    }
};
