#!/bin/sh
# Daily volume backup script for Git repositories and MinIO asset volumes
echo "=================================================="
echo "Starting GitForge Daily Data Volumes Backup"
echo "=================================================="

BACKUP_DEST="/tmp/backups/volumes"
mkdir -p "$BACKUP_DEST"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 1. Back up bare Git repositories volume (catastrophic data protection)
echo "Archiving bare git repositories volume..."
tar -czf "$BACKUP_DEST/git_repos_$TIMESTAMP.tar.gz" -C /var/lib/docker/volumes/github_git-data/_data .

# 2. Back up MinIO storage objects volume
echo "Archiving MinIO storage assets volume..."
tar -czf "$BACKUP_DEST/minio_assets_$TIMESTAMP.tar.gz" -C /var/lib/docker/volumes/github_minio-data/_data .

# 3. Retention policy (keep last 7 volume archives)
find "$BACKUP_DEST" -name "git_repos_*.tar.gz" -mtime +7 -delete
find "$BACKUP_DEST" -name "minio_assets_*.tar.gz" -mtime +7 -delete

echo "Volume backup process completed successfully."
