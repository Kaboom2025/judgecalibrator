FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY web/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Install the judgecalib package
RUN pip install --no-cache-dir -e .

EXPOSE 8000

CMD ["uvicorn", "web.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
