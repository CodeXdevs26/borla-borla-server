# Borla Project: MongoDB & S3 Backup Configuration Guide

This document outlines the architecture and configuration for the local MongoDB database and the automated backup system utilizing Amazon S3.

## 1. Why is this Architecture Needed?

Transitioning from a managed cloud database (like MongoDB Atlas) to a self-hosted environment on AWS EC2 requires a robust safety net. This setup was implemented for three primary reasons:

- **Low Latency & High Performance**: By hosting MongoDB locally on the EC2 instance in the **Africa (Cape Town)** region, the application benefits from near-zero latency for database queries compared to remote cloud clusters.
- **Data Sovereignty & Security**: Keeping data within the same infrastructure as the backend reduces the attack surface and ensures compliance with local data residency requirements.
- **Disaster Recovery**: Since the database is self-managed, an automated off-site backup to Amazon S3 is critical. It protects against EC2 instance failure, EBS volume corruption, or accidental data deletion.

## 2. Amazon S3 Setup

The S3 environment was configured to support both system backups and application media in a single, organized bucket.

### Bucket Configuration

- **Name**: `borla-storage`
- **Region**: `af-south-1` (Africa - Cape Town)
- **Namespace**: Global
- **Object Ownership**: ACLs disabled (Bucket owner enforced)
- **Encryption**: SSE-S3 (Amazon S3-managed keys)

### Directory Structure

Folders (Prefixes) were created to separate sensitive system data from public-facing assets:

- `db-backups/`: Private storage for compressed MongoDB `.gz` archives.
- `media/uploads/`: Storage for user-generated content and images.

### Security & Public Access

To ensure security while allowing the application to serve images, a **Bucket Policy** was applied to allow public read access _only_ to the media directory:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForMediaOnly",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::borla-storage/media/*"
    }
  ]
}
```

## 3. EC2 & IAM Integration

The EC2 instance is authorized to communicate with S3 without the need for hardcoded credentials in environment variables.

### IAM Role: `BorlaEC2S3Role`

An IAM Role was created and attached to the EC2 instance with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::borla-storage", "arn:aws:s3:::borla-storage/*"]
    }
  ]
}
```

## 4. Automated Backup Configuration

The backup system utilizes a bash script and the Linux Cron daemon to automate daily snapshots.

### Backup Script: `~/backup_mongodb.sh`

The script performs a `mongodump` using the local replica set connection string, compresses the output, and uploads it to the S3 bucket.

```bash
#!/bin/bash

# Configuration
DB_NAME="borla_db"
BACKUP_NAME="${DB_NAME}_$(date +%Y%m%d_%H%M%S).gz"
DEST_DIR="/home/ubuntu/backups"
S3_BUCKET="s3://borla-storage/db-backups/"
MONGODB_URI="mongodb://localhost:27017/${DB_NAME}?replicaSet=rs0"

# Ensure local backup directory exists
mkdir -p $DEST_DIR

# 1. Create compressed backup
mongodump --uri=\"$MONGODB_URI\" --archive=\"$DEST_DIR/$BACKUP_NAME\" --gzip

# 2. Upload to S3
/usr/local/bin/aws s3 cp \"$DEST_DIR/$BACKUP_NAME\" \"$S3_BUCKET\"

# 3. Clean up local file
rm \"$DEST_DIR/$BACKUP_NAME\"
```

### Automation (Cron Job)

The script is scheduled to run every day at **2:00 AM** server time.

- **Cron Entry**: `0 2 * * * /bin/bash /home/ubuntu/backup_mongodb.sh >> /home/ubuntu/backup_log.txt 2>&1`
