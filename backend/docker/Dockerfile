FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libpq5 \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/base.txt requirements/dev.txt ./requirements/
RUN pip install --no-cache-dir -r requirements/dev.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
