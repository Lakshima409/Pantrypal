# PantryPal AI diet-planner (7-day × 4-slot meal plans, blueprint §28)
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5002
CMD ["python", "app.py"]
