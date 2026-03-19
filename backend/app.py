from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route('/api/admin/recalculate', methods=['POST'])
def force_recalc():
    user_role = request.headers.get('X-User-Role') 
    
    if user_role != 'EXPERT':
        return jsonify({"error": "Unauthorized. Only Experts can trigger recalculation."}), 403
    
   
    return jsonify({"status": "Success", "message": "Erosion data recalculated for Agadir region."})

@app.route('/api/status', methods=['GET'])
def get_public_status():
    return jsonify({"system": "Coastal Guard IA", "database": "Connected", "version": "1.0.0"})

if __name__ == '__main__':
    app.run(debug=True)
