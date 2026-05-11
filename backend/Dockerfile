# Оптимизированный Dockerfile для Beauty Studio Backend
# Multi-stage build для уменьшения размера образа

# Stage 1: Build
FROM python:3.11-slim as builder

# Установка переменных окружения
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Установка зависимостей для сборки
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Создание виртуального окружения
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Копирование requirements и установка зависимостей
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim as runtime

# Установка runtime зависимостей
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Создание non-root пользователя
RUN useradd --create-home --shell /bin/bash app

# Копирование виртуального окружения
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Установка рабочих директорий
WORKDIR /app

# Копирование кода приложения
COPY . .

# Смена пользователя
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose порт
EXPOSE 8000

# Команда запуска с gunicorn для production
CMD ["gunicorn", "app.main_refactored:app", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "30", "--keepalive", "2", "--max-requests", "1000", "--max-requests-jitter", "50"]
