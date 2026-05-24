"""
Lead Score Prediction - Use trained model to make predictions
"""

import pandas as pd
import joblib
import json
from pathlib import Path

# Resolve paths relative to this script
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / 'models' / 'lead_score_model.pkl'
ENCODER_PATH = BASE_DIR / 'models' / 'encoders.pkl'

def load_model():
    """Load trained model and encoders"""
    if not MODEL_PATH.exists() or not ENCODER_PATH.exists():
        raise FileNotFoundError(f"Model or encoders not found in {MODEL_PATH.parent}.\nRun train_model.py first.")
    model = joblib.load(str(MODEL_PATH))
    encoders = joblib.load(str(ENCODER_PATH))
    return model, encoders

def predict_lead_score(data_dict):
    """
    Predict lead score for new data
    
    Args:
        data_dict: Dictionary with features as keys
        
    Returns:
        Predicted lead score (0-100)
    """
    model, encoders = load_model()
    
    # Create DataFrame
    df = pd.DataFrame([data_dict])
    
    # Numerical features
    numerical_features = [
        'founded_year', 'employee_count', 'funding_total',
        'deal_value', 'deal_probability', 'call_duration'
    ]
    
    # Categorical features
    categorical_features = [
        'industry', 'market_segment', 'business_model',
        'contact_type', 'influence_level', 'lead_priority',
        'deal_stage', 'activity_type', 'activity_outcome',
        'interaction_channel', 'call_outcome', 'email_direction',
        'interaction_sentiment'
    ]
    
    # Handle missing values
    for col in numerical_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            if df[col].isna().any():
                df[col].fillna(0, inplace=True)
    
    for col in categorical_features:
        if col in df.columns:
            df[col].fillna('Unknown', inplace=True)
            # Encode using saved encoders
            if col in encoders:
                df[col] = encoders[col].transform(df[col])
    
    # Select features (same as training)
    available_features = [f for f in (numerical_features + categorical_features) if f in df.columns]
    X = df[available_features]
    
    # Make prediction
    prediction = model.predict(X)[0]
    
    # Ensure prediction is between 0-100
    prediction = max(0, min(100, prediction))
    
    return round(prediction, 2)

if __name__ == "__main__":
    # Example usage
    sample_data = {
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
    
    print("Sample prediction:")
    score = predict_lead_score(sample_data)
    print(f"Predicted Lead Score: {score}")
