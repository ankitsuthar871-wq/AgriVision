"""
AgriVision ML Flask API Server
Loads trained Keras models (fruit, vegetable, spice, wheat, pearl)
and serves predictions via REST API.

IMPORTANT:
  - Image size: (224, 224)
  - Preprocessing: /255.0
  - Class order: must match train_data.class_indices
  
RUN WITH VENV:
  cd ml && venv\\Scripts\\python.exe app.py
  OR: run.bat
"""

import os
import sys
import json
import io
from PIL import Image as PILImage

# Fix Windows console encoding (prevents UnicodeEncodeError for emoji)
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS  # type: ignore

# Suppress TF logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# --- Check TensorFlow availability ---
try:
    from tensorflow.keras.models import load_model  # type: ignore
    from tensorflow.keras.preprocessing import image  # type: ignore
except ImportError:
    print("=" * 60)
    print("  ERROR: TensorFlow not installed!")
    print("=" * 60)
    print()
    print("  You are using:", sys.executable)
    print("  Python version:", sys.version)
    print()
    print("  TensorFlow is installed in the virtual environment.")
    print("  Please run using one of these methods:")
    print()
    print("  Method 1: Use run.bat")
    print("    > cd ml")
    print("    > run.bat")
    print()
    print("  Method 2: Use venv Python directly")
    print("    > cd ml")
    print("    > venv\\Scripts\\python.exe app.py")
    print()
    print("  Method 3: Activate venv first")
    print("    > cd ml")
    print("    > venv\\Scripts\\activate")
    print("    > python app.py")
    print()
    print("=" * 60)
    sys.exit(1)

# Monkey-patch Keras Dense to accept quantization_config (version mismatch fix)
# This patches the ACTUAL class used during deserialization, not a subclass
try:
    import keras.src.layers.core.dense as _dense_module  # type: ignore

    _OrigInit = _dense_module.Dense.__init__
    def _patched_dense_init(self, *args, **kwargs):
        kwargs.pop('quantization_config', None)
        return _OrigInit(self, *args, **kwargs)
    _dense_module.Dense.__init__ = _patched_dense_init
except Exception:
    pass

app = Flask(__name__)
CORS(app)  # type: ignore

# ============================================
# MODEL LOADING
# ============================================
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

print("Loading ML models...")

# Load all 5 models
models = {}
model_files = {
    'fruit': 'fruit_model.keras',
    'vegetable': 'vegetable_model.keras',
    'spice': 'spices_model.keras',
    'wheat': 'wheat_model.keras',
    'pearl': 'pearl_model.keras',
}

for key, filename in model_files.items():
    filepath = os.path.join(MODEL_DIR, filename)
    if os.path.exists(filepath):
        try:
            models[key] = load_model(filepath, safe_mode=False)
            print(f"  [OK] {key} model loaded: {filename} (output: {models[key].output_shape[-1]} classes)")
        except Exception as e:
            print(f"  [FAIL] Failed to load {key}: {e}")
    else:
        print(f"  ⚠️ {key} model not found: {filepath}")

# ============================================
# CLASS LABELS — MUST match train_data.class_indices
# If label count doesn't match model output, auto-generate numbered labels
# ============================================

# Try to load from a config file first
labels_file = os.path.join(MODEL_DIR, 'class_labels.json')
if os.path.exists(labels_file):
    with open(labels_file, 'r', encoding='utf-8') as f:
        class_labels = json.load(f)
    print(f"  [OK] Class labels loaded from class_labels.json")
else:
    class_labels = {}

# Validate and fix label counts against actual model output
labels_updated = False
for key, model in models.items():
    num_classes = model.output_shape[-1]
    current_labels = class_labels.get(key, [])
    
    if len(current_labels) != num_classes:
        print(f"  [WARN] {key}: labels={len(current_labels)} != model_output={num_classes}. Auto-generating labels.")
        print(f"         >> IMPORTANT: Update ml/class_labels.json with correct class names from train_data.class_indices!")
        class_labels[key] = [f'class_{i}' for i in range(num_classes)]
        labels_updated = True
    else:
        # Check if labels are still placeholder class_X
        has_real = any(not l.startswith('class_') for l in current_labels)
        status = "real labels" if has_real else "placeholder (class_X)"
        print(f"  [OK] {key}: {num_classes} classes match ({status})")

