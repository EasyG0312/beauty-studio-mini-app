# 🚀 Beauty Studio Mini App - Руководство по развертыванию

## 📋 Содержание

1. [Обзор архитектуры](#архитектура)
2. [Требования к окружению](#требования)
3. [Локальная разработка](#локальная-разработка)
4. [Развертывание в Docker](#docker-развертывание)
5. [CI/CD Pipeline](#cicd)
6. [Production развертывание](#production)
7. [Мониторинг](#мониторинг)
8. [Резервное копирование](#backup)
9. [Траблшутинг](#траблшутинг)

---

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend     │    │    Backend      │    │   Database      │
│   (React)      │◄──►│   (FastAPI)     │◄──►│  (PostgreSQL)   │
│   Port: 80     │    │   Port: 8000   │    │   Port: 5432   │
│                 │    │                 │    │                 │
│                 │    │   WebSocket     │    │                 │
│                 │    │   Port: 8000   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Redis       │
                    │   (Cache)       │
                    │   Port: 6379   │
                    └─────────────────┘
```

### Компоненты

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Cache**: Redis для кэширования и сессий
- **WebSocket**: Real-time обновления
- **Nginx**: Load balancer и reverse proxy
- **Docker**: Контейнеризация всех сервисов

---

## 📋 Требования

### Минимальные требования

- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Docker

### Рекомендуемые требования

- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Network**: 100Mbps+

### ПО для разработки

```bash
# Backend
Python 3.11+
PostgreSQL 15+
Redis 7+
Docker & Docker Compose

# Frontend
Node.js 18+
npm 9+
```

---

## 💻 Локальная разработка

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-org/beauty-studio-mini-app.git
cd beauty-studio-mini-app
```

### 2. Настройка окружения

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 3. Конфигурация переменных окружения

```bash
# Скопировать шаблон
cp .env.example .env

# Отредактировать .env
nano .env
```

### 4. Запуск баз данных

```bash
# PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Redis
sudo systemctl start redis
sudo systemctl enable redis

# Или через Docker
docker-compose up postgres redis -d
```

### 5. Запуск приложений

```bash
# Backend (в новом терминале)
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (в новом терминале)
cd frontend
npm run dev
```

### 6. Проверка работоспособности

```bash
# Backend health check
curl http://localhost:8000/health

# Frontend health check
curl http://localhost:3000/health

# WebSocket connection
wscat -c ws://localhost:8000/ws
```

---

## 🐳 Docker развертывание

### 1. Сборка и запуск

```bash
# Полный запуск всех сервисов
docker-compose up -d

# Отдельные сервисы
docker-compose up postgres redis -d
docker-compose up backend -d
docker-compose up frontend -d
```

### 2. Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 3. Управление контейнерами

```bash
# Статус
docker-compose ps

# Перезапуск
docker-compose restart backend

# Остановка
docker-compose down

# Удаление образов
docker-compose down --rmi all
```

### 4. Production запуск

```bash
# Production окружение
docker-compose --profile production up -d

# С мониторингом
docker-compose --profile production --profile monitoring up -d
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

Автоматический pipeline выполняет:

1. **Тестирование**
   - Backend: pytest + coverage
   - Frontend: ESLint + TypeScript + unit tests
   - Security: Trivy vulnerability scan

2. **Сборка Docker образов**
   - Multi-stage builds
   - Кэширование зависимостей
   - Push в GitHub Container Registry

3. **Развертывание**
   - Staging: на каждый push в develop
   - Production: на каждый release
   - Health checks после деплоя

4. **Уведомления**
   - Slack оповещения о статусе
   - Email отчеты о провалах

### Управление pipeline

```bash
# Ручной запуск
gh workflow run ci-cd

# Просмотр статуса
gh run list

# Отмена workflow
gh run cancel <run-id>
```

---

## 🌐 Production развертывание

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Настройка SSL сертификатов

```bash
# Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com

# Или самоподписанные сертификаты
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt
```

### 3. Конфигурация Nginx

```bash
# Создание директорий
sudo mkdir -p /etc/nginx/ssl
sudo mkdir -p /var/log/nginx

# Копирование конфигурации
sudo cp nginx/nginx-lb.conf /etc/nginx/sites-available/beauty-studio
sudo ln -s /etc/nginx/sites-available/beauty-studio /etc/nginx/sites-enabled/

# Тестирование конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
```

### 4. Развертывание приложений

```bash
# Клонирование репозитория
git clone https://github.com/your-org/beauty-studio-mini-app.git
cd beauty-studio-mini-app

# Настройка production окружения
cp .env.example .env
nano .env  # Установить production значения

# Запуск production контейнеров
docker-compose --profile production up -d

# Проверка статуса
docker-compose --profile production ps
```

### 5. Настройка домена

```bash
# DNS A records
yourdomain.com -> SERVER_IP
api.yourdomain.com -> SERVER_IP
app.yourdomain.com -> SERVER_IP

# Настройка Nginx для домена
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📊 Мониторинг

### 1. Prometheus + Grafana

```bash
# Запуск мониторинга
docker-compose --profile monitoring up -d

# Доступ к Grafana
http://yourdomain.com:3001
# Login: admin / admin123

# Доступ к Prometheus
http://yourdomain.com:9090
```

### 2. Настройка дашбордов

```bash
# Импорт дашбордов
curl -X POST \
  -H "Authorization: Bearer YOUR_GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d @monitoring/grafana/dashboards/beauty-studio.json \
  http://admin:admin123@localhost:3001/api/dashboards/db
```

### 3. Алерты

```yaml
# alerting.yml
groups:
  - name: BeautyStudio
    rules:
      - alert: BackendDown
        expr: up{job="beauty-studio-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Backend service is down"
      
      - alert: DatabaseDown
        expr: up{job="beauty-studio-db"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
```

---

## 💾 Резервное копирование

### 1. Настройка бэкапов PostgreSQL

```bash
# Скрипт бэкапа
#!/bin/bash
BACKUP_DIR="/backup/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="beauty_studio"

# Создание директории
mkdir -p $BACKUP_DIR

# Бэкап базы данных
docker exec beauty-studio-db pg_dump -U postgres $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Сжатие
gzip $BACKUP_DIR/backup_$DATE.sql

# Удаление старых бэкапов (30 дней)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### 2. Автоматические бэкапы

```bash
# Добавление в crontab
crontab -e

# Ежедневные бэкапы в 2:00
0 2 * * * /opt/beauty-studio/scripts/backup.sh

# Еженедельные бэкапы в воскресенье
0 3 * * 0 /opt/beauty-studio/scripts/weekly-backup.sh
```

### 3. Восстановление из бэкапа

```bash
# Восстановление базы данных
docker exec -i beauty-studio-db psql -U postgres -d beauty_studio < backup.sql

# Восстановление с сжатием
gunzip -c backup.sql.gz | docker exec -i beauty-studio-db psql -U postgres -d beauty_studio
```

---

## 🔧 Траблшутинг

### Общие проблемы

#### 1. Контейнеры не запускаются

```bash
# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs backend

# Проверка ресурсов
docker stats

# Решение: пересборка образов
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### 2. Проблемы с базой данных

```bash
# Проверка подключения
docker exec beauty-studio-db psql -U postgres -d beauty_studio -c "SELECT 1;"

# Проверка логов
docker logs beauty-studio-db

# Решение: проверка прав доступа
docker exec -it beauty-studio-db psql -U postgres
ALTER USER postgres PASSWORD 'newpassword';
```

#### 3. Проблемы с SSL

```bash
# Проверка сертификатов
openssl x509 -in /etc/ssl/cert.pem -text -noout

# Тестирование Nginx конфигурации
nginx -t

# Решение: генерация новых сертификатов
sudo certbot certonly --standalone -d yourdomain.com
```

### Мониторинг производительности

```bash
# Использование CPU/Memory
docker stats --no-stream

# Логи ошибок
docker-compose logs backend | grep ERROR

# Анализ медленных запросов
docker exec beauty-studio-db psql -U postgres -d beauty_studio \
  "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## 📞 Поддержка

### Контакты

- **Email**: support@beautystudio.com
- **GitHub Issues**: https://github.com/your-org/beauty-studio-mini-app/issues
- **Documentation**: https://docs.beautystudio.com

### Диагностическая информация

При обращении в поддержку предоставьте:

1. **Версия приложения**: `git describe --tags`
2. **Окружение**: `docker-compose version`, `uname -a`
3. **Логи ошибок**: `docker-compose logs --tail=100`
4. **Конфигурация**: `.env` (без секретов)
5. **Шаги воспроизведения**: детальное описание проблемы

---

## 🔄 Обновления

### Процесс обновления

1. **Резервное копирование**
   ```bash
   ./scripts/backup.sh
   ```

2. **Загрузка обновления**
   ```bash
   git fetch origin
   git checkout v1.2.0
   ```

3. **Применение миграций**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

4. **Перезапуск сервисов**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

5. **Проверка работоспособности**
   ```bash
   curl -f http://yourdomain.com/health
   ```

---

## 📚 Дополнительная документация

- [API Documentation](./docs/api.md)
- [Frontend Documentation](./docs/frontend.md)
- [Database Schema](./docs/database.md)
- [Security Guidelines](./docs/security.md)
- [Performance Tuning](./docs/performance.md)

---

**Версия**: 1.0.0  
**Последнее обновление**: 2024-01-15  
**Автор**: Beauty Studio Development Team
