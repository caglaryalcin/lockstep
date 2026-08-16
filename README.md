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

Use `PORT` to run on a custom port:

```bash
PORT=4174 npm run serve
```

## Demo

Run the isolated demo with production build output:

```bash
npm run demo
```

Then open `http://127.0.0.1:4175` and sign in with `demo` / `demo`. The demo starts with a populated security profile and checklist progress and keeps changes only in memory. All mutable demo data is restored to its original seed every day at `00:00 Europe/Istanbul`; a process restart also restores it. Existing demo sessions are invalidated at the daily boundary, and open pages reload to the sign-in screen so stale browser data cannot be written back. The demo does not write to `PSC_SETTINGS_FILE` or enable account registration.

Use `LOCKSTEP_DEMO_PORT` (or `DEMO_PORT`) to change the demo port. The demo binds to `127.0.0.1` by default; set `LOCKSTEP_DEMO_HOST` when it must listen on another interface. Set `LOCKSTEP_DEMO_RESET_TIMEZONE` to another valid IANA time zone when the daily boundary should not use `Europe/Istanbul`. Public demo deployments should replace the default credentials with a password of at least six characters:

```bash
LOCKSTEP_DEMO_PORT=4180 \
LOCKSTEP_DEMO_USER=preview \
LOCKSTEP_DEMO_PASSWORD='replace-this-password' \
npm run demo
```

Run the build-backed HTTP smoke test with:

```bash
npm run demo:smoke
```

The Docker image includes the demo server and exposes port `4175`. Override the normal image command to launch it:

```bash
docker run --rm \
  -p 127.0.0.1:4175:4175 \
  -e LOCKSTEP_DEMO_HOST=0.0.0.0 \
  ghcr.io/caglaryalcin/lockstep:v1.0.0 \
  node demo-server.mjs
```

The normal `npm run serve` and Docker `CMD` paths remain production mode on port `4174`.

### External Kubernetes demo pod

The same image can run as a dedicated `lockstep-demo` pod, independently from the production deployment. Create its credentials as a Secret, then apply the included single-replica Deployment and Service:

```bash
kubectl create secret generic lockstep-demo-credentials \
  --from-literal=username=preview \
  --from-literal=password='replace-this-password'

kubectl apply -f deploy/kubernetes/lockstep-demo.yaml
kubectl rollout status deployment/lockstep-demo
kubectl port-forward service/lockstep-demo 4175:80
```

Open `http://127.0.0.1:4175` after the port-forward starts. Point an HTTPS Ingress at the `lockstep-demo` Service when the demo should be public; the ingress must preserve `X-Forwarded-Proto` so the demo session cookie is marked secure.

The manifest runs `node demo-server.mjs`, binds the pod to `0.0.0.0:4175`, and probes `/healthz` and `/readyz`. It intentionally uses `replicas: 1` with the `Recreate` strategy because both demo state and sessions are process-local. Do not attach a PVC or scale this deployment horizontally; use a shared store first if multi-replica demo service is ever required.

## Docker

Run directly from the published image:

```bash
docker run -d \
  --name lockstep \
  -p 4174:4174 \
  -v lockstep-data:/data \
  ghcr.io/caglaryalcin/lockstep:latest
```

Then open:

```text
http://127.0.0.1:4174
```

Build locally only if you want to create your own image:

```bash
docker build -t lockstep .
docker run -d --name lockstep -p 4174:4174 -v lockstep-data:/data lockstep
```

## Disable New Registrations

New account registration is enabled by default. To make a public deployment login-only after setup, set `LOCKSTEP_REGISTRATION_ENABLED=false`. When there are no accounts yet, Lockstep still allows exactly one initial account to be created. Once an account exists, the server rejects all further registration requests; existing users can still sign in and manage their accounts.

With Docker Compose:

```bash
LOCKSTEP_REGISTRATION_ENABLED=false docker compose up -d
```

The included `docker-compose.yml` reads this value and keeps it enabled when the variable is omitted. For `docker run`, add `-e LOCKSTEP_REGISTRATION_ENABLED=false`. The Docker image and Docker Stack deployments use the same environment variable.

## Docker Stack

Example `stack.yml`:

```yaml
version: "3.8"

services:
  lockstep:
    image: ghcr.io/caglaryalcin/lockstep:latest
    ports:
      - "4174:4174"
    environment:
      PORT: "4174"
      PSC_SETTINGS_FILE: /data/lockstep-users.json
      # Set to "false" to allow only the first account to be created.
      LOCKSTEP_REGISTRATION_ENABLED: "true"
    volumes:
      - lockstep-data:/data
    deploy:
      replicas: 1
      restart_policy:
        condition: any

volumes:
  lockstep-data:
```

Deploy it:

```bash
docker stack deploy -c stack.yml lockstep
```

## Docker Data Persistence

User accounts, password hashes, profile settings, and checklist progress are stored on the server in the file configured by `PSC_SETTINGS_FILE`.

The Docker image defaults to:

```text
PSC_SETTINGS_FILE=/data/lockstep-users.json
```

Mount `/data` as a Docker volume so user data survives container restarts and image updates.

Keep only one running container or stack replica while using the JSON file storage. For multiple instances, move storage to a database such as PostgreSQL.

## Checklist Data

Checklist content is stored in:

```text
personal-security-checklist.yml
```

After changing checklist content, rebuild the app so the updated checklist is included in the production output.

## Useful Commands

```bash
npm run build
npm run demo
npm run demo:smoke
npm run serve
npm run lint
```

## License

See `LICENSE`.
