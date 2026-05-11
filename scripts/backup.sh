#!/bin/bash
# Beauty Studio Backup Script
# =========================
# Usage: ./backup.sh [database|files|full] [daily|weekly|monthly]

set -euo pipefail

# Конфигурация
BACKUP_DIR="/backup"
LOG_FILE="/var/log/beauty-studio-backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
S3_BUCKET="beauty-studio-backups"
AWS_REGION="us-east-1"

# Создание лог директории
mkdir -p "$(dirname "$LOG_FILE")"

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Функция проверки ошибок
check_error() {
    if [ $? -ne 0 ]; then
        log "ERROR: $1"
        exit 1
    fi
}

# Функция бэкапа базы данных
backup_database() {
    log "Starting database backup..."
    
    DB_BACKUP_DIR="$BACKUP_DIR/database"
    mkdir -p "$DB_BACKUP_DIR"
    
    # Получаем переменные окружения
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Бэкап PostgreSQL
    if docker ps | grep -q "beauty-studio-db"; then
        DB_FILE="$DB_BACKUP_DIR/db_backup_$DATE.sql"
        
        docker exec beauty-studio-db pg_dump -U postgres \
            --no-password --clean --if-exists \
            --format=custom --compress=9 \
            beauty_studio > "$DB_FILE"
        
        check_error "Database backup failed"
        
        # Сжимаем
        gzip "$DB_FILE"
        DB_FILE="${DB_FILE}.gz"
        
        log "Database backup completed: $DB_FILE"
        
        # Загрузка в S3 если настроено
        if command -v aws &> /dev/null && [ -n "${AWS_ACCESS_KEY:-}" ]; then
            aws s3 cp "$DB_FILE" "s3://$S3_BUCKET/database/" \
                --region "$AWS_REGION"
            log "Database backup uploaded to S3"
        fi
        
        # Удаляем старые бэкапы
        find "$DB_BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
        log "Old database backups cleaned up"
        
    else
        log "ERROR: Database container not running"
        exit 1
    fi
}

# Функция бэкапа файлов
backup_files() {
    log "Starting files backup..."
    
    FILES_BACKUP_DIR="$BACKUP_DIR/files"
    mkdir -p "$FILES_BACKUP_DIR"
    
    # Бэкап важных директорий
    IMPORTANT_DIRS=(
        "backend/logs"
        "frontend/logs"
        "nginx/ssl"
        "uploads"
        "config"
    )
    
    for dir in "${IMPORTANT_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            ARCHIVE="$FILES_BACKUP_DIR/${dir//\//_}_$DATE.tar.gz"
            
            tar -czf "$ARCHIVE" "$dir"
            check_error "Failed to backup $dir"
            
            log "Files backup completed: $ARCHIVE"
            
            # Загрузка в S3
            if command -v aws &> /dev/null && [ -n "${AWS_ACCESS_KEY:-}" ]; then
                aws s3 cp "$ARCHIVE" "s3://$S3_BUCKET/files/" \
                    --region "$AWS_REGION"
                log "Files backup uploaded to S3"
            fi
        fi
    done
    
    # Удаляем старые бэкапы файлов
    find "$FILES_BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    log "Old file backups cleaned up"
}

# Функция полного бэкапа
backup_full() {
    log "Starting full backup..."
    
    # Создаем временную директорию
    TEMP_DIR="$BACKUP_DIR/full/temp_$DATE"
    mkdir -p "$TEMP_DIR"
    
    # Бэкап базы данных
    if docker ps | grep -q "beauty-studio-db"; then
        docker exec beauty-studio-db pg_dump -U postgres \
            --no-password --clean --if-exists \
            --format=custom --compress=9 \
            beauty_studio > "$TEMP_DIR/database.sql"
        check_error "Database backup failed"
    fi
    
    # Бэкап конфигурационных файлов
    cp -r config "$TEMP_DIR/" 2>/dev/null || true
    cp .env "$TEMP_DIR/" 2>/dev/null || true
    cp docker-compose.yml "$TEMP_DIR/" 2>/dev/null || true
    
    # Бэкап логов
    mkdir -p "$TEMP_DIR/logs"
    cp -r backend/logs "$TEMP_DIR/logs/" 2>/dev/null || true
    cp -r frontend/logs "$TEMP_DIR/logs/" 2>/dev/null || true
    
    # Создаем архив
    FULL_ARCHIVE="$BACKUP_DIR/full/full_backup_$DATE.tar.gz"
    tar -czf "$FULL_ARCHIVE" -C "$TEMP_DIR" .
    
    check_error "Full backup failed"
    
    # Удаляем временную директорию
    rm -rf "$TEMP_DIR"
    
    log "Full backup completed: $FULL_ARCHIVE"
    
    # Загрузка в S3
    if command -v aws &> /dev/null && [ -n "${AWS_ACCESS_KEY:-}" ]; then
        aws s3 cp "$FULL_ARCHIVE" "s3://$S3_BUCKET/full/" \
            --region "$AWS_REGION"
        log "Full backup uploaded to S3"
    fi
    
    # Удаляем старые полные бэкапы (оставляем только 7 последних)
    find "$BACKUP_DIR/full" -name "full_backup_*.tar.gz" \
        -mtime +7 -delete
    log "Old full backups cleaned up"
}

# Функция восстановления базы данных
restore_database() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Starting database restore from: $backup_file"
    
    # Останавливаем бэкап
    if docker ps | grep -q "beauty-studio-db"; then
        # Создаем бэкап перед восстановлением
        backup_database
        
        # Восстанавливаем базу данных
        if [[ "$backup_file" == *.gz ]]; then
            gunzip -c "$backup_file" | docker exec -i beauty-studio-db \
                psql -U postgres -d beauty_studio
        else
            docker exec -i beauty-studio-db psql -U postgres \
                -d beauty_studio < "$backup_file"
        fi
        
        check_error "Database restore failed"
        
        log "Database restore completed successfully"
    else
        log "ERROR: Database container not running"
        exit 1
    fi
}

