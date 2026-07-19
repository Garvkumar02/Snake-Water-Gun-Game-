import os
import random
import sqlite3
from datetime import datetime

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from main import reverseDict, get_winner_numeric

app = Flask(__name__)
app.secret_key = 'snake_water_gun_secret_key_extremely_secure'

DB_PATH = os.path.join(app.root_path, 'game.db')
CHOICES = ['snake', 'water', 'gun']
str_to_numeric = {v: k for k, v in reverseDict.items()}
ROUND_LIMIT = 5
MAX_LEVEL = 20
COUNTER_MAP = {'snake': 'water', 'water': 'gun', 'gun': 'snake'}


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            unlocked_level INTEGER NOT NULL DEFAULT 1,
            current_level INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        '''
    )
    conn.commit()
    conn.close()


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_logged_in_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return dict(user) if user else None


def make_level_state(level=1):
    return {
        'level': level,
        'round_number': 0,
        'player_wins': 0,
        'computer_wins': 0,
        'ties': 0,
        'status': 'playing',
        'message': 'Fight the computer in a best-of-5 challenge.'
    }


def get_winner(player, computer):
    player_num = str_to_numeric[player]
    computer_num = str_to_numeric[computer]
    return get_winner_numeric(player_num, computer_num)


def compute_computer_choice(level, history):
    weights = {choice: 1.0 for choice in CHOICES}
    difficulty = min(level, MAX_LEVEL)

    if history:
        last_player_choice = history[-1]['player']
        counter_choice = COUNTER_MAP[last_player_choice]
        weights[counter_choice] += 1.4 + (difficulty * 0.09)
        weights[last_player_choice] *= 0.75

    for choice in CHOICES:
        weights[choice] += difficulty * 0.04

    total = sum(weights.values())
    choice_pool = []
    for choice in CHOICES:
        choice_pool.extend([choice] * int(round(weights[choice] / total * 100)))

    if not choice_pool:
        choice_pool = CHOICES.copy()

    return random.choice(choice_pool)


def reset_level_session(current_level=None):
    session['level_state'] = make_level_state(level=current_level or 1)
    session.modified = True


def tie_breaker_message(level_state):
    if level_state['player_wins'] >= 3:
        return 'Level cleared! The arena has been conquered.'
    return 'Bad luck. You need 3 wins out of 5 rounds to unlock the next level.'


def get_level_progress(message=None):
    state = session.get('level_state')
    if not state:
        state = make_level_state(level=1)
        session['level_state'] = state
    if message:
        state['message'] = message
    return state


@app.before_request
def ensure_db():
    if not os.path.exists(DB_PATH):
        init_db()


init_db()


@app.route('/')
def root():
    if 'user_id' in session:
        return redirect(url_for('game'))
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        if not username or not password:
            return render_template('register.html', error='Please enter a username and password.')

        hashed_password = generate_password_hash(password)
        conn = get_db_connection()
        try:
            conn.execute(
                'INSERT INTO users (username, password_hash, unlocked_level, current_level) VALUES (?, ?, 1, 1)',
                (username, hashed_password)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return render_template('register.html', error='That username is already taken. Please choose another.')

        user = conn.execute('SELECT id, username, unlocked_level, current_level FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        session['user_id'] = user['id']
        session['username'] = user['username']
        reset_level_session(current_level=user['current_level'])
        return redirect(url_for('game'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()

        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            reset_level_session(current_level=user['current_level'])
            return redirect(url_for('game'))

        return render_template('login.html', error='Invalid username or password.')

    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/game')
def game():
    user = get_logged_in_user()
    if not user:
        return redirect(url_for('login'))

    state = get_level_progress()
    state['level'] = user['current_level']
    session['level_state'] = state
    session.modified = True
    return render_template('index.html', username=user['username'], level=user['current_level'], max_level=MAX_LEVEL)


@app.route('/api/game-state', methods=['GET'])
def game_state():
    user = get_logged_in_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    state = get_level_progress()
    state['level'] = user['current_level']
    session['level_state'] = state
    session.modified = True
    return jsonify({
        'username': user['username'],
        'level': state['level'],
        'round_number': state['round_number'],
        'player_wins': state['player_wins'],
        'computer_wins': state['computer_wins'],
        'ties': state['ties'],
        'unlocked_level': user['unlocked_level'],
        'max_level': MAX_LEVEL,
        'round_limit': ROUND_LIMIT,
        'message': state['message']
    })


@app.route('/api/play', methods=['POST'])
def play():
    user = get_logged_in_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    player_choice = data.get('choice')
    if player_choice not in CHOICES:
        return jsonify({'error': 'Invalid choice. Must be snake, water, or gun.'}), 400

    state = get_level_progress()
    current_level = user['current_level']
    if current_level > MAX_LEVEL:
        current_level = MAX_LEVEL

    if state['round_number'] >= ROUND_LIMIT:
        state['status'] = 'locked'
        state['message'] = 'This level has already been completed. Please continue to the next unlocked level.'
        session['level_state'] = state
        session.modified = True
        return jsonify({
            'player_choice': player_choice,
            'computer_choice': None,
            'result': 'locked',
            'score': {'win': state['player_wins'], 'lose': state['computer_wins'], 'tie': state['ties']},
            'history': [],
            'level_status': state['status'],
            'level': current_level,
            'round_number': state['round_number'],
            'message': state['message'],
            'unlocked_level': user['unlocked_level']
        })

    history = session.get('history', [])
    computer_choice = compute_computer_choice(current_level, history)
    result = get_winner(player_choice, computer_choice)

    state['round_number'] += 1
    if result == 'win':
        state['player_wins'] += 1
    elif result == 'lose':
        state['computer_wins'] += 1
    else:
        state['ties'] += 1

    round_entry = {
        'round': state['round_number'],
        'player': player_choice,
        'computer': computer_choice,
        'result': result
    }
    history.insert(0, round_entry)
    session['history'] = history[:ROUND_LIMIT]
    session['level_state'] = state
    session.modified = True

    if state['round_number'] >= ROUND_LIMIT:
        if state['player_wins'] >= 3:
            state['status'] = 'cleared'
            state['message'] = f'Level {current_level} cleared. You won this level and the next one is now unlocked.'
            next_level = min(current_level + 1, MAX_LEVEL)

            conn = get_db_connection()
            conn.execute(
                'UPDATE users SET current_level = ?, unlocked_level = ? WHERE id = ?',
                (next_level, max(user['unlocked_level'], next_level), user['id'])
            )
            conn.commit()
            conn.close()

            user['current_level'] = next_level
            user['unlocked_level'] = max(user['unlocked_level'], next_level)
            session['level_state'] = make_level_state(level=next_level)
            session.modified = True

            return jsonify({
                'player_choice': player_choice,
                'computer_choice': computer_choice,
                'result': result,
                'score': {'win': state['player_wins'], 'lose': state['computer_wins'], 'tie': state['ties']},
                'history': session['history'],
                'level_status': 'cleared',
                'level': next_level,
                'round_number': ROUND_LIMIT,
                'message': state['message'],
                'unlocked_level': user['unlocked_level'],
                'round_limit': ROUND_LIMIT,
                'next_level_unlocked': True
            })

        state['status'] = 'failed'
        state['message'] = 'Bad luck. You did not win this level. Try the level again and beat the difficulty.'
        session['level_state'] = make_level_state(level=current_level)
        session.modified = True

        return jsonify({
            'player_choice': player_choice,
            'computer_choice': computer_choice,
            'result': result,
            'score': {'win': state['player_wins'], 'lose': state['computer_wins'], 'tie': state['ties']},
            'history': session['history'],
            'level_status': 'failed',
            'level': current_level,
            'round_number': ROUND_LIMIT,
            'message': state['message'],
            'unlocked_level': user['unlocked_level'],
            'round_limit': ROUND_LIMIT,
            'next_level_unlocked': False
        })

    session['level_state'] = state
    session.modified = True
    return jsonify({
        'player_choice': player_choice,
        'computer_choice': computer_choice,
        'result': result,
        'score': {'win': state['player_wins'], 'lose': state['computer_wins'], 'tie': state['ties']},
        'history': session['history'],
        'level_status': 'playing',
        'level': current_level,
        'round_number': state['round_number'],
        'message': f'Round {state["round_number"]} of {ROUND_LIMIT}. Keep going.',
        'unlocked_level': user['unlocked_level'],
        'round_limit': ROUND_LIMIT
    })


@app.route('/api/reset', methods=['POST'])
def reset():
    user = get_logged_in_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    session['history'] = []
    reset_level_session(current_level=user['current_level'])
    return jsonify({
        'score': {'win': 0, 'lose': 0, 'tie': 0},
        'history': [],
        'level': user['current_level'],
        'message': 'Score reset. The same level has been reloaded.'
    })


@app.route('/api/select-level', methods=['POST'])
def select_level():
    user = get_logged_in_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    target_level = data.get('level')

    if target_level is None or not isinstance(target_level, int) or target_level < 1 or target_level > MAX_LEVEL:
        return jsonify({'error': 'Invalid level number. Must be between 1 and 20.'}), 400

    if target_level > user['unlocked_level']:
        return jsonify({'error': 'This level is locked. Clear previous levels first.'}), 403

    conn = get_db_connection()
    conn.execute(
        'UPDATE users SET current_level = ? WHERE id = ?',
        (target_level, user['id'])
    )
    conn.commit()
    conn.close()

    reset_level_session(current_level=target_level)
    session['history'] = []
    session.modified = True

    return jsonify({
        'success': True,
        'level': target_level,
        'message': f'Entered Level {target_level}. Fight!'
    })


@app.route('/api/stats', methods=['GET'])
def stats():
    user = get_logged_in_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    level_state = get_level_progress()
    return jsonify({
        'username': user['username'],
        'level': user['current_level'],
        'round_number': level_state.get('round_number', 0),
        'history': session.get('history', []),
        'score': {
            'win': level_state['player_wins'],
            'lose': level_state['computer_wins'],
            'tie': level_state['ties']
        },
        'unlocked_level': user['unlocked_level'],
        'round_limit': ROUND_LIMIT,
        'message': level_state.get('message', 'Choose your weapon and start the best-of-5 showdown.'),
        'level_status': level_state.get('status', 'playing')
    })


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
