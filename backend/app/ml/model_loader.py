import logging
import os
import joblib
from typing import Optional, Any, Dict

logger = logging.getLogger(__name__)

# Global variables to hold loaded models
frivolous_detector: Optional[Any] = None
tfidf_vectorizer: Optional[Any] = None
timeline_predictor: Optional[Any] = None
urgency_model: Optional[Any] = None
similarity_index: Optional[Dict[str, Any]] = None
ner_model: Optional[Any] = None

def load_models():
    """Load all ML models into memory on application startup."""
    global frivolous_detector, tfidf_vectorizer, timeline_predictor, urgency_model, similarity_index, ner_model
    
    logger.info("Initializing ML model loading sequence...")
    
    # 1. Load Legal NER (spaCy transformer)
    try:
        import spacy
        ner_path = os.getenv("NER_MODEL_PATH", "models/legal_ner")
        if os.path.exists(ner_path):
            ner_model = spacy.load(ner_path)
            logger.info(f"NER model loaded from {ner_path}")
        else:
            ner_model = spacy.load("en_core_web_sm")
            logger.warning(f"Custom NER model not found at {ner_path}, using fallback.")
    except Exception as e:
        logger.error(f"Failed to load NER model: {e}")

    # 2. Load Frivolous Detector Classifier
    try:
        frivolous_path = os.getenv("FRIVOLOUS_MODEL_PATH", "models/frivolous_detector/xgb_model.pkl")
        if os.path.exists(frivolous_path):
            frivolous_detector = joblib.load(frivolous_path)
            logger.info(f"Frivolous detector loaded from {frivolous_path}")
        else:
            logger.warning(f"Frivolous detector not found at {frivolous_path}. Using mock.")
    except Exception as e:
        logger.error(f"Failed to load frivolous detector: {e}")

    # 3. Load TF-IDF Vectorizer
    try:
        tfidf_path = os.getenv("TFIDF_VECTORIZER_PATH", "models/frivolous_detector/tfidf_vectorizer.pkl")
        if os.path.exists(tfidf_path):
            tfidf_vectorizer = joblib.load(tfidf_path)
            logger.info(f"TF-IDF Vectorizer loaded from {tfidf_path}")
        else:
            logger.warning(f"TF-IDF Vectorizer not found at {tfidf_path}. Using mock.")
    except Exception as e:
        logger.error(f"Failed to load TF-IDF Vectorizer: {e}")

    # 4. Load Timeline Predictor
    try:
        timeline_path = os.getenv("TIMELINE_XGB_PATH", "models/timeline_predictor/xgb_duration.pkl")
        if os.path.exists(timeline_path):
            timeline_predictor = joblib.load(timeline_path)
            logger.info(f"Timeline predictor loaded from {timeline_path}")
        else:
            logger.warning(f"Timeline predictor not found at {timeline_path}. Using mock.")
    except Exception as e:
        logger.error(f"Failed to load timeline predictor: {e}")

    # 5. Load Urgency Model
    try:
        urgency_path = os.getenv("URGENCY_MODEL_PATH", "models/urgency_model/xgb_urgency.pkl")
        if os.path.exists(urgency_path):
            urgency_model = joblib.load(urgency_path)
            logger.info(f"Urgency model loaded from {urgency_path}")
        else:
            logger.warning(f"Urgency model not found at {urgency_path}. Using mock.")
    except Exception as e:
        logger.error(f"Failed to load urgency model: {e}")

    # 6. Load Similarity Index
    try:
        similarity_path = os.getenv("SIMILARITY_INDEX_PATH", "models/case_embeddings/similarity_index.pkl")
        if os.path.exists(similarity_path):
            similarity_index = joblib.load(similarity_path)
            logger.info(f"Similarity index loaded from {similarity_path}")
        else:
            logger.warning(f"Similarity index not found at {similarity_path}. Using mock.")
    except Exception as e:
        logger.error(f"Failed to load similarity index: {e}")
    
    logger.info("ML models loading sequence completed.")

def models_loaded() -> bool:
    """Check if model loading is complete."""
    return frivolous_detector is not None or tfidf_vectorizer is not None

def predict_merit(text: str) -> dict:
    """
    Generate merit score using TF-IDF + Classifier.
    """
    if frivolous_detector and tfidf_vectorizer:
        try:
            vec = tfidf_vectorizer.transform([text])
            # Handle probabilistic prediction if supported
            if hasattr(frivolous_detector, "predict_proba"):
                score = float(frivolous_detector.predict_proba(vec)[0][1] * 100)
            else:
                score = float(frivolous_detector.predict(vec)[0] * 100)
            return {"merit_score": round(score, 1), "explanation": "Inferred via real XGBoost merit model."}
        except Exception as e:
            logger.error(f"Error during merit inference: {e}")
    
    # Fallback to simple deterministic heuristics for mock
    score = 82.0 if len(text.split()) > 100 else 45.0
    return {"merit_score": score, "explanation": "Case analyzed via mock merit engine."}

