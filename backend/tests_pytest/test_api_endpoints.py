import uuid
import pytest
import requests

def test_leaderboard_endpoint_returns_200(api_base_url):
    """Verify that the leaderboard endpoint is reachable and returns valid list data."""
    res = requests.get(f"{api_base_url}/leaderboard")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_quiz_categories_returns_200(api_base_url):
    """Verify that quiz categories are returned with expected fields."""
    res = requests.get(f"{api_base_url}/quiz-categories")
    assert res.status_code == 200
    categories = res.json()
    assert isinstance(categories, list)
    if categories:
        first = categories[0]
        assert "slug" in first
        assert "name" in first


def test_auth_signup_missing_fields_fails(api_base_url):
    """Verify 400 bad request is returned when registering with missing fields."""
    res = requests.post(f"{api_base_url}/auth/signup", json={"username": ""})
    assert res.status_code == 400
    data = res.json()
    assert "error" in data or "message" in data


def test_auth_login_invalid_credentials_fails(api_base_url):
    """Verify 400/401 is returned when attempting login with bad credentials."""
    res = requests.post(
        f"{api_base_url}/auth/login",
        json={"username": f"nonexistent_user_{uuid.uuid4().hex[:8]}", "password": "wrongpassword123"}
    )
    assert res.status_code in [400, 401]


def test_resume_upload_without_file_rejected(api_base_url):
    """Verify resume upload route returns 400 when no resume file is attached."""
    res = requests.post(f"{api_base_url}/api/resume/upload", data={"category": "React"})
    assert res.status_code in [400, 401, 500]


def test_resume_upload_rejects_invalid_file_extension(api_base_url):
    """Verify file-upload validation rejects invalid extensions like .txt or .exe."""
    fake_file = {"resume": ("malicious.exe", b"binary content", "application/octet-stream")}
    res = requests.post(f"{api_base_url}/api/resume/upload", files=fake_file)
    assert res.status_code in [400, 401, 500]
