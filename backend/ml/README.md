# Lead Score Prediction Model

This folder contains the machine learning model training pipeline for predicting lead scores in your CRM system.

## Overview

- **Model Type**: Random Forest Regressor
- **Target**: `lead_score` (0-100)
- **Training Data**: CSV file from your CRM
- **Purpose**: Predict which leads are most promising based on their characteristics

## Project Structure

```
ml/
├── train_model.py      # Training script (main)
├── predict.py          # Prediction script (use trained model)
├── requirements.txt    # Python dependencies
├── models/             # Trained model files (created after training)
│   ├── lead_score_model.pkl    # Trained model
│   ├── encoders.pkl            # Feature encoders
│   └── metrics.json            # Training metrics
└── README.md          # This file
```

## Prerequisites

- **Python 3.8+** (https://www.python.org/downloads/)
- **pip** (comes with Python)

## Setup Instructions

### Step 1: Install Python Dependencies

Navigate to this folder and install required packages:

```bash
cd backend/ml
# Windows (PowerShell):
./install_and_train.ps1

# macOS / Linux / Windows with Python on PATH:
pip install -r requirements.txt
```

This will install:
- `pandas` - Data manipulation
- `scikit-learn` - Machine learning
- `numpy` - Numerical computing
- `joblib` - Model serialization

### Step 2: Train the Model

Run the training script:

```bash
python train_model.py
```

**What this does:**
1. Loads your sample CRM data from `frontend/public/sample-crm-data.csv`
2. Preprocesses the data (handles missing values, encodes categories)
3. Trains a Random Forest model to predict lead scores
4. Evaluates the model on test data
5. Saves the trained model to `models/`

**Expected Output:**
```
==================================================
Lead Score Prediction Model Training
==================================================
Loading data from ../frontend/public/sample-crm-data.csv...
Data shape: (25, 138)
Columns: [...]
Preparing data...
Training model...
=== Model Performance ===
Training R² Score: 0.XXXX
Test R² Score: 0.XXXX
Training RMSE: X.XXXX
Test RMSE: X.XXXX
...
✓ Model training complete!
✓ Model saved: ./models/lead_score_model.pkl
✓ Encoders saved: ./models/encoders.pkl
✓ Metrics saved: ./models/metrics.json
```

### Step 3: Use the Trained Model

Once trained, you can make predictions:

```bash
python predict.py
```

Windows users: you can run the bundled helper which installs dependencies then trains
```powershell
./install_and_train.ps1
```

This will show a sample prediction using the trained model.

## Model Features

The model learns from these features:

### Numerical Features
- `founded_year` - Year company was founded
- `employee_count` - Number of employees
- `funding_total` - Total funding raised
- `deal_value` - Deal amount
- `deal_probability` - Probability of closing (0-1)
- `call_duration` - Call duration in seconds

### Categorical Features
- `industry` - Company industry
- `market_segment` - Market segment (Enterprise, SMB, etc.)
- `business_model` - Business model (SaaS, Hardware, etc.)
- `contact_type` - Contact type (Decision Maker, Influencer, etc.)
- `influence_level` - Influence level (High, Medium, Low)
- `lead_priority` - Lead priority
- `deal_stage` - Deal stage (Discovery, Proposal, etc.)
- `activity_type` - Activity type (Call, Email, Meeting, etc.)
- `activity_outcome` - Activity outcome (Success, Pending, etc.)
- `interaction_channel` - Channel (Zoom, Email, Phone, etc.)
- `call_outcome` - Call outcome
- `email_direction` - Email direction (Inbound, Outbound)
- `interaction_sentiment` - Sentiment (Positive, Negative, Neutral)

## Model Performance

The trained model provides:
- **R² Score**: How well the model explains variance in lead scores
- **RMSE**: Average prediction error
- **MAE**: Mean absolute error
- **Feature Importance**: Which features matter most for predictions

Check `models/metrics.json` after training for detailed metrics.

## Using Your Own CSV Data

To train on your own CRM data:

1. **Prepare your CSV file** with the required columns listed above
2. **Update the path** in `train_model.py`:
   ```python
   CSV_FILE = "path/to/your/data.csv"
   ```
3. **Run training** again:
   ```bash
   python train_model.py
   ```

### Faster training mode
For quicker iterations, use the fast option:
```bash
python train_model.py --fast
```

To force a specific model type:
```bash
python train_model.py --model random_forest
python train_model.py --model hgb
```

## Integration with Backend

To integrate predictions into your Node.js backend:

1. **Option A: Direct Python Call**
   ```typescript
   import { exec } from 'child_process';
   
   // Call predict.py from Node.js
   exec('python predict.py', (error, stdout, stderr) => {
     // Handle results
   });
   ```

2. **Option B: REST API**
   - Create a Flask/FastAPI endpoint wrapping `predict.py`
   - Call it from your backend

3. **Option C: Direct Port**
   - Load the model in Node.js using `node-pickle` or similar
   - Make predictions directly

## Example Usage (Python)

```python
from predict import predict_lead_score

# Sample data
lead_data = {
    'founded_year': 2013,
    'employee_count': 6000,
    'funding_total': 3500000000,
    'deal_value': 120000,
    'deal_probability': 0.9,
    'call_duration': 1200,
    'industry': 'Technology',
    'market_segment': 'Enterprise',
    'business_model': 'SaaS',
    'contact_type': 'Decision Maker',
    'influence_level': 'High',
    'lead_priority': 'High',
    'deal_stage': 'Discovery',
    'activity_type': 'Call',
    'activity_outcome': 'Success',
    'interaction_channel': 'Zoom',
    'call_outcome': 'Migration plan approved',
    'email_direction': 'Outbound',
    'interaction_sentiment': 'Positive'
}

# Get prediction
lead_score = predict_lead_score(lead_data)
print(f"Predicted Lead Score: {lead_score}")  # Output: 85.42
```

## Troubleshooting

### `ModuleNotFoundError: No module named 'pandas'`
- Install dependencies: `pip install -r requirements.txt`

### `FileNotFoundError: ../frontend/public/sample-crm-data.csv`
- Update the CSV path in `train_model.py` to match your setup
- Ensure the path is correct relative to the script location

### `No such file or directory: models/lead_score_model.pkl`
- Run `python train_model.py` first to train and save the model

### Python not found
- Install Python 3.8+: https://www.python.org/downloads/
- Add Python to your PATH

## Next Steps

1. **Train the model**: Run `python train_model.py`
2. **Test predictions**: Run `python predict.py`
3. **Integrate with backend**: Add prediction API endpoints
4. **Monitor performance**: Track actual vs predicted lead scores
5. **Retrain periodically**: Update model as you get more data

## Files

- `train_model.py` - Main training script
- `predict.py` - Prediction script
- `requirements.txt` - Python dependencies
- `models/lead_score_model.pkl` - Trained model (after training)
- `models/encoders.pkl` - Feature encoders (after training)
- `models/metrics.json` - Training metrics (after training)

## Docker (alternative)

If you cannot install a compatible Python on the host, you can run training inside Docker (recommended when host Python version is incompatible):

1. Build and run using the included helper (PowerShell):

```powershell
cd backend/ml
./build_and_run_docker.ps1
```

2. Or build and run manually:

```bash
cd backend/ml
docker build -t greencrm-leadscore:latest .
docker run --rm -v $(pwd)/models:/app/models greencrm-leadscore:latest
```

The container uses Python 3.11 and will install dependencies, run `train_model.py`, and write artifacts into the mounted `models/` directory.


## Support

For questions or issues:
1. Check the troubleshooting section above
2. Verify your CSV data format matches expected columns
3. Ensure all Python dependencies are installed
