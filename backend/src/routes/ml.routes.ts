import { Hono, Context } from 'hono';
import { authMiddleware } from '../middlewares/authMiddleware.ts';
import catchAsync from '../utils/catchAsync.ts';
import ApiError from '../utils/ApiError.ts';

const mlRoutes = new Hono();

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000';

/**
 * Health check for ML prediction service
 */
mlRoutes.get('/health', catchAsync(async (c: Context) => {
  try {
    const response = await fetch(`${ML_API_URL}/health`, {
      method: 'GET'
    });

    if (!response.ok) {
      return c.json({ 
        status: 'error',
        message: 'ML service not available',
        service_url: ML_API_URL
      }, 503);
    }

    const data = await response.json();
    return c.json({
      status: 'success',
      ml_service: data,
      service_url: ML_API_URL
    });
  } catch (error) {
    return c.json({ 
      status: 'error',
      message: 'Failed to connect to ML service',
      service_url: ML_API_URL,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 503);
  }
}));

/**
 * Predict lead score based on lead features
 * POST /ml/predict
 */
mlRoutes.post('/predict', authMiddleware, catchAsync(async (c: Context) => {
  const body = await c.req.json();

  if (!body) {
    throw new ApiError(400, 'Request body is required');
  }

  try {
    const response = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        response.status,
        errorData.message || 'Prediction failed'
      );
    }

    const prediction = await response.json();
    return c.json({
      status: 'success',
      prediction
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      `ML service error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}));

/**
 * Predict lead scores for multiple records
 * POST /ml/predict/batch
 */
mlRoutes.post('/predict/batch', authMiddleware, catchAsync(async (c: Context) => {
  const body = await c.req.json();

  if (!body || !body.records || !Array.isArray(body.records)) {
    throw new ApiError(400, 'Request must contain "records" array');
  }

  try {
    const response = await fetch(`${ML_API_URL}/predict/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        response.status,
        errorData.message || 'Batch prediction failed'
      );
    }

    const predictions = await response.json();
    return c.json({
      status: 'success',
      data: predictions
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      `ML service error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}));

/**
 * Get model information and metrics
 * GET /ml/info
 */
mlRoutes.get('/info', catchAsync(async (c: Context) => {
  try {
    const response = await fetch(`${ML_API_URL}/info`, {
      method: 'GET'
    });

    if (!response.ok) {
      return c.json({ 
        status: 'error',
        message: 'Failed to retrieve model information'
      }, response.status);
    }

    const info = await response.json();
    return c.json({
      status: 'success',
      model_info: info
    });
  } catch (error) {
    throw new ApiError(
      500,
      `Failed to get model info: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}));

export default mlRoutes;