# Функция проверки бэкапов
verify_backups() {
    log "Verifying backup integrity..."
    
    # Проверяем бэкапы базы данных
    DB_BACKUP_DIR="$BACKUP_DIR/database"
    if [ -d "$DB_BACKUP_DIR" ]; then
        for backup in "$DB_BACKUP_DIR"/*.gz; do
            if [ -f "$backup" ]; then
                # Проверяем целостность gzip
                if gzip -t "$backup" 2>/dev/null; then
                    log "✓ Database backup OK: $(basename "$backup")"
                else
                    log "✗ Database backup CORRUPT: $(basename "$backup")"
                fi
            fi
        done
    fi
    
    # Проверяем файловые бэкапы
    FILES_BACKUP_DIR="$BACKUP_DIR/files"
    if [ -d "$FILES_BACKUP_DIR" ]; then
        for backup in "$FILES_BACKUP_DIR"/*.tar.gz; do
            if [ -f "$backup" ]; then
                # Проверяем целостность tar.gz
                if tar -tzf "$backup" >/dev/null 2>&1; then
                    log "✓ Files backup OK: $(basename "$backup")"
                else
                    log "✗ Files backup CORRUPT: $(basename "$backup")"
                fi
            fi
        done
    fi
}

# Функция очистки старых бэкапов
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Удаляем бэкапы старше RETENTION_DAYS
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
    
    # Удаляем пустые директории
    find "$BACKUP_DIR" -type d -empty -delete
    
    log "Old backups cleanup completed"
}

# Функция отправки уведомления
send_notification() {
    local message="$1"
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [ -n "$webhook_url" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$webhook_url" 2>/dev/null || true
    fi
    
    # Email уведомление если настроено
    if command -v mail &> /dev/null && [ -n "${BACKUP_EMAIL:-}" ]; then
        echo "$message" | mail -s "Beauty Studio Backup Notification" \
            "$BACKUP_EMAIL"
    fi
}

# Основная логика
case "${1:-database}" in
    "database")
        backup_database
        send_notification "✅ Database backup completed successfully"
        ;;
    "files")
        backup_files
        send_notification "✅ Files backup completed successfully"
        ;;
    "full")
        backup_full
        send_notification "✅ Full backup completed successfully"
        ;;
    "restore")
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 restore <backup_file>"
            exit 1
        fi
        restore_database "$2"
        send_notification "🔄 Database restore completed from $2"
        ;;
    "verify")
        verify_backups
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 [database|files|full|restore|verify|cleanup] [backup_file]"
        echo ""
        echo "Commands:"
        echo "  database  - Backup database only"
        echo "  files     - Backup important files only"
        echo "  full      - Full backup (database + files)"
        echo "  restore   - Restore database from backup file"
        echo "  verify    - Verify backup integrity"
        echo "  cleanup   - Clean up old backups"
        echo ""
        echo "Examples:"
        echo "  $0 database"
        echo "  $0 full"
        echo "  $0 restore /backup/database/db_backup_20240115_120000.sql.gz"
        echo "  $0 verify"
        echo "  $0 cleanup"
        exit 1
        ;;
esac

log "Backup operation completed successfully"
