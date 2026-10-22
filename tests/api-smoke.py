"""Exercise the running CGI API and remove only this test's inserted row."""
import json
import uuid
from urllib.request import Request, urlopen

import psycopg2

BASE = 'http://localhost:8000/'

def request(payload=None):
    req = Request(BASE + 'cgi-bin/scores.py', data=None if payload is None else json.dumps(payload, ensure_ascii=False).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urlopen(req, timeout=6) as response:
        assert response.headers.get_content_type() == 'application/json'
        return json.load(response)

for path in ('', 'src/main.js', 'src/game.mjs', 'src/renderer.js', 'src/audio.js', 'src/style.css', 'assets/nocturne-city.png', 'Sounds/main_menu_theme.mp3'):
    with urlopen(BASE + path, timeout=10) as response:
        assert response.status == 200, path
        assert response.read(100), path
name = 'Тест_' + uuid.uuid4().hex[:10]
row_id = None
try:
    data = request({'name': name, 'score': 123456})
    assert data.get('ok'), data
    row_id = data['id']
    rows = request()['scores']
    assert any(row['name'] == name and row['score'] == 123456 for row in rows)
    assert [r['score'] for r in rows] == sorted([r['score'] for r in rows], reverse=True)
    for bad in ({'name': '', 'score': 5}, {'name': name, 'score': -1}, {'name': name, 'score': True}, {'name': name, 'score': 'bad'}, {'name': 'x' * 21, 'score': 5}):
        assert 'error' in request(bad), bad
finally:
    if row_id is not None:
        with psycopg2.connect(dbname='mitla', user='mitla', password='root12', host='localhost') as conn:
            with conn.cursor() as cur:
                cur.execute('DELETE FROM rating WHERE id = %s AND name = %s', (row_id, name))
print('PASS: assets, JSON leaderboard, Cyrillic score submission, validation and cleanup.')