def predict_urgency(features_dict: dict) -> dict:
    """
    Predict urgency score using trained urgency model.
    """
    if urgency_model:
        try:
            # Match the training features: 
            # ['is_criminal', 'is_civil', 'is_family', 'is_commercial', 'is_senior_citizen', 'statute_count']
            case_type = str(features_dict.get('case_type', 'civil')).lower()
            features = [
                1 if case_type == 'criminal' else 0,
                1 if case_type == 'civil' else 0,
                1 if case_type == 'family' else 0,
                1 if case_type == 'commercial' else 0,
                1 if features_dict.get('is_senior_citizen', 0) == 1 or features_dict.get('age', 0) > 65 else 0,
                int(features_dict.get('statute_count', 0))
            ]
            score = float(urgency_model.predict([features])[0])
            return {"urgency_score": round(score, 1), "explanation": "Inferred via real XGBoost urgency model."}
        except Exception as e:
            logger.error(f"Error during urgency inference: {e}")
            
    # Mock fallback
    score = 75.0
    explanation = "Standard urgency calculation."
    if features_dict.get('age', 0) > 65 or features_dict.get('is_senior_citizen', 0) == 1:
        score += 30
        explanation += " Priority given to senior citizen."
    return {"urgency_score": score, "explanation": explanation}

def predict_timeline(features_dict: dict) -> dict:
    """
    Predict case timeline duration (in days) using trained model.
    """
    if timeline_predictor:
        try:
            # ['is_criminal', 'is_civil', 'is_family', 'is_commercial', 'statute_count', 'urgency_score']
            case_type = str(features_dict.get('case_type', 'civil')).lower()
            features = [
                1 if case_type == 'criminal' else 0,
                1 if case_type == 'civil' else 0,
                1 if case_type == 'family' else 0,
                1 if case_type == 'commercial' else 0,
                int(features_dict.get('statute_count', 0)),
                float(features_dict.get('urgency_score', 75.0))
            ]
            days = float(timeline_predictor.predict([features])[0])
            months = round(max(1.0, days / 30.0), 1)
            # Hearings is correlated with duration
            hearings = int(max(2, round(months * 0.8)))
            return {"predicted_duration_months": months, "predicted_hearings": hearings}
        except Exception as e:
            logger.error(f"Error during timeline inference: {e}")
            
    # Fallback mock
    return {"predicted_duration_months": 12.5, "predicted_hearings": 8}

def find_similar_cases(text: str, top_k: int = 5) -> list:
    """
    Given a petition text, find the top_k most similar judgments in our index.
    """
    if similarity_index:
        try:
            vectorizer = similarity_index["vectorizer"]
            tfidf_matrix = similarity_index["tfidf_matrix"]
            metadata = similarity_index["metadata"]
            
            # Vectorize query
            q_vec = vectorizer.transform([text])
            
            # Compute cosine similarities
            from sklearn.metrics.pairwise import cosine_similarity
            similarities = cosine_similarity(q_vec, tfidf_matrix).flatten()
            
            # Get top indices
            top_indices = similarities.argsort()[::-1][:top_k]
            
            results = []
            for idx in top_indices:
                score = float(similarities[idx])
                if score > 0.01:  # Non-trivial similarity
                    meta = metadata[idx].copy()
                    meta["similarity_score"] = round(score, 3)
                    results.append(meta)
            return results
        except Exception as e:
            logger.error(f"Error during similarity search: {e}")
            
    # Mock fallback if similarity index not loaded
    return [
        {
            "filename": "State_Of_UP_vs_Anoop_Kumar_on_20_May_2015_1.PDF",
            "year": 2015,
            "judgment_date": "2015-05-20",
            "petitioner": "State Of UP",
            "respondent": "Anoop Kumar",
            "case_type": "criminal",
            "outcome_binary": 0,
            "similarity_score": 0.85
        },
        {
            "filename": "Union_Of_India_vs_Radha_Yadav_on_29_January_2019_1.PDF",
            "year": 2019,
            "judgment_date": "2019-01-29",
            "petitioner": "Union Of India",
            "respondent": "Radha Yadav",
            "case_type": "civil",
            "outcome_binary": 1,
            "similarity_score": 0.72
        }
    ]


