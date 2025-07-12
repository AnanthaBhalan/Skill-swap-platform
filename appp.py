from flask import Flask, jsonify, request

app = Flask(__name__)

skills = [
    {'id': 1, 'name': 'Python Programming', 'category': 'Tech'},
    {'id': 2, 'name': 'Guitar Lessons', 'category': 'Music'},
    {'id': 3, 'name': 'Cooking Thai', 'category': 'Cooking'}
]

swap_requests = []

@app.route('/')
def home():
    return "Skill Swap API Running!"

@app.route('/skills', methods=['GET'])
def get_skills():
    return jsonify(skills)

@app.route('/swap_requests', methods=['POST'])
def create_swap():
    data = request.get_json()
    new_request = {
        "id": len(swap_requests) + 1,
        "from_user": data["from_user"],
        "to_user": data["to_user"],
        "skill_id": data["skill_id"],
        "status": "pending"
    }
    swap_requests.append(new_request)
    return jsonify({"message": "Swap request created", "request": new_request})

@app.route('/swap_requests', methods=['GET'])
def get_swaps():
    return jsonify(swap_requests)

if __name__ == '__main__':
    print("Starting server...")  # This will print something
    app.run(debug=True, port=5000)