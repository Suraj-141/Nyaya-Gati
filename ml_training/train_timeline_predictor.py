import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, TimeSeriesSplit
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import matplotlib.pyplot as plt
import os
import seaborn as sns

class TimelinePredictor:
    def __init__(self):
        self.rf_hearings = None
        self.rf_duration = None
        self.xgb_hearings = None
        self.xgb_duration = None
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.feature_names = []
    
    def engineer_features(self, df):
        """
        Feature engineering from raw case data
        """
        features = df.copy()
        
        # Encode categorical variables
        if 'case_type' in features.columns:
            if 'case_type' not in self.label_encoders:
                self.label_encoders['case_type'] = LabelEncoder()
                features['case_type_encoded'] = self.label_encoders['case_type'].fit_transform(features['case_type'])
            else:
                features['case_type_encoded'] = self.label_encoders['case_type'].transform(features['case_type'])
        
        # Fill missing values to prevent errors
        for col in ['parties_count', 'evidence_docs', 'witness_count', 'statutes_cited', 'judge_workload', 'court_backlog', 'filing_month']:
            if col not in features.columns:
                features[col] = 0
        if 'has_constitutional_question' not in features.columns:
            features['has_constitutional_question'] = False
            
        # Complexity score (weighted sum of indicators)
        features['complexity_score'] = (
            features['parties_count'] * 0.2 +
            features['evidence_docs'] * 0.1 +
            features['witness_count'] * 0.15 +
            features['statutes_cited'] * 0.25 +
            features['has_constitutional_question'].astype(int) * 0.3
        )
        
        # Workload pressure (normalized)
        features['workload_pressure'] = (
            features['judge_workload'] * 0.6 +
            features['court_backlog'] * 0.4
        ) / 1000  # Normalize
        
        # Seasonal indicators
        features['is_pre_vacation'] = features['filing_month'].isin([4, 5, 11, 12]).astype(int)
        
        # Interaction features
        features['complexity_x_workload'] = features['complexity_score'] * features['workload_pressure']
        
        # Select final feature columns
        feature_cols = [
            'case_type_encoded',
            'parties_count',
            'evidence_docs',
            'witness_count',
            'statutes_cited',
            'has_constitutional_question',
            'judge_workload',
            'court_backlog',
            'filing_month',
            'complexity_score',
            'workload_pressure',
            'is_pre_vacation',
            'complexity_x_workload'
        ]
        
        # Fill remaining NaNs
        features[feature_cols] = features[feature_cols].fillna(features[feature_cols].median())
        
        self.feature_names = feature_cols
        return features[feature_cols]
    
    def plot_residuals(self, y_true, y_pred, target_name, output_dir):
        """Plot and analyze residuals."""
        residuals = y_true - y_pred
        
        plt.figure(figsize=(10, 6))
        sns.scatterplot(x=y_pred, y=residuals, alpha=0.5)
        plt.axhline(y=0, color='r', linestyle='--')
        plt.title(f"Residual Plot: {target_name}")
        plt.xlabel("Predicted Values")
        plt.ylabel("Residuals")
        plt.tight_layout()
        
        os.makedirs(output_dir, exist_ok=True)
        plt.savefig(f"{output_dir}/residuals_{target_name.replace(' ', '_').lower()}.png")
        plt.close()
        print(f"Residual plot saved to {output_dir}/residuals_{target_name.replace(' ', '_').lower()}.png")
    
    def perform_cross_validation(self, X_scaled, y, target_name):
        """Perform Time Series Cross-Validation."""
        print(f"Performing TimeSeries Cross-Validation for {target_name}...")
        tscv = TimeSeriesSplit(n_splits=5)
        xgb_model = xgb.XGBRegressor(max_depth=8, learning_rate=0.1, random_state=42)
        cv_scores = cross_val_score(xgb_model, X_scaled, y, cv=tscv, scoring='neg_mean_absolute_error')
        print(f"CV MAE ({target_name}): {-cv_scores.mean():.2f} +/- {cv_scores.std():.2f}")

    def train(self, df, output_dir="models/timeline_predictor"):
        """
        Train ensemble models for hearing count and duration prediction
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Temporal sorting for strict temporal validation (train on older, test on newer)
        if 'filing_year' in df.columns and 'filing_month' in df.columns:
            df = df.sort_values(by=['filing_year', 'filing_month']).reset_index(drop=True)
            print("Sorted data chronologically for temporal validation.")
            
        # Feature engineering
        X = self.engineer_features(df)
        
        # Targets
        y_hearings = df['actual_hearings'].values
        y_duration = df['actual_duration_months'].values
        
        # Temporal split (80% train, 20% test)
        split_idx = int(len(df) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_hearings_train, y_hearings_test = y_hearings[:split_idx], y_hearings[split_idx:]
        y_duration_train, y_duration_test = y_duration[:split_idx], y_duration[split_idx:]
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print("\n--- Cross Validation ---")
        self.perform_cross_validation(X_train_scaled, y_hearings_train, "Hearing Count")
        self.perform_cross_validation(X_train_scaled, y_duration_train, "Duration (Months)")
        
        print("\n--- Training Models ---")
        print("Training models for hearing count prediction...")
        
        # Random Forest for hearings
        self.rf_hearings = RandomForestRegressor(
            n_estimators=100, max_depth=15, min_samples_split=10, random_state=42, n_jobs=-1
        )
        self.rf_hearings.fit(X_train_scaled, y_hearings_train)
        
        # XGBoost for hearings
        self.xgb_hearings = xgb.XGBRegressor(
            n_estimators=100, max_depth=8, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8, random_state=42
        )
        self.xgb_hearings.fit(X_train_scaled, y_hearings_train)
        
        # Evaluate hearings models
        rf_pred_hearings = self.rf_hearings.predict(X_test_scaled)
        xgb_pred_hearings = self.xgb_hearings.predict(X_test_scaled)
        ensemble_pred_hearings = (rf_pred_hearings + xgb_pred_hearings) / 2
        
        print(f"Hearings MAE (RF): {mean_absolute_error(y_hearings_test, rf_pred_hearings):.2f}")
        print(f"Hearings MAE (XGB): {mean_absolute_error(y_hearings_test, xgb_pred_hearings):.2f}")
        print(f"Hearings MAE (Ensemble): {mean_absolute_error(y_hearings_test, ensemble_pred_hearings):.2f}")
        self.plot_residuals(y_hearings_test, ensemble_pred_hearings, "Hearings", output_dir)
        
        print("\nTraining models for duration prediction...")
        
        # Random Forest for duration
        self.rf_duration = RandomForestRegressor(
            n_estimators=100, max_depth=15, min_samples_split=10, random_state=42, n_jobs=-1
        )
        self.rf_duration.fit(X_train_scaled, y_duration_train)
        
        # XGBoost for duration
        self.xgb_duration = xgb.XGBRegressor(
            n_estimators=100, max_depth=8, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8, random_state=42
        )
        self.xgb_duration.fit(X_train_scaled, y_duration_train)
        
        # Evaluate duration models
        rf_pred_duration = self.rf_duration.predict(X_test_scaled)
        xgb_pred_duration = self.xgb_duration.predict(X_test_scaled)
        ensemble_pred_duration = (rf_pred_duration + xgb_pred_duration) / 2
        
        print(f"Duration MAE (RF): {mean_absolute_error(y_duration_test, rf_pred_duration):.2f} months")
        print(f"Duration MAE (XGB): {mean_absolute_error(y_duration_test, xgb_pred_duration):.2f} months")
        print(f"Duration MAE (Ensemble): {mean_absolute_error(y_duration_test, ensemble_pred_duration):.2f} months")
        self.plot_residuals(y_duration_test, ensemble_pred_duration, "Duration", output_dir)
        
        # Feature importance
        self.plot_feature_importance(X.columns, output_dir)
        
        # Save models
        joblib.dump(self.rf_hearings, f"{output_dir}/rf_hearings.pkl")
        joblib.dump(self.xgb_hearings, f"{output_dir}/xgb_hearings.pkl")
        joblib.dump(self.rf_duration, f"{output_dir}/rf_duration.pkl")
        joblib.dump(self.xgb_duration, f"{output_dir}/xgb_duration.pkl")
        joblib.dump(self.scaler, f"{output_dir}/scaler.pkl")
        joblib.dump(self.label_encoders, f"{output_dir}/label_encoders.pkl")
        
        print(f"\nModels saved to {output_dir}")
        return self
    
    def predict(self, case_data):
        """
        Predict timeline for a new case
        """
        if isinstance(case_data, dict):
            case_data = pd.DataFrame([case_data])
        
        # Feature engineering
        X = self.engineer_features(case_data)
        X_scaled = self.scaler.transform(X)
        
        # Ensemble predictions
        rf_hearings = self.rf_hearings.predict(X_scaled)[0]
        xgb_hearings = self.xgb_hearings.predict(X_scaled)[0]
        pred_hearings = int(round((rf_hearings + xgb_hearings) / 2))
        
        rf_duration = self.rf_duration.predict(X_scaled)[0]
        xgb_duration = self.xgb_duration.predict(X_scaled)[0]
        pred_duration = (rf_duration + xgb_duration) / 2
        
        # Confidence based on model agreement
        hearing_agreement = 1 - abs(rf_hearings - xgb_hearings) / max(rf_hearings, xgb_hearings, 1)
        duration_agreement = 1 - abs(rf_duration - xgb_duration) / max(rf_duration, xgb_duration, 1)
        confidence = (hearing_agreement + duration_agreement) / 2
        
        return {
            "predicted_hearings": max(1, pred_hearings),
            "predicted_duration_months": round(max(0.1, pred_duration), 1),
            "confidence": round(confidence, 2),
            "duration_range_months": (
                round(max(0.1, pred_duration - 3), 1),
                round(pred_duration + 3, 1)
            )
        }
    
    def plot_feature_importance(self, feature_names, output_dir):
        """Plot feature importance from Random Forest"""
        importances_hearings = self.rf_hearings.feature_importances_
        importances_duration = self.rf_duration.feature_importances_
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Hearings importance
        indices = np.argsort(importances_hearings)[::-1][:10]
        ax1.barh(range(10), importances_hearings[indices])
        ax1.set_yticks(range(10))
        ax1.set_yticklabels([feature_names[i] for i in indices])
        ax1.set_title("Feature Importance: Hearing Count Prediction")
        
        # Duration importance
        indices = np.argsort(importances_duration)[::-1][:10]
        ax2.barh(range(10), importances_duration[indices])
        ax2.set_yticks(range(10))
        ax2.set_yticklabels([feature_names[i] for i in indices])
        ax2.set_title("Feature Importance: Duration Prediction")
        
        plt.tight_layout()
        plt.savefig(f"{output_dir}/feature_importance.png")
        plt.close()
        print("Feature importance plot saved")

if __name__ == "__main__":
    try:
        # Load historical disposed cases
        df = pd.read_csv("data/disposed_cases.csv")
        
        predictor = TimelinePredictor()
        predictor.train(df, output_dir="models/timeline_predictor")
        
        # Test prediction
        test_case = {
            'case_type': 'criminal',
            'parties_count': 2,
            'evidence_docs': 5,
            'witness_count': 3,
            'statutes_cited': 2,
            'has_constitutional_question': False,
            'judge_workload': 150,
            'court_backlog': 5000,
            'filing_month': 3,
            'filing_year': 2024
        }
        
        prediction = predictor.predict(test_case)
        print(f"\nTest Prediction for sample case: {prediction}")
        
    except FileNotFoundError:
        print("ERROR: data/disposed_cases.csv not found. Please provide historical data.")
    except Exception as e:
        print(f"Error occurred: {e}")
