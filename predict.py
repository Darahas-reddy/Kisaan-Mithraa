# Defensive imports: show a clear install hint if a package is missing
try:
    from flask import Flask, request, jsonify, send_file
    import pickle
    import numpy as np
    from PIL import Image
    import io
    import os
    from gtts import gTTS
    # --- ADDED: optional dependency for cross-origin requests
    from flask_cors import CORS
    import html  # <-- ADDED to escape source when serving as HTML
    from typing import Any
except ModuleNotFoundError as e:
    missing_pkg = str(e).split("'")[1] if "'" in str(e) else str(e)
    print(f"Error: Python package not found: {missing_pkg}")
    print("Fix: create a virtualenv and install dependencies:")
    print("  python -m venv .venv")
    print("  .venv\\Scripts\\activate  # (Windows) or: source .venv/bin/activate")
    print("  python -m pip install -r requirements.txt")
    raise SystemExit(1)

# Initialize Flask app
app = Flask(__name__)
# --- ADDED: enable CORS for all origins (adjust origins in production)
CORS(app)

# Load your trained model
MODEL_PATH = "model/plant_model.pkl"
model: Any = None

def load_model_from_file():
    """Try to load model using multiple strategies. Returns True if loaded."""
    global model
    if model is not None:
        return True

    if not os.path.exists(MODEL_PATH):
        print(f"Model file not found: {MODEL_PATH}")
        return False

    def normalize_loaded_model(m):
        """If loader returns tuple/list/dict, attempt to extract actual estimator with predict()."""
        if m is None:
            return None
        # dict with 'model' key
        if isinstance(m, dict):
            if 'model' in m and hasattr(m['model'], 'predict'):
                return m['model']
            # try any value that has predict
            for v in m.values():
                if hasattr(v, 'predict'):
                    return v
        # tuple or list: find first with predict
        if isinstance(m, (tuple, list)):
            for item in m:
                if hasattr(item, 'predict'):
                    return item
            # fallback to first element
            return m[0] if len(m) > 0 else m
        # otherwise return as-is
        return m

    # 1) Try pickle
    try:
        with open(MODEL_PATH, "rb") as f:
            loaded = pickle.load(f)
        model = normalize_loaded_model(loaded)
        if model is not None and hasattr(model, "predict"):
            print("Model loaded with pickle.")
            return True
        else:
            e_pickle_str = f"Loaded object type {type(loaded)} missing predict"
    except Exception as e_pickle:
        e_pickle_str = str(e_pickle)

    # 2) Try joblib (common for scikit-learn)
    try:
        import joblib  # optional dependency
        loaded = joblib.load(MODEL_PATH)
        model = normalize_loaded_model(loaded)
        if model is not None and hasattr(model, "predict"):
            print("Model loaded with joblib.")
            return True
        else:
            e_joblib_str = f"Loaded object type {type(loaded)} missing predict"
    except Exception as e_joblib:
        e_joblib_str = str(e_joblib)

    # 3) Try gzip + pickle (if file was compressed)
    try:
        import gzip
        with gzip.open(MODEL_PATH, "rb") as gf:
            loaded = pickle.load(gf)
        model = normalize_loaded_model(loaded)
        if model is not None and hasattr(model, "predict"):
            print("Model loaded with gzip+pickle.")
            return True
        else:
            e_gzip_str = f"Loaded object type {type(loaded)} missing predict"
    except Exception as e_gzip:
        e_gzip_str = str(e_gzip)

    # All attempts failed — print diagnostics (server logs) and leave model as None
    print("Failed to load model file. Diagnostics:")
    print(" - pickle error:", e_pickle_str)
    print(" - joblib error:", e_joblib_str)
    print(" - gzip+pickle error:", e_gzip_str)
    print("Suggested fixes:")
    print(" - Ensure model/plant_model.pkl exists and is a valid pickle or joblib file.")
    print(" - To save a scikit-learn model: use joblib.dump(model, 'model/plant_model.pkl')")
    print(" - Or use pickle: pickle.dump(model, open('model/plant_model.pkl','wb'), protocol=4)")
    return False

