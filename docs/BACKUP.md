# Disaster Recovery & Restoration Guide (BACKUP.md)

This document describes how to restore the GitForge stack from daily database dumps and compressed volume archives.

## Backup Locations & Layout

- **Database Backups**: Located in `/tmp/backups/gitforge_db_*.sql.gz` (and S3 storage bucket `gitforge-backups/db/`).
- **Data Volume Backups**: Located in `/tmp/backups/volumes/git_repos_*.tar.gz` and `minio_assets_*.tar.gz`.

---

## 1. Database Restoration Procedure

To restore the PostgreSQL database state from a compressed `.sql.gz` backup:

1. Copy the target database archive onto the server.
2. Uncompress the archive:
   ```bash
   gunzip -c gitforge_db_20260804_000000.sql.gz > gitforge_db.sql
   ```
3. Copy the dump into the postgres container:
   ```bash
   docker cp gitforge_db.sql gitforge-postgres:/tmp/gitforge_db.sql
   ```
4. Recreate the database schema and load data:
   ```bash
   docker exec -it gitforge-postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS gitforge;"
   docker exec -it gitforge-postgres psql -U postgres -d postgres -c "CREATE DATABASE gitforge;"
   docker exec -it gitforge-postgres psql -U postgres -d gitforge -f /tmp/gitforge_db.sql
   ```

---

## 2. Git Repositories Volume Restoration

To restore bare Git repositories from a `.tar.gz` volume archive:

1. Stop the git daemon service to prevent concurrent edits:
   ```bash
   docker-compose stop git-daemon
   ```
2. Locate the active docker volume data directory (usually `/var/lib/docker/volumes/github_git-data/_data` or inspect volume details via `docker volume inspect github_git-data`).
3. Clear the active volume content:
   ```bash
   rm -rf /var/lib/docker/volumes/github_git-data/_data/*
   ```
4. Extract the backup archive:
   ```bash
   tar -xzf /tmp/backups/volumes/git_repos_20260804_000000.tar.gz -C /var/lib/docker/volumes/github_git-data/_data/
   ```
5. Restart the git daemon:
   ```bash
   docker-compose start git-daemon
   ```

---

## 3. Object Storage Assets Restoration

To restore releases, packages, and upload assets from MinIO volume archive:

1. Stop the MinIO service:
   ```bash
   docker-compose stop minio
   ```
2. Clear current MinIO volume directory content:
   ```bash
   rm -rf /var/lib/docker/volumes/github_minio-data/_data/*
   ```
3. Extract assets archive:
   ```bash
   tar -xzf /tmp/backups/volumes/minio_assets_20260804_000000.tar.gz -C /var/lib/docker/volumes/github_minio-data/_data/
   ```
4. Start MinIO service:
   ```bash
   docker-compose start minio
   ```
