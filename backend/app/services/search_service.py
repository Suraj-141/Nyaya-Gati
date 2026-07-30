from elasticsearch import Elasticsearch
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class SearchService:
    """
    Service for full-text search and indexing of legal documents and cases.
    """
    
    def __init__(self):
        self.es = Elasticsearch([settings.ELASTICSEARCH_URL])
        self.index_name = "nyayagati_cases"

    def create_index(self):
        """Initialize the Elasticsearch index with appropriate legal-specific mapping."""
        if not self.es.indices.exists(index=self.index_name):
            mapping = {
                "mappings": {
                    "properties": {
                        "case_number": {"type": "keyword"},
                        "case_type": {"type": "keyword"},
                        "petitioner": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                        "respondent": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                        "petition_text": {
                            "type": "text", 
                            "analyzer": "standard",
                            "term_vector": "with_positions_offsets"
                        },
                        "entities": {
                            "properties": {
                                "statutes": {"type": "keyword"},
                                "persons": {"type": "text"}
                            }
                        },
                        "filing_date": {"type": "date"},
                        "status": {"type": "keyword"}
                    }
                }
            }
            self.es.indices.create(index=self.index_name, body=mapping)
            logger.info(f"Elasticsearch index '{self.index_name}' created.")

    def index_case(self, case_id: int, case_data: dict):
        """Index or update a case in Elasticsearch."""
        try:
            self.es.index(index=self.index_name, id=str(case_id), body=case_data)
        except Exception as e:
            logger.error(f"Failed to index case {case_id}: {e}")

    def search_cases(self, query: str, limit: int = 20):
        """Search cases by full-text query across multiple fields."""
        search_body = {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["case_number", "petitioner", "respondent", "petition_text^2", "entities.statutes"],
                    "fuzziness": "AUTO"
                }
            },
            "size": limit
        }
        
        try:
            response = self.es.search(index=self.index_name, body=search_body)
            hits = response['hits']['hits']
            return [hit['_source'] for hit in hits]
        except Exception as e:
            logger.error(f"Search failed for query '{query}': {e}")
            return []

    def delete_case(self, case_id: int):
        """Remove a case from the index."""
        try:
            self.es.delete(index=self.index_name, id=str(case_id))
        except Exception as e:
            logger.error(f"Failed to delete case {case_id} from search index: {e}")
