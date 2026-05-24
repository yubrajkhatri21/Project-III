"""
Lead Score Prediction API Script
Accepts JSON input from command line and returns prediction
Useful for Node.js integration via child_process
"""

import sys
import json
from predict import predict_lead_score

def main():
    # Accept JSON either as first argv or from stdin
    try:
        if not sys.stdin.isatty():
            data_str = sys.stdin.read().strip()
        elif len(sys.argv) >= 2:
            data_str = sys.argv[1]
        else:
            print("Usage: python predict_api.py '{json_data}' OR pipe JSON to stdin")
            sys.exit(1)

        data = json.loads(data_str)
        score = predict_lead_score(data)

        result = {
            'lead_score': score,
            'status': 'success'
        }
        print(json.dumps(result))

    except json.JSONDecodeError as e:
        print(json.dumps({
            'error': f'Invalid JSON: {str(e)}',
            'status': 'error'
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'status': 'error'
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
