import pandas as pd
import numpy as np

def clean_floats(arr):
    # Replace NaN, inf, -inf with None for JSON serialization
    return [x if isinstance(x, (int, float)) and np.isfinite(x) else None for x in arr]

def detect_moving_average_anomalies(df, banner_name, z=None, window=10):
    """
    Detect anomalies using moving average of CTR with +/-10% bounds.
    - Aggregates CTR by date using Clicks / Impressions
    - Rolling historical baseline with moving average for anomaly bounds
    - Anomaly if CTR is >10% above or below moving average of previous window days
    - Moving average is defined as sum(clicks) / sum(impressions) over the past X days (excluding current day)
    Only include data points with more than 100 impressions.
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

    # Only keep data points with more than 5000 impressions
    df_daily = df_daily[df_daily['Impressions'] > 5000].reset_index(drop=True)

    # Compute rolling sum of Clicks and Impressions, shifted by 1 to exclude current day
    clicks_rolling = df_daily['Clicks'].shift(1).rolling(window=window).sum()
    impressions_rolling = df_daily['Impressions'].shift(1).rolling(window=window).sum()
    # Compute moving average CTR as sum(clicks) / sum(impressions) over window
    df_daily['CTR_MA'] = clicks_rolling / impressions_rolling

    # Calculate upper and lower bounds (+/-10% of moving average)
    df_daily['Upper'] = df_daily['CTR_MA'] * 1.3
    df_daily['Lower'] = df_daily['CTR_MA'] * 0.7

    # Detect anomalies: outside of +/-10% of moving average, only if moving average is not NaN
    df_daily['Anomaly'] = (
        (df_daily['CTR'] > df_daily['Upper']) | (df_daily['CTR'] < df_daily['Lower'])
    ) & df_daily['CTR_MA'].notna()

    # Require at least 2 consecutive anomalies
    anomaly_mask = df_daily['Anomaly'] & (df_daily['Anomaly'].shift(1) | df_daily['Anomaly'].shift(-1))
    df_daily['Anomaly'] = anomaly_mask

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
        "method": f"Moving Average (window={window}, bounds=±10%)",
        "hover_data": hover_data
    }
