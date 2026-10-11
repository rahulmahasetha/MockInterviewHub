import os
import pytest
import requests

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")

@pytest.fixture(scope="session")
def api_base_url():
    """Returns the base URL for the backend API."""
    return BASE_URL

@pytest.fixture(scope="session")
def session():
    """Provides a requests session for connection pooling."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    s.close()
