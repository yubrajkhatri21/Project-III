"""
Lead Score Prediction Model Training Script
Trains a machine learning model to predict lead scores based on CRM data
"""

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

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

TARGET = 'lead_score'
NUMERICAL_FEATURES = [
    'founded_year',
    'employee_count',
    'funding_total',
    'deal_value',
    'deal_probability',
    'call_duration'
]
CATEGORICAL_FEATURES = [
    'industry',
    'market_segment',
    'business_model',
    'contact_type',
    'influence_level',
    'lead_priority',
    'deal_stage',
    'activity_type',
    'activity_outcome',
    'interaction_channel',
    'call_outcome',
    'email_direction',
    'interaction_sentiment'
]


def parse_args():
    parser = argparse.ArgumentParser(description='Train the lead score prediction model.')
    parser.add_argument(
        '--fast',
        action='store_true',
        help='Use a smaller, faster model configuration for quicker training.'
    )
    parser.add_argument(
        '--model',
        choices=['auto', 'random_forest', 'hgb'],
        default='auto',
        help='Choose the model type used for training. Defaults to auto selection.'
    )
    return parser.parse_args()


def load_data(csv_file):
    """Load CRM data from CSV"""
    print(f"Loading data from {csv_file}...")
    if not Path(csv_file).exists():
        raise FileNotFoundError(
            f"CSV file not found: {csv_file}\nTried multiple locations. Make sure sample-crm-data.csv is present under a frontend/public folder and mount/copy it into the ml container or repo."
        )
    df = pd.read_csv(csv_file, low_memory=False)
    print(f"Data shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    return df


def prepare_data(df):
    """Prepare data for model training"""
    print("\nPreparing data...")

    df = df.dropna(subset=[TARGET])
    print(f"Samples with lead_score: {len(df)}")

    available_numerical = [f for f in NUMERICAL_FEATURES if f in df.columns]
    available_categorical = [f for f in CATEGORICAL_FEATURES if f in df.columns]

    print(f"Using numerical features: {available_numerical}")
    print(f"Using categorical features: {available_categorical}")

    df_processed = df.copy()
    if available_numerical:
        df_processed[available_numerical] = df_processed[available_numerical].apply(
            pd.to_numeric, errors='coerce'
        )
        df_processed[available_numerical] = df_processed[available_numerical].fillna(
            df_processed[available_numerical].median()
        )

    if available_categorical:
        df_processed[available_categorical] = df_processed[available_categorical].astype(str).fillna('Unknown')

    encoders = {}
    for col in available_categorical:
        le = LabelEncoder()
        df_processed[col] = le.fit_transform(df_processed[col])
        encoders[col] = le

    X = df_processed[available_numerical + available_categorical]
    y = df_processed[TARGET]

    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Target shape: {y.shape}")
    print(f"Target (lead_score) statistics:\n{y.describe()}")

    return X, y, available_numerical, available_categorical, encoders


def select_model(n_samples, fast=False, model_choice='auto'):
    if fast:
        print("Using fast model configuration for quicker training.")
        return (
            RandomForestRegressor(
                n_estimators=40,
                max_depth=12,
                min_samples_split=6,
                min_samples_leaf=3,
                max_features='sqrt',
                n_jobs=-1,
                random_state=42,
            ),
            'Fast RandomForestRegressor'
        )

    if model_choice == 'random_forest':
        return (
            RandomForestRegressor(
                n_estimators=100,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                max_features='sqrt',
                n_jobs=-1,
                random_state=42,
            ),
            'RandomForestRegressor'
        )

    if model_choice == 'hgb' or (model_choice == 'auto' and n_samples >= 2000):
        print("Large dataset detected — using HistGradientBoostingRegressor with early stopping.")
        return (
            HistGradientBoostingRegressor(
                max_iter=100,
                learning_rate=0.1,
                max_depth=10,
                early_stopping='auto',
                validation_fraction=0.1,
                random_state=42,
            ),
            'HistGradientBoostingRegressor'
        )

    return (
        RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',
            n_jobs=-1,
            random_state=42,
        ),
        'RandomForestRegressor'
    )


def train_model(X, y, fast=False, model_choice='auto'):
    """Train the lead score model"""
    print("\nTraining model...")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"Training set size: {X_train.shape[0]}")
    print(f"Test set size: {X_test.shape[0]}")

    model, model_name = select_model(len(X), fast=fast, model_choice=model_choice)
    print(f"Model selection: {model_name}")
    model.fit(X_train, y_train)

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

    if hasattr(model, 'feature_importances_'):
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)

        print("\n=== Top 10 Important Features ===")
        print(feature_importance.head(10))
        feature_importance_records = feature_importance.to_dict('records')
    else:
        feature_importance_records = []

    metrics = {
        'model_type': model_name,
        'train_r2': train_r2,
        'test_r2': test_r2,
        'train_rmse': train_rmse,
        'test_rmse': test_rmse,
        'train_mae': train_mae,
        'test_mae': test_mae,
        'feature_importance': feature_importance_records,
    }

    return model, metrics


def save_model(model, encoders, metrics):
    """Save trained model and encoders"""
    print(f"\nSaving model to {MODEL_SAVE_PATH}...")
    joblib.dump(model, str(MODEL_SAVE_PATH))

    print(f"Saving encoders to {ENCODER_SAVE_PATH}...")
    joblib.dump(encoders, str(ENCODER_SAVE_PATH))

    print(f"Saving metrics to {METRICS_SAVE_PATH}...")
    with open(str(METRICS_SAVE_PATH), 'w') as f:
        json.dump(metrics, f, indent=2)

    print("✓ Model training complete!")
    print(f"✓ Model saved: {MODEL_SAVE_PATH}")
    print(f"✓ Encoders saved: {ENCODER_SAVE_PATH}")
    print(f"✓ Metrics saved: {METRICS_SAVE_PATH}")


def main():
    """Main training pipeline"""
    args = parse_args()

    print("=" * 50)
    print("Lead Score Prediction Model Training")
    print("=" * 50)

    try:
        df = load_data(CSV_FILE)
    except FileNotFoundError as e:
        print(str(e))
        return
    except Exception as e:
        print(f"Failed to load data: {e}")
        return

    X, y, num_features, cat_features, encoders = prepare_data(df)
    model, metrics = train_model(X, y, fast=args.fast, model_choice=args.model)
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
