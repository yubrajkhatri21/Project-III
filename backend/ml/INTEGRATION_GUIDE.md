"""
Node.js Integration Examples for Lead Score Prediction Model
This file shows how to call the Python ML model from your TypeScript backend
"""

# Option 1: Using child_process to run predict.py
# File: backend/src/services/leadScoreService.ts

```typescript
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface LeadData {
  founded_year?: number;
  employee_count?: number;
  funding_total?: number;
  deal_value?: number;
  deal_probability?: number;
  call_duration?: number;
  industry?: string;
  market_segment?: string;
  business_model?: string;
  contact_type?: string;
  influence_level?: string;
  lead_priority?: string;
  deal_stage?: string;
  activity_type?: string;
  activity_outcome?: string;
  interaction_channel?: string;
  call_outcome?: string;
  email_direction?: string;
  interaction_sentiment?: string;
}

export async function predictLeadScore(data: LeadData): Promise<number> {
  try {
    const pythonScriptPath = path.join(__dirname, '../../ml/predict_api.py');
    
    // Convert data to JSON for Python script
    const dataJson = JSON.stringify(data);
    
    // Run Python prediction
    const { stdout } = await execAsync(
      `python "${pythonScriptPath}" '${dataJson}'`
    );
    
    // Parse the result
    const prediction = parseFloat(stdout.trim());
    return prediction;
  } catch (error) {
    console.error('Error predicting lead score:', error);
    throw new Error('Failed to predict lead score');
  }
}

// Usage in your controller:
import { predictLeadScore } from '../services/leadScoreService';

router.post('/api/predict-lead-score', async (req, res) => {
  try {
    const leadData = req.body;
    const score = await predictLeadScore(leadData);
    res.json({ lead_score: score });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

# Option 2: Direct Model Loading with joblib (Advanced)
# This requires: npm install node-gyp python-shell

```typescript
import { PythonShell } from 'python-shell';
import path from 'path';

export async function predictLeadScoreViaPythonShell(
  data: LeadData
): Promise<number> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../ml/predict.py');
    
    const pyshell = new PythonShell(scriptPath, {
      pythonPath: process.env.PYTHON_PATH || 'python',
    });

    pyshell.send(JSON.stringify(data));

    pyshell.on('message', (message: string) => {
      const prediction = parseFloat(message);
      resolve(prediction);
    });

    pyshell.end((err) => {
      if (err) reject(err);
    });
  });
}
```

# Option 3: REST API Wrapper (Recommended for Production)
# Create a separate Flask/FastAPI service that exposes the model

# backend/ml/app.py
```python
from flask import Flask, request, jsonify
from predict import predict_lead_score
import json

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    
    try:
        score = predict_lead_score(data)
        return jsonify({
            'lead_score': score,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 400

if __name__ == '__main__':
    app.run(host='localhost', port=5000)
```

# Then in your TypeScript backend:
```typescript
export async function predictLeadScore(data: LeadData): Promise<number> {
  try {
    const response = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (result.status === 'success') {
      return result.lead_score;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error predicting lead score:', error);
    throw error;
  }
}
```

# API Endpoint Example
POST /predict-lead-score
Content-Type: application/json

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

Response:
{
  "lead_score": 85.42,
  "status": "success"
}