if labels_updated:
    with open(labels_file, 'w', encoding='utf-8') as f:
        json.dump(class_labels, f, indent=2, ensure_ascii=False)
    print(f"  >> class_labels.json updated — REPLACE 'class_0', 'class_1'... with actual names!")

# Determine which models have real (non-placeholder) labels
models_with_real_labels = set()
for key in models:
    labels = class_labels.get(key, [])
    if labels and any(not l.startswith('class_') for l in labels):
        models_with_real_labels.add(key)

print(f"\nModels loaded: {list(models.keys())}")
print(f"Models with real labels: {list(models_with_real_labels)}")
print(f"Models with placeholder labels: {[k for k in models if k not in models_with_real_labels]}")


# ============================================
# PREDICTION FUNCTION
# ============================================
def predict_image(img_path, model, class_names):
    """
    Predict class from image using trained Keras model.
    SAME preprocessing as training:
      - target_size=(224,224)
      - /255.0 normalization
      - class order from train_data.class_indices
    """
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    pred = model.predict(img_array, verbose=0)
    predicted_idx = int(np.argmax(pred[0]))
    confidence = float(np.max(pred[0]))

    # Get top 3 predictions
    top3_indices = np.argsort(pred[0])[::-1][:3]
    top3 = [
        {
            'label': class_names[int(i)] if int(i) < len(class_names) else f'class_{i}',
            'confidence': float(pred[0][int(i)])
        }
        for i in top3_indices
    ]

    predicted_class = class_names[predicted_idx] if predicted_idx < len(class_names) else f'class_{predicted_idx}'

    # Calculate entropy (measures how "spread" the prediction is)
    # Low entropy = model is confident about one class
    # High entropy = model is uncertain / image doesn't belong to this category
    pred_clipped = np.clip(pred[0], 1e-10, 1.0)
    entropy = -np.sum(pred_clipped * np.log(pred_clipped))
    max_entropy = np.log(len(class_names)) if len(class_names) > 1 else 1
    normalized_entropy = entropy / max_entropy  # 0 = certain, 1 = random guess

    return {
        'predicted_class': predicted_class,
        'confidence': round(confidence * 100, 2),
        'confidence_raw': confidence,
        'top3': top3,
        'class_index': predicted_idx,
        'entropy': round(normalized_entropy, 4)
    }

