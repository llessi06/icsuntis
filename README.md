<p>
  <img alt="IMG" src="https://raw.githubusercontent.com/tschuerti/icsuntis/refs/heads/main/logo.png" />
</p>

##

ICSUntis is a simple JavaScript service that syncs your WebUntis substitution plan directly into a Google Calendar.
It is designed to run on a server and push updates automatically.

## Features

- Syncs your WebUntis timetable directly to Google Calendar
- Updates the calendar every 10 minutes
- Docker support for easy deployment
- Merges consecutive lessons with the same subject

## Setup

### 1. Get Your WebUntis Information

To use ICSUntis, you need to know:

**Server URL**: Find this by logging into WebUntis and looking at the URL. It should look like:

```
https://<server>.webuntis.com/
```

**School Name**: Press the RSS-Feed button in the WebUntis substitution plan. The URL will show:

```
https://<server>.webuntis.com/WebUntis/NewsFeed.do?school=<school>
```

### 2. Configure Environment Variables

Provide these environment variables through your runtime (Docker, CI, systemd, shell, etc.):

```env
WEBUNTIS_SERVER=your-server.webuntis.com
WEBUNTIS_SCHOOL=your-school-name
WEBUNTIS_USERNAME=your-username
WEBUNTIS_PASSWORD=your-password
PORT=3979
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
CALENDAR_TIMEZONE=Europe/Berlin
CALENDAR_UPDATE_INTERVAL_MINUTES=10
```

`GOOGLE_SERVICE_ACCOUNT_JSON` must contain the full service account key JSON as a single line.
Share your target Google Calendar with the service account email so it can create and delete events.

## Usage

### Option 1: Docker (Recommended)

Create a `.env` file for Docker from the template:

```bash
cp .env.example .env
```

Build and run with Docker Compose:

```bash
docker-compose up -d
```

Or use Docker directly:

```bash
docker build -t icsuntis .
docker run -d -p 3979:3979 --env-file .env icsuntis
```

### Option 2: Node.js

Install dependencies:

```bash
pnpm install
```

Start the server:

```bash
pnpm start
```

Or directly:

```bash
node src/index.js
```

### How It Works

Once running, the service syncs your WebUntis lessons directly into the Google Calendar defined by `GOOGLE_CALENDAR_ID`.
No calendar file endpoint is exposed.

### Setup Google Calendar Access

1. Create a Google Cloud service account and enable the Google Calendar API
2. Download the service account JSON key
3. Add the full JSON content to `GOOGLE_SERVICE_ACCOUNT_JSON` as an environment variable
4. Share your destination Google Calendar with the service account email (with "Make changes to events" permissions)
5. Set `GOOGLE_CALENDAR_ID` to that calendar's ID

The sync interval is controlled by `CALENDAR_UPDATE_INTERVAL_MINUTES` (default: `10`).

<br>
<h3>Have fun using ICSUntis!🙂</h3>
