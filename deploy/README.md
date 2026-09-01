# Deploying to OCI Always Free

One `VM.Standard.A1.Flex` instance (2 OCPU / 12 GB — the full Always Free
Ampere allocation) runs all three services via Docker Compose, with Caddy
handling TLS and reverse proxying. Total cost: $0/month, forever, as long as
you stay within Always Free limits.

## 1. Create the compute instance

In the OCI Console: **Compute → Instances → Create Instance**.

- **Image**: Canonical Ubuntu 24.04 (Always Free eligible).
- **Shape**: click "Change shape" → Ampere → `VM.Standard.A1.Flex` → set
  2 OCPU / 12 GB (the full free allocation).
- **Availability domain**: if you hit an "out of host capacity" error, try a
  different AD, or wait and retry — A1 shapes are popular and capacity is
  regional.
- **Networking**: use a new or existing VCN, subnet with "Assign a public
  IPv4 address" checked.
- **SSH keys**: generate or upload a key pair — you'll need the private key
  to log in.

Note the instance's public IP once it's running.

## 2. Open ports 80 and 443

By default OCI's security list only allows SSH (22). Add ingress rules:

**Networking → Virtual Cloud Networks → (your VCN) → Security Lists →
(default list) → Add Ingress Rules**:

- Source `0.0.0.0/0`, TCP, destination port `80`
- Source `0.0.0.0/0`, TCP, destination port `443`

(Port 22 should already be open from instance creation — consider
restricting its source CIDR to your own IP once you've confirmed access.)

## 3. Point DNS at the instance

OCI Always Free doesn't include DNS — use whatever registrar/DNS provider
you already have. Create two A records pointing at the instance's public IP:

- `jaas.example.com` (or your real domain) → the app
- `api.jaas.example.com` → the backend (needed for GitHub OAuth's callback,
  which the browser hits directly — see docker-compose.yml's comments)

Caddy (step 6) needs both to already resolve before it can request Let's
Encrypt certificates.

## 4. SSH in and install Docker

```bash
ssh -i /path/to/your/key ubuntu@<instance-public-ip>

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out and back in for the group change to apply
```

## 5. Get the deploy files onto the VM

Images are published publicly to Docker Hub (`jaasyoga/jaas-ui`,
`jaasyoga/jaas-registry`, `jaasyoga/jaas-guardrails`), so the VM only needs
this `deploy/` directory — not the source repos:

```bash
mkdir -p ~/jaas && cd ~/jaas
git clone --no-checkout git@github.com:jaas-yoga/jaas-ui.git
cd jaas-ui && git sparse-checkout set deploy && git checkout main
cd deploy
```

(Or just `scp` the four files in this directory over directly.)

## 6. Configure and start the stack

```bash
cd ~/jaas/jaas-ui/deploy
cp .env.example .env
nano .env   # fill in DOMAIN, API_DOMAIN, AUTH_SECRET, AUTH_GOOGLE_ID/SECRET, JAAS_JWT_SECRET

docker compose pull
docker compose up -d
```

(To build from source instead of pulling — e.g. before an image has been
published — clone all three repos as siblings the way `jaas-ui/run.sh` does
locally, then run `docker compose up -d --build` from here instead.)

First build takes a few minutes (Next.js build + two Python images). Watch
Caddy pick up certificates:

```bash
docker compose logs -f caddy
```

Once you see it's issued certs for both domains, visit `https://<DOMAIN>`.

## 7. Google OAuth setup

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
on the OAuth client used for `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, add
authorized redirect URI:

```
https://<DOMAIN>/api/auth/callback/google
```

## 8. (Optional) Move object storage off the local volume

By default, published skill artifacts live in the `registry_data` Docker
volume on this one VM — fine to start, but it's tied to this instance and
isn't backed up. OCI's Always Free tier includes 20 GB of Object Storage
with an S3-compatible API, and `jaas-registry` can talk to it directly.

`.env` on the VM is regenerated from GitHub repo secrets/variables on every
CD deploy (see `.github/workflows/docker-publish.yml`), so this is
configured there, not by hand-editing `.env` on the VM — that edit would
just be overwritten on the next push to `main`.

1. **Console → Storage → Buckets → Create Bucket** (Standard tier, in your
   tenancy's home region). Note the bucket name and the **namespace**
   string shown at the top of the Buckets page.
2. **Console → your username (top right) → Customer Secret Keys → Generate
   Secret Key**. Save the Access Key and Secret Key (the secret is shown
   once, at generation time only).
3. In each of the three repos' **Settings → Secrets and variables →
   Actions** (same place `DEPLOY_HOST`/`AUTH_SECRET`/etc. already live —
   only the deploy job's SSH step actually reads these, but keep all three
   repos in sync since any of them can trigger it), add:

   | Name | Kind | Value |
   |---|---|---|
   | `JAAS_STORAGE_BACKEND` | variable | `s3` |
   | `JAAS_STORAGE_S3_BUCKET` | variable | your bucket name |
   | `JAAS_STORAGE_S3_ENDPOINT_URL` | variable | `https://<namespace>.compat.objectstorage.<region>.oraclecloud.com` |
   | `JAAS_STORAGE_S3_REGION` | variable | e.g. `us-ashburn-1` |
   | `JAAS_STORAGE_S3_ACCESS_KEY_ID` | secret | access key from step 2 |
   | `JAAS_STORAGE_S3_SECRET_ACCESS_KEY` | secret | secret key from step 2 |

4. Trigger a redeploy — push to `main`, or run `docker-publish.yml` via
   **Actions → Run workflow** in any of the three repos.

New publishes go straight to the bucket; nothing already in the
`registry_data` volume migrates automatically. `policy_dir` (the signing
key, custom guardrail rules) always stays on the volume regardless of this
setting — only published artifacts move. Leaving all of the above unset
keeps the local-volume default with no change in behavior.

## Redeploying after changes

Once new images have been built and pushed to Docker Hub:

```bash
cd ~/jaas/jaas-ui/deploy
docker compose pull
docker compose up -d
```

## Operational notes

- **Persistent data**: jaas-registry's file-backed storage (blobs, tags,
  policy) lives in the `registry_data` named volume — survives
  `docker compose down`/rebuilds, but wiping it with `docker volume rm` is
  permanent (no database to restore from).
- **Idle reclamation**: OCI can reclaim an Always Free instance if CPU,
  network, *and* memory utilization all stay under 20% for 7 straight days.
  A rarely-visited deployment could get flagged.
- **Only `caddy` is internet-facing** — `web` and `api` publish no host
  ports; `guardrails` isn't reachable outside the Docker network at all.
- **Secrets**: `.env` on the VM is the only place secrets live — never
  commit it (already covered by `.gitignore`'s standard `.env` pattern, but
  double check).
