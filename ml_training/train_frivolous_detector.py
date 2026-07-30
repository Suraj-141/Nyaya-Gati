import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import shap
import matplotlib.pyplot as plt
import os
import ast

class FrivolousDetector:
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained("nlpaueb/legal-bert-base-uncased")
        self.bert_model = None
        self.xgb_model = None
        
    def extract_features(self, petition_data):
        """
        Extract features from petition
        
        petition_data: dict with keys:
        - text: petition text
        - evidence_attachments: int count
        - cited_precedents: list of case citations
        - petitioner_history: dict with past_cases_count, dismissal_rate
        """
        features = {}
        
        # Text features (will use BERT embeddings)
        features['text'] = petition_data['text']
        
        # Evidence features
        features['evidence_count'] = petition_data.get('evidence_attachments', 0)
        features['has_witness_list'] = 1 if petition_data.get('witness_list') else 0
        features['petition_length'] = len(str(petition_data['text']).split())
        
        # Citation features
        citations = petition_data.get('cited_precedents', [])
        features['citation_count'] = len(citations) if isinstance(citations, list) else 0
        features['has_citations'] = 1 if features['citation_count'] > 0 else 0
        
        # TODO: Check if citations are valid (not overruled)
        # This requires querying precedent database
        features['valid_citations'] = features['citation_count']  # Placeholder
        
        # Petitioner history
        history = petition_data.get('petitioner_history', {})
        features['past_cases'] = history.get('past_cases_count', 0)
        features['dismissal_rate'] = history.get('dismissal_rate', 0.0)
        features['is_repeat_filer'] = 1 if features['past_cases'] > 5 else 0
        
        return features
    
    def train(self, train_data, labels, output_dir="models/frivolous_detector"):
        """
        Train two-stage model:
        1. Fine-tune BERT for text quality scoring
        2. Train XGBoost on BERT embeddings + handcrafted features
        
        train_data: list of petition dicts
        labels: numpy array of merit scores (0-100)
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Stage 1: Fine-tune BERT
        print("Stage 1: Fine-tuning Legal-BERT...")
        
        # Prepare BERT training data
        texts = [d['text'] for d in train_data]
        encodings = self.tokenizer(
            texts,
            truncation=True,
            padding=True,
            max_length=512,
            return_tensors="pt"
        )
        
        # Convert labels to 3-class for BERT (HIGH/MEDIUM/LOW)
        bert_labels = np.digitize(labels, bins=[50, 85])  # 0-49=0, 50-84=1, 85-100=2
        
        class PetitionDataset(torch.utils.data.Dataset):
            def __init__(self, encodings, labels):
                self.encodings = encodings
                self.labels = labels
            
            def __getitem__(self, idx):
                item = {k: v[idx] for k, v in self.encodings.items()}
                item['labels'] = torch.tensor(self.labels[idx])
                return item
            
            def __len__(self):
                return len(self.labels)
        
        dataset = PetitionDataset(encodings, bert_labels)
        
        # Load pre-trained Legal-BERT
        self.bert_model = AutoModelForSequenceClassification.from_pretrained(
            "nlpaueb/legal-bert-base-uncased",
            num_labels=3
        )
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=f"{output_dir}/bert_checkpoints",
            num_train_epochs=3,
            per_device_train_batch_size=8,
            warmup_steps=500,
            weight_decay=0.01,
            logging_dir=f"{output_dir}/logs",
            logging_steps=10,
            save_steps=1000,
            eval_strategy="no"
        )
        
        # Train
        trainer = Trainer(
            model=self.bert_model,
            args=training_args,
            train_dataset=dataset
        )
        
        trainer.train()
        
        # Save BERT model
        self.bert_model.save_pretrained(f"{output_dir}/bert_model")
        self.tokenizer.save_pretrained(f"{output_dir}/bert_tokenizer")
        
        # Stage 2: Extract BERT embeddings + train XGBoost
        print("Stage 2: Extracting Embeddings and Training XGBoost regressor...")
        
        # Get BERT embeddings (use [CLS] token representation)
        self.bert_model.eval()
        with torch.no_grad():
            # For large datasets, this should be batched. Doing it directly for simplicity.
            outputs = self.bert_model.bert(**encodings)
            bert_embeddings = outputs.last_hidden_state[:, 0, :].numpy()  # [CLS] token
        
        # Combine with handcrafted features
        handcrafted_features = []
        for petition_dict in train_data:
            feats = self.extract_features(petition_dict)
            numeric_feats = [
                feats['evidence_count'],
                feats['has_witness_list'],
                feats['petition_length'],
                feats['citation_count'],
                feats['has_citations'],
                feats['valid_citations'],
                feats['past_cases'],
                feats['dismissal_rate'],
                feats['is_repeat_filer']
            ]
            handcrafted_features.append(numeric_feats)
        
        handcrafted_features = np.array(handcrafted_features)
        feature_names = [f"BERT_{i}" for i in range(bert_embeddings.shape[1])] + [
            'evidence_count', 'has_witness_list', 'petition_length', 'citation_count', 
            'has_citations', 'valid_citations', 'past_cases', 'dismissal_rate', 'is_repeat_filer'
        ]
        
        # Concatenate BERT embeddings + handcrafted features
        X = np.concatenate([bert_embeddings, handcrafted_features], axis=1)
        y = labels
        
        # Create Train/Test Split for Evaluation
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train XGBoost regressor
        self.xgb_model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            objective='reg:squarederror',
            random_state=42
        )
        
        self.xgb_model.fit(X_train, y_train)
        
        # Save XGBoost model
        joblib.dump(self.xgb_model, f"{output_dir}/xgb_model.pkl")
        print(f"Models saved to {output_dir}")
        
        # Evaluate Model
        self._evaluate(X_test, y_test, feature_names, output_dir)
        
        return self
        
    def _evaluate(self, X_test, y_test, feature_names, output_dir):
        """Evaluate the XGBoost model and run SHAP analysis."""
        print("Running comprehensive evaluation...")
        
        # Make predictions
        predictions = self.xgb_model.predict(X_test)
        
        # Calculate Metrics
        mae = mean_absolute_error(y_test, predictions)
        rmse = np.sqrt(mean_squared_error(y_test, predictions))
        r2 = r2_score(y_test, predictions)
        
        print(f"--- Evaluation Metrics ---")
        print(f"MAE:  {mae:.2f}")
        print(f"RMSE: {rmse:.2f}")
        print(f"R²:   {r2:.2f}")
        
        with open(f"{output_dir}/evaluation_metrics.txt", "w") as f:
            f.write(f"Mean Absolute Error (MAE): {mae:.4f}\n")
            f.write(f"Root Mean Squared Error (RMSE): {rmse:.4f}\n")
            f.write(f"R-squared (R2): {r2:.4f}\n")
            
        print("Generating SHAP Feature Importance Analysis...")
        # SHAP Explainability
        explainer = shap.TreeExplainer(self.xgb_model)
        shap_values = explainer.shap_values(X_test)
        
        # Plot summary
        plt.figure(figsize=(10, 8))
        shap.summary_plot(shap_values, X_test, feature_names=feature_names, show=False)
        plt.tight_layout()
        plt.savefig(f"{output_dir}/shap_feature_importance.png")
        plt.close()
        
        print(f"SHAP feature importance plot saved to {output_dir}/shap_feature_importance.png")
    
    def predict(self, petition_data):
        """
        Predict merit score for a petition
        
        Returns: dict with merit_score (0-100) and explanation
        """
        # Get BERT embedding
        text = petition_data['text']
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding=True,
            max_length=512,
            return_tensors="pt"
        )
        
        self.bert_model.eval()
        with torch.no_grad():
            outputs = self.bert_model.bert(**encoding)
            bert_embedding = outputs.last_hidden_state[:, 0, :].numpy().flatten()
        
        # Get handcrafted features
        features = self.extract_features(petition_data)
        numeric_feats = np.array([
            features['evidence_count'],
            features['has_witness_list'],
            features['petition_length'],
            features['citation_count'],
            features['has_citations'],
            features['valid_citations'],
            features['past_cases'],
            features['dismissal_rate'],
            features['is_repeat_filer']
        ])
        
        # Concatenate
        X = np.concatenate([bert_embedding, numeric_feats]).reshape(1, -1)
        
        # Predict
        merit_score = self.xgb_model.predict(X)[0]
        merit_score = np.clip(merit_score, 0, 100)  # Ensure 0-100 range
        
        # Generate explanation
        explanation = self._generate_explanation(features, merit_score)
        
        return {
            "merit_score": float(merit_score),
            "merit_tier": self._get_tier(merit_score),
            "explanation": explanation
        }
    
    def _get_tier(self, score):
        if score >= 85:
            return "HIGH_MERIT"
        elif score >= 50:
            return "MEDIUM_MERIT"
        else:
            return "LOW_MERIT"
    
    def _generate_explanation(self, features, score):
        """Generate human-readable explanation"""
        reasons = []
        
        if score < 50:
            reasons.append("LOW MERIT because:")
        
        if features['evidence_count'] == 0:
            reasons.append("- No documentary evidence attached")
        
        if features['petition_length'] < 100:
            reasons.append("- Petition too short (< 100 words), lacks substantive arguments")
        
        if features['citation_count'] == 0:
            reasons.append("- No legal precedents cited")
        
        if features['dismissal_rate'] > 0.7:
            reasons.append(f"- Petitioner has high dismissal rate ({features['dismissal_rate']:.0%}) on past cases")
        
        if features['is_repeat_filer']:
            reasons.append(f"- Repeat filer with {features['past_cases']} past cases")
        
        if not reasons:
            reasons.append("Case appears to have adequate merit for proceeding.")
        
        return " ".join(reasons)

if __name__ == "__main__":
    try:
        # Load training data
        print("Loading dataset from data/labeled_cases.csv...")
        df = pd.read_csv("data/labeled_cases.csv")
        
        train_data = []
        labels = []
        
        for _, row in df.iterrows():
            # Safely parse citations if it's a string representation of a list
            citations = []
            if pd.notna(row.get('citations')):
                try:
                    citations = ast.literal_eval(row['citations'])
                except (ValueError, SyntaxError):
                    citations = []

            petition_dict = {
                'text': row.get('petition_text', ''),
                'evidence_attachments': row.get('evidence_count', 0),
                'cited_precedents': citations,
                'petitioner_history': {
                    'past_cases_count': row.get('past_cases', 0),
                    'dismissal_rate': row.get('dismissal_rate', 0.0)
                }
            }
            train_data.append(petition_dict)
            labels.append(row['merit_score'])  # Ground truth labels
        
        labels = np.array(labels)
        
        # Train model
        detector = FrivolousDetector()
        detector.train(train_data, labels, output_dir="models/frivolous_detector")
        
    except FileNotFoundError:
        print("ERROR: data/labeled_cases.csv not found. Please provide the dataset before running.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
