<p>
  <img alt="IMG" src="https://raw.githubusercontent.com/tschuerti/icsuntis/refs/heads/main/logo.png" />
</p>

##

ICSUntis is a simple JavaScript server that generates an ICS file from your WebUntis substitution plan. It is designed
to be run on a server and can be accessed via a simple HTTP GET request.

## Features

- Automatically generates iCal files from your WebUntis timetable
- Updates the calendar every 10 minutes
- Secure access via a secret URL path
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

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
WEBUNTIS_SERVER=your-server.webuntis.com
WEBUNTIS_SCHOOL=your-school-name
WEBUNTIS_USERNAME=your-username
WEBUNTIS_PASSWORD=your-password
PORT=3979
ICAL_SECRET_PATH=your-random-secret-string
```

**Important**: Choose a long, random string for `ICAL_SECRET_PATH` to secure your calendar URL.

## Usage

### Option 1: Docker (Recommended)

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
npm install
```

Start the server:

```bash
npm start
```

Or directly:

```bash
node src/index.js
```

### Accessing Your Calendar

Once running, access your iCal file at:

```
http://localhost:3979/<your-secret-path>
```

For example, if `ICAL_SECRET_PATH=abc123xyz`:

```
http://localhost:3979/abc123xyz
```

Add this URL to your calendar application to subscribe to your timetable. The calendar will automatically update every 10 minutes.

**Note**: You can use either `http://localhost:3979/abc123xyz` or `http://localhost:3979/abc123xyz.ics` - both work!

### Adding to Google Calendar

1. Open [Google Calendar](https://calendar.google.com)
2. Click the **+** next to "Other calendars" on the left
3. Select **"From URL"**
4. Paste your calendar URL (e.g., `http://your-server:3979/abc123xyz`)
5. Click **"Add calendar"**

Google Calendar will check for updates automatically based on the cache headers (every 10 minutes).

### Adding to Apple Calendar

1. Open Calendar app
2. Go to **File → New Calendar Subscription**
3. Enter your calendar URL
4. Set auto-refresh to **every hour** or **every day**

### Adding to Outlook

1. Open Outlook Calendar
2. Click **"Add calendar"** → **"Subscribe from web"**
3. Paste your calendar URL
4. Click **"Import"**

<br>
<h3>Have fun using ICSUntis!🙂</h3>
