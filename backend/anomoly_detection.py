import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import io
import base64
import numpy as np
from scipy.stats import norm

def clean_floats(arr):
    # Replace NaN, inf, -inf with None for JSON serialization
    return [x if isinstance(x, (int, float)) and np.isfinite(x) else None for x in arr]

# Wilson score interval for binomial proportion
# Returns (lower, upper) bounds as floats in [0,1]
def wilson_interval(k, n, alpha=0.05):
    if n == 0:
        return 0.0, 1.0
    p = k / n
    z = norm.ppf(1 - alpha / 2)
    denominator = 1 + z**2 / n
    centre = p + z**2 / (2 * n)
    margin = z * np.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)
    lower = (centre - margin) / denominator
    upper = (centre + margin) / denominator
    # Clamp to [0,1]
    lower = max(0.0, lower)
    upper = min(1.0, upper)
    return lower, upper

def detect_binomial_ci_anomalies(df, banner_name, z=2, window=10):
    """
    Detect anomalies using Wilson interval based on historical CTR.
    - Aggregates CTR by date using Clicks / Impressions
    - Rolling historical baseline with Wilson CI for anomaly bounds
    """
    # Validate columns
    required_cols = ['.BannerCTA', 'Date', 'Impressions', 'Clicks']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing column '{col}' in input data")

    # Filter for specific banner
    df_banner = df[df['.BannerCTA'] == banner_name].copy()
    df_banner['Date'] = pd.to_datetime(df_banner['Date'], errors='coerce')
    df_banner = df_banner.dropna(subset=['Date'])

    # Aggregate by date
    df_daily = df_banner.groupby('Date', as_index=False).agg({'Clicks': 'sum', 'Impressions': 'sum'})
    df_daily['CTR'] = df_daily['Clicks'] / df_daily['Impressions']

    # Compute rolling sums of clicks and impressions, shifted by 1 to exclude current day
    df_daily['Clicks_roll'] = df_daily['Clicks'].shift(1).rolling(window=window).sum()
    df_daily['Impressions_roll'] = df_daily['Impressions'].shift(1).rolling(window=window).sum()

    # Calculate Wilson intervals on rolling sums as baseline
    # Convert z to alpha for two-sided interval: alpha = 2 * (1 - norm.cdf(z))
    alpha = 2 * (1 - norm.cdf(z)) if z > 0 else 0.05
    wilson_bounds = df_daily.apply(
        lambda row: wilson_interval(
            int(row['Clicks_roll']) if not pd.isna(row['Clicks_roll']) else 0,
            int(row['Impressions_roll']) if not pd.isna(row['Impressions_roll']) else 0,
            alpha=alpha
        )
        if not pd.isna(row['Clicks_roll']) and not pd.isna(row['Impressions_roll']) and row['Impressions_roll'] > 0
        else (np.nan, np.nan),
        axis=1
    )
    df_daily['Lower'] = wilson_bounds.apply(lambda x: x[0])
    df_daily['Upper'] = wilson_bounds.apply(lambda x: x[1])

    # Detect anomalies comparing current CTR to rolling Wilson bounds
    df_daily['Anomaly'] = (df_daily['CTR'] > df_daily['Upper']) | (df_daily['CTR'] < df_daily['Lower'])
    df_daily['Anomaly'] = df_daily['Anomaly'] & df_daily['Lower'].notna()

    # Require at least 2 consecutive anomalies
    anomaly_mask = df_daily['Anomaly'] & (df_daily['Anomaly'].shift(1) | df_daily['Anomaly'].shift(-1))
    df_daily['Anomaly'] = anomaly_mask
    print(df_daily[['Date', 'Clicks_roll', 'Impressions_roll', 'Lower', 'Upper']])

    # Prepare arrays for frontend plotting
    plot_data = {
        "dates": [d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d) for d in df_daily['Date']],
        "ctr": clean_floats(df_daily['CTR'].tolist()),
        "upper": clean_floats(df_daily['Upper'].tolist()),
        "lower": clean_floats(df_daily['Lower'].tolist()),
        "anomaly": df_daily['Anomaly'].tolist(),
        "clicks": df_daily['Clicks'].astype(int).tolist(),
        "impressions": df_daily['Impressions'].astype(int).tolist(),
    }

    # Prepare anomaly points for scatter
    anomaly_points = [
        {
            "date": row['Date'].strftime('%Y-%m-%d') if hasattr(row['Date'], 'strftime') else str(row['Date']),
            "ctr": row['CTR'] if isinstance(row['CTR'], (int, float)) and np.isfinite(row['CTR']) else None,
            "clicks": int(row['Clicks']),
            "impressions": int(row['Impressions'])
        }
        for _, row in df_daily[df_daily['Anomaly']].iterrows()
    ]

    # Prepare hover data for each point (date, clicks, impressions, ctr)
    hover_data = [
        {
            "Date": row['Date'].strftime('%Y-%m-%d') if hasattr(row['Date'], 'strftime') else str(row['Date']),
            "Clicks": int(row['Clicks']),
            "Impressions": int(row['Impressions']),
            "CTR": float(row['CTR']) if isinstance(row['CTR'], (int, float)) and np.isfinite(row['CTR']) else None,
            "Anomaly": bool(row['Anomaly'])
        }
        for _, row in df_daily.iterrows()
    ]

    # Also clean anomalies for JSON
    anomalies = df_daily[df_daily['Anomaly']].copy()
    anomalies['Date'] = anomalies['Date'].apply(lambda d: d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d))
    for col in ['CTR', 'Upper', 'Lower']:
        if col in anomalies.columns:
            anomalies[col] = anomalies[col].apply(lambda x: float(x) if isinstance(x, (int, float)) and np.isfinite(x) else None)
    anomalies_records = anomalies.to_dict(orient='records')

    return {
        "anomalies": anomalies_records,
        "plot_data": plot_data,
        "anomaly_points": anomaly_points,
        "method": f"Wilson CI (window={window}, alpha={alpha:.4f})",
        "hover_data": hover_data
    }
