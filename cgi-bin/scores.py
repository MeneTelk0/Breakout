#!/usr/bin/env python
"""JSON leaderboard used by the NOCTURNE browser client."""
import json
import os
import sys

import psycopg2


def validate_score(payload):
    if not isinstance(payload, dict):
        raise ValueError('Ожидается JSON-объект.')
    name = payload.get('name')
    score = payload.get('score')
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 20:
        raise ValueError('Позывной должен содержать от 1 до 20 символов.')
    if any(ord(char) < 32 for char in name):
        raise ValueError('Позывной содержит недопустимые символы.')
    if type(score) is not int or not 0 <= score <= 999999999:
        raise ValueError('Некорректный счёт.')
    return name.strip(), score


def handle_request():
    method = os.environ.get('REQUEST_METHOD', 'GET')
    if method not in ('GET', 'POST'):
        raise ValueError('Поддерживаются GET и POST.')
    entry = None
    if method == 'POST':
        length = int(os.environ.get('CONTENT_LENGTH', '0'))
        if length <= 0 or length > 2048:
            raise ValueError('Некорректный размер запроса.')
        entry = validate_score(json.loads(sys.stdin.buffer.read(length).decode('utf-8')))
    with psycopg2.connect(dbname='mitla', user='mitla', password='root12', host='localhost', connect_timeout=3) as conn:
        with conn.cursor() as cur:
            if entry is not None:
                cur.execute('INSERT INTO rating (name, score, date) VALUES (%s, %s, CURRENT_DATE) RETURNING id', (entry[0], str(entry[1])))
                return {'ok': True, 'id': cur.fetchone()[0]}
            cur.execute("""SELECT name, score, date FROM rating
                WHERE score ~ '^[0-9]{1,9}$'
                ORDER BY CASE WHEN score ~ '^[0-9]{1,9}$' THEN score::integer ELSE 0 END DESC, id ASC LIMIT 20""")
            return {'scores': [{'name': name, 'score': int(score), 'date': str(date)} for name, score, date in cur.fetchall()]}


def main():
    try:
        result = handle_request()
    except (ValueError, TypeError, json.JSONDecodeError):
        result = {'error': 'Некорректные данные рекорда.'}
    except psycopg2.Error:
        result = {'error': 'Городская сеть временно недоступна.'}
    print('Content-Type: application/json; charset=utf-8')
    print('Cache-Control: no-store')
    print()
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
