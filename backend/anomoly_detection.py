import pandas as pd
import numpy as np

def clean_floats(arr):
    # Replace NaN, inf, -inf with None for JSON serialization
    return [x if isinstance(x, (int, float)) and np.isfinite(x) else None for x in arr]

def detect_moving_average_anomalies(df, banner_name, over_under=0.3, window=10):
    """
    Detects anomalies in CTR (click-through rate) for a given banner using a moving average model.

    The function:
    - Filters data by the specified banner name.
    - Aggregates clicks and impressions by date.
    - Computes CTR = Clicks / Impressions.
    - Calculates a moving average CTR based on a rolling window (excluding the current day).
    - Flags anomalies where the actual CTR is outside ±`over_under`% bounds of the moving average.
    - Only considers dates with more than 5000 impressions.
    - Requires anomalies to occur in at least two consecutive days to be marked.

    Args:
        df (pd.DataFrame): Input DataFrame containing columns '.BannerCTA', 'Date', 'Clicks', and 'Impressions'.
        banner_name (str): Banner name to isolate for analysis (from the '.BannerCTA' column).
        over_under (float, optional): Threshold for deviation from the moving average (e.g., 0.3 = ±30%). Defaults to 0.3.
        window (int, optional): Number of historical days used to calculate the moving average. Defaults to 10.

    Returns:
        dict: {
            'anomalies': List of anomaly records as dictionaries,
            'plot_data': Dict with arrays for dates, CTR, bounds, clicks, impressions, and anomaly flags,
            'anomaly_points': List of simplified anomaly points for scatter plot overlays,
            'hover_data': List of dictionaries with CTR and metadata per point,
            'method': Description string of the detection method.
        }

    Raises:
        ValueError: If required columns are missing from the input DataFrame.
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

    # Calculate upper and lower bounds (+/- over_under% of moving average)
    df_daily['Upper'] = df_daily['CTR_MA'] * (1 + over_under)
    df_daily['Lower'] = df_daily['CTR_MA'] * (1 - over_under)

    # Detect anomalies: outside of +/- over_under% of moving average, only if moving average is not NaN
    df_daily['Anomaly'] = (
        (df_daily['CTR'] > df_daily['Upper']) | (df_daily['CTR'] < df_daily['Lower'])
    ) & df_daily['CTR_MA'].notna()

    # Require at least 2 consecutive anomalies
    # To disable, comment the next two lines out
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
        "method": f"Moving Average (window={window} days, bounds=±{over_under * 100}%)",
        "hover_data": hover_data
    }
