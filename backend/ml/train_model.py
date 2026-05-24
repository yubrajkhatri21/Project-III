"""
Lead Score Prediction Model Training Script
Trains a machine learning model to predict lead scores based on CRM data
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os
from pathlib import Path

# Resolve paths relative to this script to avoid working-directory issues
BASE_DIR = Path(__file__).resolve().parent

# Candidate CSV locations (try several common layouts and container mounts)
CSV_CANDIDATES = [
    BASE_DIR / 'frontend' / 'public' / 'sample-crm-data.csv',
    BASE_DIR.parent / 'frontend' / 'public' / 'sample-crm-data.csv',
    BASE_DIR.parent.parent / 'frontend' / 'public' / 'sample-crm-data.csv',
    Path('/app') / 'frontend' / 'public' / 'sample-crm-data.csv',
    Path('/frontend') / 'public' / 'sample-crm-data.csv',
]

CSV_FILE = None
for p in CSV_CANDIDATES:
    if p.exists():
        CSV_FILE = p
        break
if CSV_FILE is None:
    # Default to first candidate for error messaging
    CSV_FILE = CSV_CANDIDATES[0]
MODELS_DIR = BASE_DIR / 'models'
MODEL_SAVE_PATH = MODELS_DIR / 'lead_score_model.pkl'
ENCODER_SAVE_PATH = MODELS_DIR / 'encoders.pkl'
METRICS_SAVE_PATH = MODELS_DIR / 'metrics.json'

# Create models directory if it doesn't exist
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def load_data(csv_file):
    """Load CRM data from CSV"""
    print(f"Loading data from {csv_file}...")
    if not Path(csv_file).exists():
        raise FileNotFoundError(f"CSV file not found: {csv_file}\nTried multiple locations. Make sure sample-crm-data.csv is present under a frontend/public folder and mount/copy it into the ml container or repo.")
    df = pd.read_csv(csv_file)
    print(f"Data shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    return df

def prepare_data(df):
    """Prepare data for model training"""
    print("\nPreparing data...")
    
    # Target variable
    target = 'lead_score'
    
    # Drop rows with missing target
    df = df.dropna(subset=[target])
    print(f"Samples with lead_score: {len(df)}")
    
    # Select features for the model
    # Numerical features
    numerical_features = [
        'founded_year', 'employee_count', 'funding_total',
        'deal_value', 'deal_probability', 'call_duration'
    ]
    
    # Categorical features to encode
    categorical_features = [
        'industry', 'market_segment', 'business_model',
        'contact_type', 'influence_level', 'lead_priority',
        'deal_stage', 'activity_type', 'activity_outcome',
        'interaction_channel', 'call_outcome', 'email_direction',
        'interaction_sentiment'
    ]
    
    # Keep only features that exist in the dataset
    available_numerical = [f for f in numerical_features if f in df.columns]
    available_categorical = [f for f in categorical_features if f in df.columns]
    
    print(f"Using numerical features: {available_numerical}")
    print(f"Using categorical features: {available_categorical}")
    
    # Handle missing values
    df_processed = df.copy()
    
    for col in available_numerical:
        df_processed[col] = pd.to_numeric(df_processed[col], errors='coerce')
        df_processed[col].fillna(df_processed[col].median(), inplace=True)
    
    for col in available_categorical:
        df_processed[col].fillna('Unknown', inplace=True)
    
    # Encode categorical features
    encoders = {}
    for col in available_categorical:
        le = LabelEncoder()
        df_processed[col] = le.fit_transform(df_processed[col])
        encoders[col] = le
    
    # Prepare feature matrix and target
    X = df_processed[available_numerical + available_categorical]
    y = df_processed[target]
    
    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Target shape: {y.shape}")
    print(f"Target (lead_score) statistics:\n{y.describe()}")
    
    return X, y, available_numerical, available_categorical, encoders

def train_model(X, y):
    """Train the Random Forest model"""
    print("\nTraining model...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"Training set size: {X_train.shape[0]}")
    print(f"Test set size: {X_test.shape[0]}")
    
    # Train Random Forest
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    train_r2 = r2_score(y_train, y_pred_train)
    test_r2 = r2_score(y_test, y_pred_test)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    train_mae = mean_absolute_error(y_train, y_pred_train)
    test_mae = mean_absolute_error(y_test, y_pred_test)
    
    print("\n=== Model Performance ===")
    print(f"Training R² Score: {train_r2:.4f}")
    print(f"Test R² Score: {test_r2:.4f}")
    print(f"Training RMSE: {train_rmse:.4f}")
    print(f"Test RMSE: {test_rmse:.4f}")
    print(f"Training MAE: {train_mae:.4f}")
    print(f"Test MAE: {test_mae:.4f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n=== Top 10 Important Features ===")
    print(feature_importance.head(10))
    
    metrics = {
        'train_r2': train_r2,
        'test_r2': test_r2,
        'train_rmse': train_rmse,
        'test_rmse': test_rmse,
        'train_mae': train_mae,
        'test_mae': test_mae,
        'feature_importance': feature_importance.to_dict('records')
    }
    
    return model, metrics

def save_model(model, encoders, metrics):
    """Save trained model and encoders"""
    print(f"\nSaving model to {MODEL_SAVE_PATH}...")
    joblib.dump(model, str(MODEL_SAVE_PATH))
    
    print(f"Saving encoders to {ENCODER_SAVE_PATH}...")
    joblib.dump(encoders, str(ENCODER_SAVE_PATH))
    
    print(f"Saving metrics to {METRICS_SAVE_PATH}...")
    import json
    with open(str(METRICS_SAVE_PATH), 'w') as f:
        # Convert to serializable format
        metrics_to_save = {
            'train_r2': float(metrics['train_r2']),
            'test_r2': float(metrics['test_r2']),
            'train_rmse': float(metrics['train_rmse']),
            'test_rmse': float(metrics['test_rmse']),
            'train_mae': float(metrics['train_mae']),
            'test_mae': float(metrics['test_mae']),
            'feature_importance': metrics['feature_importance']
        }
        json.dump(metrics_to_save, f, indent=2)
    
    print("✓ Model training complete!")
    print(f"✓ Model saved: {MODEL_SAVE_PATH}")
    print(f"✓ Encoders saved: {ENCODER_SAVE_PATH}")
    print(f"✓ Metrics saved: {METRICS_SAVE_PATH}")

def main():
    """Main training pipeline"""
    print("=" * 50)
    print("Lead Score Prediction Model Training")
    print("=" * 50)
    
    # Load data
    try:
        df = load_data(CSV_FILE)
    except FileNotFoundError as e:
        print(str(e))
        return
    except Exception as e:
        print(f"Failed to load data: {e}")
        return
    
    # Prepare data
    X, y, num_features, cat_features, encoders = prepare_data(df)
    
    # Train model
    model, metrics = train_model(X, y)
    
    # Save model
    save_model(model, encoders, metrics)
    
    print("\n" + "=" * 50)
    print("Training Complete!")
    print("=" * 50)

if __name__ == "__main__":
    try:
        main()
    except ImportError as e:
        print(f"Missing package: {e}.\nInstall dependencies: python -m pip install -r requirements.txt")
    except Exception as e:
        print(f"Unexpected error: {e}")
