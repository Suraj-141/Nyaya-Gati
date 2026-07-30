import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import random
import json
from pathlib import Path
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("ner_training.log")
    ]
)

def load_training_data(data_path: str):
    """
    Load annotated data in SpaCy format:
    [
        ("text...", {"entities": [(start, end, "PERSON"), ...]}),
        ...
    ]
    """
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logging.info(f"Successfully loaded {len(data)} examples from {data_path}")
        return data
    except FileNotFoundError:
        logging.error(f"Data file not found at {data_path}. Please check the path.")
        return []
    except json.JSONDecodeError as e:
        logging.error(f"Error decoding JSON from {data_path}: {e}")
        return []
    except Exception as e:
        logging.error(f"Unexpected error loading data from {data_path}: {e}")
        return []

def evaluate_model(nlp, test_data):
    """Calculate precision, recall, F1-score"""
    try:
        from spacy.scorer import Scorer
        scorer = Scorer()
        examples = []
        for text, annotations in test_data:
            doc = nlp(text)
            example = Example.from_dict(nlp.make_doc(text), annotations)
            examples.append(example)
        
        scores = scorer.score(examples)
        logging.info(f"F1-Score: {scores.get('ents_f', 0.0):.3f}")
        logging.info(f"Precision: {scores.get('ents_p', 0.0):.3f}")
        logging.info(f"Recall: {scores.get('ents_r', 0.0):.3f}")
        
        return scores
    except Exception as e:
        logging.error(f"Error during evaluation: {e}", exc_info=True)
        return {}

def train_ner_model(
    training_data,
    dev_data,
    output_dir: Path,
    n_iter: int = 30,
    dropout: float = 0.2
):
    """Train Legal NER model"""
    if not training_data:
        logging.error("No training data provided. Aborting training.")
        return None

    # Load base model or create blank
    try:
        logging.info("Loading base model (en_core_web_trf)...")
        nlp = spacy.load("en_core_web_trf")
    except Exception as e:
        logging.warning(f"Could not load 'en_core_web_trf' ({e}). Falling back to blank model with bert-base-cased.")
        nlp = spacy.blank("en")
        try:
            nlp.add_pipe("transformer", config={"model": {"name": "bert-base-cased"}})
        except Exception as pipe_e:
            logging.error(f"Failed to add transformer pipe: {pipe_e}")
            return None
    
    # Add NER pipe if not present
    if "ner" not in nlp.pipe_names:
        logging.info("Adding new 'ner' pipe.")
        ner = nlp.add_pipe("ner", last=True)
    else:
        logging.info("Using existing 'ner' pipe.")
        ner = nlp.get_pipe("ner")
    
    # Add entity labels
    labels = ["PERSON", "STATUTE", "COURT", "DATE", "ORGANIZATION"]
    for label in labels:
        ner.add_label(label)
        
    # Setup checkpoint directory
    output_path = Path(output_dir)
    checkpoints_dir = output_path.parent / "checkpoints"
    checkpoints_dir.mkdir(parents=True, exist_ok=True)
    
    # Disable other pipes during training
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe not in ["ner", "transformer"]]
    logging.info(f"Disabling pipes during training: {other_pipes}")
    
    try:
        with nlp.disable_pipes(*other_pipes):
            # Initialize optimizer
            optimizer = nlp.begin_training()
            
            logging.info(f"Starting training loop for {n_iter} iterations...")
            for iteration in range(n_iter):
                random.shuffle(training_data)
                losses = {}
                
                # Batch training
                batches = minibatch(training_data, size=compounding(4.0, 32.0, 1.001))
                for batch in batches:
                    examples = []
                    for text, annotations in batch:
                        try:
                            doc = nlp.make_doc(text)
                            example = Example.from_dict(doc, annotations)
                            examples.append(example)
                        except Exception as ex:
                            logging.debug(f"Skipping invalid example: {ex}")
                            continue
                    
                    if examples:
                        nlp.update(examples, drop=dropout, losses=losses, sgd=optimizer)
                
                logging.info(f"Iteration {iteration + 1}/{n_iter}, Losses: {losses}")
                
                # Evaluate and save checkpoint every 5 iterations
                if (iteration + 1) % 5 == 0:
                    logging.info(f"Running evaluation at iteration {iteration + 1}...")
                    if dev_data:
                        evaluate_model(nlp, dev_data)
                    else:
                        logging.warning("No development data provided for evaluation.")
                    
                    # Model checkpointing
                    ckpt_path = checkpoints_dir / f"legal_ner_iter_{iteration + 1}"
                    nlp.to_disk(ckpt_path)
                    logging.info(f"Checkpoint saved to {ckpt_path}")
        
        # Save final model
        output_path.mkdir(parents=True, exist_ok=True)
        nlp.to_disk(output_path)
        logging.info(f"Final trained model saved to {output_path}")
        
        return nlp
    
    except Exception as e:
        logging.error(f"Critical error during training process: {e}", exc_info=True)
        return None

if __name__ == "__main__":
    logging.info("=== Starting Legal NER Pipeline ===")
    
    # Load data
    train_data = load_training_data("data/train_ner.json")
    dev_data = load_training_data("data/dev_ner.json")
    
    # Train
    if train_data:
        model = train_ner_model(
            training_data=train_data,
            dev_data=dev_data,
            output_dir=Path("models/legal_ner"),
            n_iter=30
        )
        
        # Final evaluation
        if model:
            test_data = load_training_data("data/test_ner.json")
            if test_data:
                logging.info("Running final evaluation on test set...")
                evaluate_model(model, test_data)
            else:
                logging.warning("No test data found. Skipping final evaluation.")
    else:
        logging.error("Pipeline failed to start: Missing training data.")
