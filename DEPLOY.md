# Deploying Bunzai Burgers to AWS with Docker

This guide covers building the Docker image, pushing it to Amazon ECR, running it on an EC2 server with HTTPS, updating it, backing it up and clearing the data.

## How it fits together

```
Customer / admin browser
        │  https://your-domain
        ▼
EC2 server (Docker)
  ├─ caddy   ports 80/443: HTTPS certificate + forwards traffic
  └─ app     Node server (website, /bunzai-run, /admin, API)
               └─ volume "bunzai-data" → /app/data/bunzai.db (SQLite) + backups
```

**Why EC2:** the database is a single SQLite file, so it needs one server with a persistent disk. App Runner and ECS Fargate don't keep files between restarts. SQLite on EFS (network storage) risks database corruption.

Region: these steps use **me-central-1 (UAE)**. Change `REGION` if you use another region.

---

## 1. Build and test the image locally

```bash
cd bunzai-burgers
docker build -t bunzai-burgers .

# quick test on http://localhost:8099
docker run --rm -p 8099:8080 \
  -e ADMIN_PASSWORD=test123 -e COOKIE_SECURE=false \
  bunzai-burgers
```

The image never contains `.env` or your local `data/` folder: both are excluded by `.dockerignore`.

## 2. Push the image to Amazon ECR (one-time setup, then on every release)

Prerequisites: an AWS account and the AWS CLI configured (`aws configure`).

```bash
REGION=me-central-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/bunzai-burgers

# one-time: create the repository
aws ecr create-repository --repository-name bunzai-burgers --region $REGION

# log Docker in to ECR (valid 12 hours)
aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# build for the EC2 CPU type and push (use a new tag for every release)
docker buildx build --platform linux/amd64 -t $REPO:v1 --push .
```

> If you choose a Graviton (ARM, `t4g`) server instead, build with `--platform linux/arm64`.

## 3. Create the EC2 server (one-time)

In the AWS console → **EC2 → Launch instance**:

| Setting | Value |
|---|---|
| AMI | Amazon Linux 2023 |
| Instance type | `t3.small` (2 GB RAM). `t3.micro` also works for low traffic |
| Key pair | create or choose one (for SSH) |
| Storage | 20 GB gp3 |
| Security group | allow **SSH 22 from your IP only**, **HTTP 80** and **HTTPS 443** from anywhere |
| IAM instance profile | a role with the **AmazonEC2ContainerRegistryReadOnly** policy (lets the server pull from ECR without keys) |

Then **EC2 → Elastic IPs → Allocate** and associate it with the instance, so the IP never changes.

## 4. Install Docker on the server (one-time)

```bash
ssh -i your-key.pem ec2-user@<ELASTIC_IP>

sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

exit   # log out and back in so the docker group applies
```

## 5. Configure and start the app (one-time)

From your computer, copy the compose file to the server:

```bash
ssh -i your-key.pem ec2-user@<ELASTIC_IP> "mkdir -p ~/bunzai"
scp -i your-key.pem docker-compose.yml ec2-user@<ELASTIC_IP>:~/bunzai/
```

On the server, create `~/bunzai/.env` (`nano ~/bunzai/.env`). Use a **new** password and secret, not the ones from your laptop:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong password>
SESSION_SECRET=<64 random hex characters>
APP_IMAGE=<ACCOUNT_ID>.dkr.ecr.me-central-1.amazonaws.com/bunzai-burgers:v1
DOMAIN=spin.yourdomain.com
```

- Generate a secret with `openssl rand -hex 32`.
- Lock the file down with `chmod 600 ~/bunzai/.env`.

Point the domain's DNS at the server first. In your DNS provider (or Route 53), create an **A record** for `spin.yourdomain.com` pointing to the Elastic IP. Then start the app:

```bash
cd ~/bunzai
aws ecr get-login-password --region me-central-1 \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.me-central-1.amazonaws.com
docker compose pull
docker compose up -d --no-build
docker compose ps        # app should show "healthy"
```

Open `https://spin.yourdomain.com/bunzai-run` and `https://spin.yourdomain.com/admin`. Caddy gets the HTTPS certificate automatically on the first visit, which can take a few seconds.

> **No domain yet?** Leave `DOMAIN` out and add `COOKIE_SECURE=false`. The site is then served on `http://<ELASTIC_IP>`. Switch to a domain and HTTPS before going live, because phone numbers would otherwise travel unencrypted.

Containers restart automatically after a crash or a server reboot (`restart: unless-stopped`).

## 6. Deploy an update

On your computer, build and push a new tag:

```bash
docker buildx build --platform linux/amd64 -t $REPO:v2 --push .
```

On the server:

```bash
cd ~/bunzai
sed -i 's/:v1$/:v2/' .env            # or edit APP_IMAGE in .env
aws ecr get-login-password --region me-central-1 \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.me-central-1.amazonaws.com
docker compose pull app
docker compose up -d --no-build
```

The database lives on the `bunzai-data` volume, so members and offers are kept across updates. To roll back, set the previous tag and run the same two commands.

## 7. Backups

```bash
cd ~/bunzai
docker compose exec app npm run db:backup             # saved in /app/data/backups inside the volume

# copy backups to the server, then to S3
docker compose cp app:/app/data/backups ./backups
aws s3 sync ./backups s3://<your-bucket>/bunzai-backups/
```

Also turn on **EBS snapshots** for the instance's disk (EC2 → Lifecycle Manager → daily snapshot policy) so the whole server can be restored.

## 8. Clearing the data

All commands take a backup first. They refuse to run without `--yes`; without it they only show what would be deleted.

| Goal | Command (on the server, in `~/bunzai`) |
|---|---|
| Delete all **members** (names, phones, rewards) and spins, **keep offers** | `docker compose exec app npm run db:clear-members -- --yes` |
| Delete **everything** and restore the 5 default offers | `docker compose exec app npm run db:reset -- --yes` |
| Just take a backup | `docker compose exec app npm run db:backup` |
| Also delete the backups (they contain personal data) | `docker compose exec app sh -c 'rm -rf /app/data/backups'` |
| Wipe the volume completely (stops the site) | `docker compose down && docker volume rm bunzai_bunzai-data && docker compose up -d --no-build` |

Locally (without Docker) the same commands are `npm run db:clear-members -- --yes`, `npm run db:reset -- --yes` and `npm run db:backup`.

Customers whose reward was deleted see the wheel again the next time they open `/bunzai-run`, because their browser's saved reward no longer exists on the server.

> The volume name is `<folder>_bunzai-data`. Check it with `docker volume ls`.

## Troubleshooting

| Problem | Check |
|---|---|
| Site not loading | `docker compose ps`, `docker compose logs -f app caddy`, security group allows 80/443 |
| HTTPS certificate not issued | DNS A record points at the Elastic IP (`dig spin.yourdomain.com`); port 80 open; `docker compose logs caddy` |
| Admin login "succeeds" but bounces back | Using plain http in production: use HTTPS, or set `COOKIE_SECURE=false` for testing |
| `docker compose pull` → "no basic auth credentials" | Run the `aws ecr get-login-password … docker login` command again; check the instance IAM role |
| `exec format error` | Image built for the wrong CPU: rebuild with `--platform linux/amd64` (or `arm64` for `t4g`) |
