import os
import sys
sys.path.insert(0, r'c:/Users/HP/.gemini/antigravity/scratch/civicsense-ai')
os.chdir(r'c:/Users/HP/.gemini/antigravity/scratch/civicsense-ai/backend')
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

for path, method, payload in [
    ('/api/login', 'post', {'email': 'citizen@civicsense.ai', 'password': 'password123'}),
    ('/api/violations', 'get', None),
    ('/api/dashboard', 'get', None),
    ('/api/analytics', 'get', None),
]:
    if method == 'get':
        resp = client.get(path)
    else:
        resp = client.post(path, json=payload)
    print(path, resp.status_code, resp.text[:300])