# ============================================
# IMAGE PRE-FILTER — Reject non-plant images
# Runs BEFORE ML models to save compute
# ============================================
def is_plant_image(img_path):
    """
    Pre-screen image using color analysis to check if it
    likely contains plant/vegetation content.
    
    Returns: (is_plant: bool, details: dict)
    
    Logic:
      1. Count green/vegetation pixels
      2. Count brown/dry plant pixels (diseased leaves)
      3. Count skin-tone pixels (human detection)
      4. Decision rules based on ratios
    """
    try:
        img = PILImage.open(img_path).convert('RGB').resize((224, 224))
        pixels = np.array(img, dtype=np.float32)
        
        total = pixels.shape[0] * pixels.shape[1]
        r, g, b = pixels[:,:,0], pixels[:,:,1], pixels[:,:,2]
        
        # --- Vegetation Detection ---
        # Green dominant: G channel is highest and above threshold
        green_mask = (g > r) & (g > b) & (g > 50)
        green_ratio = float(np.sum(green_mask)) / total
        
        # Yellow-green (autumn/disease leaves)
        yellow_green = (r > 80) & (g > 80) & (b < 100) & (g > b * 1.2)
        yg_ratio = float(np.sum(yellow_green)) / total
        
        # Brown/dry leaves: moderate R, lower G, low B
        brown_mask = (r > 60) & (r < 200) & (g > 40) & (g < 160) & (b < 100) & (r > b * 1.3)
        brown_ratio = float(np.sum(brown_mask)) / total
        
        # Red/orange crops (tomato, chilli, fruits, diseased spots)
        red_crop_mask = (r > 120) & (r > g * 1.3) & (r > b * 1.5) & (b < 120)
        red_ratio = float(np.sum(red_crop_mask)) / total
        
        # Orange/yellow crops and fruits
        orange_mask = (r > 150) & (g > 80) & (g < 200) & (b < 80) & (r > b * 2)
        orange_ratio = float(np.sum(orange_mask)) / total
        
        # Total vegetation score (includes red/orange crops now)
        vegetation_ratio = green_ratio + yg_ratio * 0.7 + brown_ratio * 0.5 + red_ratio * 0.6 + orange_ratio * 0.5
        
        # --- Skin Detection (human faces/bodies) ---
        skin_mask = (
            (r > 95) & (g > 40) & (b > 20) &
            (r > g) & (r > b) &
            ((r - g) > 15) &
            (r < 250) & (g < 230)
        )
        skin_ratio = float(np.sum(skin_mask)) / total
        
        # --- Gray/artificial content ---
        gray_mask = (
            (np.abs(r - g) < 20) & (np.abs(g - b) < 20) & 
            (np.abs(r - b) < 20) & (r > 40) & (r < 220)
        )
        gray_ratio = float(np.sum(gray_mask)) / total
        
        # --- Decision Logic (LENIENT — let ML models decide) ---
        is_plant = True
        reason = 'OK'
        
        # Rule 1: Too much skin -> human image (strict threshold)
        if skin_ratio > 0.35 and vegetation_ratio < 0.10:
            is_plant = False
            reason = f'Too much skin ({skin_ratio:.0%}), very low vegetation ({vegetation_ratio:.0%})'
        
        # Rule 2: Almost no color variety at all (pure gray/white/black)
        elif vegetation_ratio < 0.03 and gray_ratio > 0.70:
            is_plant = False
            reason = f'No vegetation detected ({vegetation_ratio:.0%}), mostly gray ({gray_ratio:.0%})'
        
        # Rule 3: Dominant skin + no red crops (to not confuse tomatoes with skin)
        elif skin_ratio > 0.45 and red_ratio < 0.10 and green_ratio < 0.10:
            is_plant = False
            reason = f'Dominant skin tone ({skin_ratio:.0%}), no crop colors'
        
        details = {
            'green': round(green_ratio, 3),
            'yellow_green': round(yg_ratio, 3),
            'brown': round(brown_ratio, 3),
            'vegetation_total': round(vegetation_ratio, 3),
            'skin': round(skin_ratio, 3),
            'gray': round(gray_ratio, 3),
            'reason': reason
        }
        
        status = '\u2705 PLANT' if is_plant else '\u274c NOT PLANT'
        print(f"  \U0001f33f Image Filter: veg={vegetation_ratio:.1%} skin={skin_ratio:.1%} gray={gray_ratio:.1%} -> {status} ({reason})")
        
        return is_plant, details
        
    except Exception as e:
        print(f"  \u26a0\ufe0f Image filter error: {e}")
        return True, {'error': str(e), 'reason': 'Filter error - allowing through'}


# ============================================
# API ENDPOINTS
# ============================================

@app.route('/health', methods=['GET'])
def health():
    """Health check — Node.js server checks this on startup"""
    return jsonify({
        'status': 'ok',
        'models_loaded': list(models.keys()),
        'total_models': len(models),
        'models_with_real_labels': list(models_with_real_labels),
        'categories': {k: len(v) for k, v in class_labels.items()}
    })


