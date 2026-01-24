import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta, timezone


app = Flask(__name__)
CORS(app)
DB_NAME = "../locations.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/poll-logs', methods=['GET'])
def get_poll_logs():
    now = datetime.now()
    default_start = (now - timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S')
    
    start_time = request.args.get('start', default=default_start)
    end_time = request.args.get('end', default=now.strftime('%Y-%m-%d %H:%M:%S'))
    part_filter = request.args.get('part') # New filter
    limit = request.args.get('limit', default=100, type=int)
    offset = request.args.get('offset', default=0, type=int)

    # Base query
    query = "SELECT * FROM poll_logs WHERE timestamp BETWEEN ? AND ?"
    params = [start_time, end_time]

    if part_filter:
        query += " AND part_name = ?"
        params.append(part_filter)

    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    try:
        with get_db_connection() as conn:
            logs = conn.execute(query, params).fetchall()
        return jsonify({"status": "success", "count": len(logs), "data": [dict(row) for row in logs]}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
