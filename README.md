# Lockstep

Lockstep is a personal security checklist platform. It helps users track security habits, checklist progress, priorities, and profile-based progress from a clean web interface.

![](https://raw.githubusercontent.com/caglaryalcin/lockstep/refs/heads/main/ss/dashboard.gif)

## Features

- User login and profile-based progress tracking
- Turkish language support
- Dark and light mode
- Security progress dashboard
- Checklist categories, priority levels, filters, and completion tracking
- Docker-ready deployment with persistent user data

## Run Locally

Commands are run from the project root:

```bash
npm install
npm run build
npm run serve
```

The app runs on:

```text
http://127.0.0.1:4174
```

To use a custom port:

```bash
PORT=4174 npm run serve
```

On PowerShell:

```powershell
$env:PORT="4174"
npm run serve
```

## Docker

Build the image:

```bash
docker build -t lockstep .
```

Run it with persistent user data:

```bash
docker run -p 4174:4174 -v lockstep-data:/data lockstep
```

User accounts and progress are stored in:

```text
/data/lockstep-users.json
```

## Docker Data Persistence

User accounts, password hashes, profile settings, and checklist progress are stored on the server in the file configured by `PSC_SETTINGS_FILE`.

The Docker image defaults to:

```text
PSC_SETTINGS_FILE=/data/lockstep-users.json
```

Run the container with a mounted volume so user data survives container restarts and image updates:

```bash
docker run -p 4174:4174 -v lockstep-data:/data lockstep
```

Keep only one running container instance while using the JSON file storage. For multiple instances, move storage to a database such as PostgreSQL.`r`n`r`n## Checklist Data

Checklist content is stored in:

```text
personal-security-checklist.yml
```

After changing checklist content, rebuild the app so the updated checklist is included in the production output.

## Useful Commands

```bash
npm run build
npm run serve
npm run lint
```

## License

See `LICENSE`.


