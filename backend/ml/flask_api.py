"""
Flask API Server for Lead Score Predictions
Runs on port 5000 and provides REST endpoints for the trained ML model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from predict import predict_lead_score
import logging
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Lead Score Prediction API',
        'version': '1.0.0'
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict lead score for given features
    
    Expected JSON payload:
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
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'No JSON data provided',
                'status': 'error'
            }), 400
        
        # Make prediction
        score = predict_lead_score(data)
        
        return jsonify({
            'lead_score': score,
            'status': 'success',
            'message': f'Lead score prediction: {score}'
        }), 200
    
    except FileNotFoundError as e:
        logger.error(f"Model not found: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error',
            'message': 'Model files not found. Please train the model first.'
        }), 404
    
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error',
            'message': 'Invalid input data'
        }), 400
    
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error',
            'message': 'Error during prediction'
        }), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Predict lead scores for multiple records
    
    Expected JSON payload:
    {
        "records": [
            {...},
            {...}
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'records' not in data:
            return jsonify({
                'error': 'No records provided',
                'status': 'error'
            }), 400
        
        records = data['records']
        if not isinstance(records, list):
            return jsonify({
                'error': 'Records must be a list',
                'status': 'error'
            }), 400
        
        predictions = []
        for i, record in enumerate(records):
            try:
                score = predict_lead_score(record)
                predictions.append({
                    'index': i,
                    'lead_score': score,
                    'status': 'success'
                })
            except Exception as e:
                predictions.append({
                    'index': i,
                    'error': str(e),
                    'status': 'error'
                })
        
        return jsonify({
            'predictions': predictions,
            'total': len(records),
            'successful': sum(1 for p in predictions if p['status'] == 'success'),
            'status': 'complete'
        }), 200
    
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error',
            'message': 'Error during batch prediction'
        }), 500

@app.route('/info', methods=['GET'])
def info():
    """Get model information"""
    try:
        from pathlib import Path
        import json
        
        BASE_DIR = Path(__file__).resolve().parent
        METRICS_PATH = BASE_DIR / 'models' / 'metrics.json'
        
        if METRICS_PATH.exists():
            with open(METRICS_PATH, 'r') as f:
                metrics = json.load(f)
            
            return jsonify({
                'model_name': 'Lead Score Prediction Model',
                'model_type': 'Random Forest Regressor',
                'status': 'ready',
                'metrics': metrics
            }), 200
        else:
            return jsonify({
                'error': 'Metrics file not found',
                'status': 'error'
            }), 404
    
    except Exception as e:
        logger.error(f"Info error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

if __name__ == '__main__':
    logger.info("Starting Lead Score Prediction API Server...")
    logger.info("Server running on http://localhost:5000")
    logger.info("Health check: GET http://localhost:5000/health")
    logger.info("Predict: POST http://localhost:5000/predict")
    logger.info("Model info: GET http://localhost:5000/info")
    app.run(host='0.0.0.0', port=5000, debug=True)
