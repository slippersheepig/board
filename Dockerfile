FROM python:slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:slim
WORKDIR /app
COPY --from=builder /usr/local /usr/local
COPY . .
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
