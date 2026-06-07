# ML Model Integration Guide

## Overview

Your trained Lead Score Prediction model has been successfully integrated into the GreenCRM backend. The integration consists of:

1. **Python Flask API Server** - Serves ML predictions
2. **Node.js Backend Routes** - API endpoints to call the prediction service
3. **Frontend Ready** - Ready to call the backend endpoints

## Architecture

```
Frontend (Vite) <-> Backend API (Hono/Node) <-> Flask API (Python) <-> Trained Model
     :5173                :9000                      :5000              (.pkl)
```

## Running the Services

### 1. Backend API Server (Node.js)
**Status**: Already running on port 9000
```bash
cd backend
npm run dev
# or
node node_modules/tsx/dist/cli.mjs watch ./src/index.ts
```

### 2. ML Prediction API Server (Python)
**New Service**: Runs on port 5000
```bash
cd backend/ml
python flask_api.py
# or with full path:
C:/Python314/python.exe d:/Project/GreenCRM-main/GreenCRM-main/backend/ml/flask_api.py
```

### 3. Frontend (Vite)
**Status**: Already running on port 5173
```bash
cd frontend
npm run dev
```

## API Endpoints

### 1. Health Check
```bash
GET http://localhost:9000/ml/health

# Response:
{
  "status": "success",
  "ml_service": {
    "status": "healthy",
    "service": "Lead Score Prediction API",
    "version": "1.0.0"
  },
  "service_url": "http://localhost:5000"
}
```

### 2. Single Prediction
Requires authentication (JWT token)

```bash
POST http://localhost:9000/ml/predict
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "founded_year": 2013,
  "employee_count": 6000,
  "funding_total": 3500000000,
  "deal_value": 120000,
  "deal_probability": 0.9,
  "call_duration": 1200,
  "industry": "Technology",
  "market_segment": "Enterprise",
  "business_model": "SaaS",
  "contact_type": "Decision Maker",
  "influence_level": "High",
  "lead_priority": "High",
  "deal_stage": "Discovery",
  "activity_type": "Call",
  "activity_outcome": "Success",
  "interaction_channel": "Zoom",
  "call_outcome": "Migration plan approved",
  "email_direction": "Outbound",
  "interaction_sentiment": "Positive"
}

# Response:
{
  "status": "success",
  "prediction": {
    "lead_score": 85.42,
    "status": "success",
    "message": "Lead score prediction: 85.42"
  }
}
```

### 3. Batch Predictions
Predict scores for multiple leads at once

```bash
POST http://localhost:9000/ml/predict/batch
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "records": [
    {
      "founded_year": 2013,
      "employee_count": 6000,
      ...
    },
    {
      "founded_year": 2015,
      "employee_count": 5000,
      ...
    }
  ]
}

# Response:
{
  "status": "success",
  "data": {
    "predictions": [
      {
        "index": 0,
        "lead_score": 85.42,
        "status": "success"
      },
      {
        "index": 1,
        "lead_score": 72.15,
        "status": "success"
      }
    ],
    "total": 2,
    "successful": 2,
    "status": "complete"
  }
}
```

### 4. Model Information
```bash
GET http://localhost:9000/ml/info

# Response:
{
  "status": "success",
  "model_info": {
    "model_name": "Lead Score Prediction Model",
    "model_type": "Random Forest Regressor",
    "status": "ready",
    "metrics": {
      "train_r2": 0.8662,
      "test_r2": 0.8235,
      "train_rmse": 3.9747,
      "test_rmse": 5.1611,
      "train_mae": 3.0259,
      "test_mae": 4.6994,
      "feature_importance": [...]
    }
  }
}
```

## Required Features for Prediction

The model requires the following features:

### Numerical Features (6):
- `founded_year` - Year company was founded
- `employee_count` - Number of employees
- `funding_total` - Total funding amount (in USD)
- `deal_value` - Deal value (in USD)
- `deal_probability` - Deal probability (0-1)
- `call_duration` - Call duration (in seconds)

### Categorical Features (13):
- `industry` - Industry sector
- `market_segment` - Market segment (e.g., Enterprise, SMB)
- `business_model` - Business model (e.g., SaaS, On-Premise)
- `contact_type` - Type of contact (e.g., Decision Maker, Influencer)
- `influence_level` - Influence level (High, Medium, Low)
- `lead_priority` - Lead priority (High, Medium, Low)
- `deal_stage` - Deal stage (Discovery, Demo, Proposal, etc.)
- `activity_type` - Type of activity (Call, Email, Meeting, etc.)
- `activity_outcome` - Outcome of activity (Success, Failure, etc.)
- `interaction_channel` - Communication channel (Email, Zoom, Phone, etc.)
- `call_outcome` - Outcome of call
- `email_direction` - Email direction (Inbound, Outbound)
- `interaction_sentiment` - Sentiment (Positive, Negative, Neutral)

## Configuration

### Environment Variables (.env)
```
ML_API_URL=http://localhost:5000
```

Change this if your Flask API runs on a different host/port.

## Files Modified/Created

### New Files:
1. `backend/ml/flask_api.py` - Flask API server for predictions
2. `backend/src/routes/ml.routes.ts` - Backend routes for ML endpoints
3. `backend/ml/flask_api.py` - Python prediction API

### Modified Files:
1. `backend/src/app.ts` - Added ML routes
2. `backend/.env` - Added ML_API_URL
3. `backend/ml/requirements.txt` - Added Flask & Flask-CORS

## Model Performance

The trained model achieved:
- **Training Accuracy (R²)**: 0.8662 (86.62%)
- **Test Accuracy (R²)**: 0.8235 (82.35%)
- **Training RMSE**: 3.97
- **Test RMSE**: 5.16
- **Most Important Feature**: Influence Level (45%)

## Usage in Frontend

Example React component to call the prediction API:

```typescript
const predictLeadScore = async (leadData: any) => {
  const response = await fetch('http://localhost:9000/ml/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify(leadData)
  });

  const result = await response.json();
  return result.prediction.lead_score;
};
```

## Troubleshooting

### Flask API not running
- Check if port 5000 is available
- Ensure Python dependencies are installed: `pip install -r backend/ml/requirements.txt`
- Verify model files exist: `backend/ml/models/lead_score_model.pkl`

### Model not found error
- Run training: `python backend/ml/train_model.py`
- Verify files in `backend/ml/models/`:
  - `lead_score_model.pkl`
  - `encoders.pkl`
  - `metrics.json`

### CORS errors
- Flask API has CORS enabled
- Ensure `ML_API_URL` in backend .env points to correct Flask server

### Connection refused errors
- Verify all three services are running (Backend, Flask API, Frontend)
- Check port availability (9000, 5000, 5173)
- Firewall rules may block connections

## Next Steps

1. ✅ Model trained and saved
2. ✅ Flask API server created
3. ✅ Backend routes integrated
4. **TODO**: Integrate predictions into frontend UI
5. **TODO**: Create lead scoring dashboard
6. **TODO**: Setup automated model retraining pipeline