# Label names – modify according to your dataset classes
CLASS_NAMES = [
    "Tomato_Early_Blight",
    "Tomato_Late_Blight",
    "Tomato_Leaf_Mold",
    "Potato_Early_Blight",
    "Potato_Late_Blight"
]

# Telugu treatment dictionary
TREATMENT_DICT = {
    "Tomato_Early_Blight": "ఈ వ్యాధిని నియంత్రించడానికి కాపర్ ఫంగిసైడ్ వాడండి.",
    "Tomato_Late_Blight": "ఫంగిసైడ్ స్ప్రేలు మరియు సరిగ్గా నీరు పోసే విధానం అనుసరించండి.",
    "Tomato_Leaf_Mold": "వెంటిలేషన్ మెరుగుపరచండి మరియు ద్రావణ ఫంగిసైడ్ వాడండి.",
    "Potato_Early_Blight": "చల్లని వాతావరణం నివారించండి మరియు మెటలాక్సిల్ వాడండి.",
    "Potato_Late_Blight": "సమయానికి కాపర్ ఆక్సీక్లోరైడ్ ఫంగిసైడ్ వాడండి."
}

# Folder to save voice files (use absolute path to avoid send_file path issues)
OUTPUT_VOICE = os.path.abspath("output.mp3")


def preprocess_image(image):
    """Resize and flatten the image for model input"""
    # Match training size: 64x64 if your model was trained on that
    image = image.resize((64, 64))
    image = np.array(image).flatten().reshape(1, -1)
    return image


# --- ADDED: friendly root route to avoid "Not Found" when hitting /
@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "message": "Plant disease API is running. POST an image to /predict (form field 'image').",
        "predict": "/predict (POST, form-data: image)",
        "voice": "/voice (GET)"
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        # Ensure model is loaded
        if not load_model_from_file():
            return jsonify({
                "error": "Model not loaded. Check server logs for details and re-save a valid model at model/plant_model.pkl"
            }), 500

        # Validate input
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided. Use form field 'image'."}), 400

        file = request.files.get('image')
        if not file or file.filename == "":
            return jsonify({"error": "Empty image file."}), 400

        try:
            img = Image.open(io.BytesIO(file.read())).convert('RGB')
        except Exception as e_img:
            return jsonify({"error": f"Unable to read image: {e_img}"}), 400

        # Preprocess and predict
        processed_img = preprocess_image(img)
        # `load_model_from_file()` above ensures model is loaded; assert to help static analyzers
        assert model is not None and hasattr(model, 'predict'), "Model not loaded"
        prediction = model.predict(processed_img)[0]

        # Get Telugu treatment
        treatment_telugu = TREATMENT_DICT.get(prediction, "చికిత్స సమాచారం అందుబాటులో లేదు.")

        # Generate Telugu voice
        try:
            tts = gTTS(text=treatment_telugu, lang='te')
            tts.save(OUTPUT_VOICE)
        except Exception as e_tts:
            # Don't fail the whole request if TTS generation fails
            print("TTS generation error:", e_tts)

        # Build voice URL from how the request reached the server
        voice_url = request.host_url.rstrip("/") + "/voice"

        # Prepare response
        response = {
            "disease": str(prediction),
            "treatment_telugu": treatment_telugu,
            "voice_url": voice_url
        }

        return jsonify(response)

    except Exception as e:
        # log error server-side and return 500
        print("Predict error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/voice", methods=["GET"])
def voice():
    if os.path.exists(OUTPUT_VOICE):
        return send_file(OUTPUT_VOICE, mimetype="audio/mpeg")
    return jsonify({"error": "Voice not found"}), 404


if __name__ == "__main__":
    FLASK_PORT = int(os.environ.get("FLASK_PORT", 5000))
    # listen on all interfaces so e.g. WSL/docker/other hosts can reach it; change to '127.0.0.1' if you prefer local-only
    app.run(debug=True, host="0.0.0.0", port=FLASK_PORT)