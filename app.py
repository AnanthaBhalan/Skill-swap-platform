from flask import Flask, jsonify

# 1. Initialize the Flask application
app = Flask(__name__)

# 2. Define your hardcoded in-memory data
#    (This acts as your "database" for the hackathon)
skills = [
    {'id': 1, 'name': 'Python Programming', 'category': 'Tech', 'description': 'Learn to code in Python!'},
    {'id': 2, 'name': 'Guitar Lessons', 'category': 'Music', 'description': 'Master the guitar basics or advanced techniques.'},
    {'id': 3, 'name': 'Cooking Thai Cuisine', 'category': 'Cooking', 'description': 'Discover the flavors of Thailand with authentic recipes.'}
]

# 3. Define a simple, hardcoded user ID for demo context
#    (This will be used by the frontend to simulate a user)
current_user_id = 1

# --- API ENDPOINTS ---

# 4. API Endpoint: GET /skills
@app.route('/skills', methods=['GET'])
def get_skills():
    """
    Returns a list of all available skills.
    """
    print("Received GET /skills request") # For debugging
    return jsonify(skills)

# You can add a simple root route for testing if the server is up
@app.route('/')
def home():
    return "Skill Swap Backend is running! Try /skills"

# --- Run the application ---
if __name__ == '__main__':
    print(f"Current User ID for demo: {current_user_id}")
    app.run(debug=True, port=5000) # debug=True allows hot-reloading on code changesPython 3.13.5 (tags/v3.13.5:6cb20a2, Jun 11 2025, 16:15:46) [MSC v.1943 64 bit (AMD64)] on win32