@app.route('/predict', methods=['POST'])
def predict_api():
    """
    Main prediction endpoint.
    Accepts: multipart form with 'image' file and 'category' field.
    category: 'fruit', 'vegetable', 'spice', 'wheat', 'pearl', or 'auto'
    
    PROFESSIONAL TWO-STAGE STRATEGY:
    ─────────────────────────────────
    Stage 1: CROP IDENTIFICATION
      - Run category models (fruit, vegetable, spice) to identify WHAT crop
      - These models tell us: "This is a Tomato" / "This is a Mango"
    
    Stage 2: DISEASE DETECTION
      - Run disease models (wheat, pearl) to detect specific diseases
      - These ONLY apply if the crop is actually wheat or bajra
      - For all other crops → recommend Gemini AI for disease analysis
    
    This prevents random outputs like "wheat Leaf_Rust" for a tomato image.
    """
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided'}), 400

    file = request.files['image']
    category = request.form.get('category', 'auto').lower().strip()

    # Save temp file
    temp_dir = os.path.join(MODEL_DIR, 'temp')
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, 'temp_predict.jpg')
    file.save(file_path)

    try:
        if category == 'auto':
            # ==========================================
            # STEP 0: PRE-FILTER — Check if image is a plant
            # ==========================================
            is_plant_img, filter_details = is_plant_image(file_path)
            
            if not is_plant_img:
                print(f"  🚫 Image rejected by pre-filter: {filter_details['reason']}")
                return jsonify({
                    'success': True,
                    'category': None,
                    'prediction': 'NOT_A_PLANT',
                    'confidence': 0,
                    'confidence_raw': 0,
                    'top3': [],
                    'model_used': None,
                    'isPlant': False,
                    'filter_details': filter_details,
                    'all_results': {},
                    'action': 'rejected'
                })
            
            # ==========================================
            # STAGE 1: Run ALL 5 models on the image
            # ==========================================
            all_results = {}
            category_results = []   # fruit, vegetable, spice
            disease_results = []    # wheat, pearl
            
            print(f"\n  🔄 Running all {len(models)} models...")
            
            for cat_key in models:
                if cat_key not in class_labels:
                    continue
                try:
                    result = predict_image(file_path, models[cat_key], class_labels[cat_key])
                    
                    # Calculate quality score: confidence * (1 - entropy)
                    score = result['confidence_raw'] * (1 - result['entropy'] * 0.5)
                    
                    entry = {
                        'key': cat_key,
                        'result': result,
                        'score': score
                    }
                    
                    all_results[cat_key] = {
                        'prediction': result['predicted_class'],
                        'confidence': result['confidence'],
                        'confidence_raw': result['confidence_raw'],
                        'entropy': result['entropy'],
                        'score': round(score, 4),
                        'top3': result['top3'][:3]
                    }
                    
                    # Separate into category vs disease models
                    if cat_key in ('wheat', 'pearl'):
                        disease_results.append(entry)
                        print(f"    🏥 [{cat_key}] {result['predicted_class']} ({result['confidence']}%) entropy={result['entropy']} score={score:.4f}")
                    else:
                        category_results.append(entry)
                        print(f"    🌿 [{cat_key}] {result['predicted_class']} ({result['confidence']}%) entropy={result['entropy']} score={score:.4f}")
                    
                except Exception as e:
                    print(f"  ⚠️ Error predicting with {cat_key}: {e}")
                    continue
            
            if not category_results and not disease_results:
                return jsonify({
                    'success': False,
                    'error': 'No model could process this image',
                    'isPlant': False
                }), 500
            
            # ==========================================
            # STAGE 2: SMART DECISION LOGIC
            # ==========================================
            
            # Sort each group by score (highest first)
            category_results.sort(key=lambda x: x['score'], reverse=True)
            disease_results.sort(key=lambda x: x['score'], reverse=True)
            
            # Best from each group
            best_category = category_results[0] if category_results else None
            best_disease = disease_results[0] if disease_results else None
            
            # ─────────────────────────────────────────
            # DECISION RULES:
            # Category models ALWAYS identify the crop first.
            # Disease models ONLY used if category = wheat/bajra.
            # This prevents the overtrained wheat model from 
            # claiming every green image is "Leaf_Rust 99%".
            # ─────────────────────────────────────────
            
            action = 'gemini'  # default: let Gemini handle
            final_cat = None
            final_result = None
            identified_crop = None
            
            # STEP A: Use category models to identify WHAT crop this is
            if best_category:
                cr = best_category['result']
                identified_crop = cr['predicted_class']
                
                # Check if the identified crop matches a disease model's domain
                wheat_keywords = ['wheat', 'gehu', 'gehun']
                bajra_keywords = ['bajra', 'pearl', 'millet']
                
                crop_lower = identified_crop.lower()
                
                if any(kw in crop_lower for kw in wheat_keywords):
                    # Category model identified wheat → use wheat disease model
                    wheat_entry = next((d for d in disease_results if d['key'] == 'wheat'), None)
                    if wheat_entry and wheat_entry['result']['confidence_raw'] > 0.50:
                        action = 'ml_disease'
                        final_cat = 'wheat'
                        final_result = wheat_entry['result']
                        print(f"  🌾 Category confirmed wheat → disease: {final_result['predicted_class']} ({final_result['confidence']}%)")
                    else:
                        # Wheat identified but disease model unsure → Gemini
                        action = 'gemini_with_crop_id'
                        final_cat = best_category['key']
                        final_result = cr
                        print(f"  🌾 Category says wheat but disease model uncertain → Gemini")
                
                elif any(kw in crop_lower for kw in bajra_keywords):
                    # Category model identified bajra → use pearl disease model
                    pearl_entry = next((d for d in disease_results if d['key'] == 'pearl'), None)
                    if pearl_entry and pearl_entry['result']['confidence_raw'] > 0.50:
                        action = 'ml_disease'
                        final_cat = 'pearl'
                        final_result = pearl_entry['result']
                        print(f"  🌾 Category confirmed bajra → disease: {final_result['predicted_class']} ({final_result['confidence']}%)")
                    else:
                        action = 'gemini_with_crop_id'
                        final_cat = best_category['key']
                        final_result = cr
                        print(f"  🌾 Category says bajra but disease model uncertain → Gemini")
                
                else:
                    # Not wheat/bajra → use category identification, Gemini handles disease
                    action = 'gemini_with_crop_id'
                    final_cat = best_category['key']
                    final_result = cr
                    print(f"  🌿 Identified crop: {identified_crop} (by {final_cat} model, {cr['confidence']}%) → Gemini for disease")
            
            # STEP B: No category model available (edge case) → try disease model
            elif best_disease:
                dr = best_disease['result']
                if dr['confidence_raw'] > 0.80 and dr['entropy'] < 0.15:
                    action = 'ml_disease'
                    final_cat = best_disease['key']
                    final_result = dr
                    print(f"  🏥 No category model, disease model only: {final_cat}/{dr['predicted_class']} ({dr['confidence']}%)")
                else:
                    action = 'gemini'
                    final_cat = best_disease['key']
                    final_result = dr
            
            # STEP C: Fallback
            if final_result is None:
                if best_category:
                    final_cat = best_category['key']
                    final_result = best_category['result']
                    identified_crop = final_result['predicted_class']
                elif best_disease:
                    final_cat = best_disease['key']
                    final_result = best_disease['result']
                else:
                    # Provide a safe default to satisfy type checkers
                    final_result = {
                        'predicted_class': 'unknown',
                        'confidence': 0,
                        'confidence_raw': 0,
                        'top3': [],
                        'entropy': 1.0
                    }
                action = 'gemini'
            
            # ─────────────────────────────────────────
            # BUILD RESPONSE
            # ─────────────────────────────────────────
            is_disease_model = action == 'ml_disease'
            
            print(f"  {'🏆' if is_disease_model else '📋'} FINAL: [{final_cat}] {final_result['predicted_class']} ({final_result['confidence']}%) action={action}")
            print(f"  📊 All models participated: {list(all_results.keys())}\n")
            
            return jsonify({
                'success': True,
                'category': final_cat,
                'prediction': final_result['predicted_class'],
                'confidence': final_result['confidence'],
                'confidence_raw': final_result['confidence_raw'],
                'top3': final_result['top3'],
                'model_used': final_cat,
                'isPlant': True,
                'has_real_labels': is_disease_model,
                'entropy': final_result['entropy'],
                'action': action,  # 'ml_disease', 'gemini_with_crop_id', or 'gemini'
                'identified_crop': identified_crop,  # What ML thinks the crop is
                'all_results': all_results,
                'models_used_count': len(all_results)
            })

        elif category in models and category in class_labels:
            result = predict_image(file_path, models[category], class_labels[category])
            has_real = category in models_with_real_labels
            return jsonify({
                'success': True,
                'category': category,
                'prediction': result['predicted_class'],
                'confidence': result['confidence'],
                'confidence_raw': result['confidence_raw'],
                'top3': result['top3'],
                'model_used': category,
                'has_real_labels': has_real,
                'entropy': result['entropy']
            })
        else:
            available = list(models.keys())
            return jsonify({
                'success': False,
                'error': f'Invalid category: {category}. Available: {available}'
            }), 400

    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        # Clean up temp file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass


@app.route('/models', methods=['GET'])
def list_models():
    """List all loaded models and their classes"""
    info = {}
    for key in models:
        labels = class_labels.get(key, [])
        has_real = key in models_with_real_labels
        info[key] = {
            'model_file': model_files.get(key, 'unknown'),
            'classes': labels,
            'num_classes': len(labels),
            'has_real_labels': has_real,
            'loaded': True
        }
    return jsonify(info)


# ============================================
# START SERVER
# ============================================
if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5000))
    print(f"\n🌾 AgriVision ML API running at http://localhost:{port}")
    print(f"📡 Health: http://localhost:{port}/health")
    print(f"📸 Predict: POST http://localhost:{port}/predict")
    print(f"📋 Models: http://localhost:{port}/models\n")
    app.run(host='0.0.0.0', port=port, debug=False)
