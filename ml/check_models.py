"""Quick script to check model output shapes"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import keras.src.layers.core.dense as _dense_module  # type: ignore
_OrigInit = _dense_module.Dense.__init__
def _patched_dense_init(self, *args, **kwargs):
    kwargs.pop('quantization_config', None)
    return _OrigInit(self, *args, **kwargs)
_dense_module.Dense.__init__ = _patched_dense_init

from tensorflow.keras.models import load_model  # type: ignore

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

for name in ['fruit_model.keras', 'vegetable_model.keras', 'spices_model.keras', 'wheat_model.keras', 'pearl_model.keras']:
    path = os.path.join(MODEL_DIR, name)
    if os.path.exists(path):
        m = load_model(path, safe_mode=False)
        print(f"{name}: output_shape={m.output_shape}, num_classes={m.output_shape[-1]}")
    else:
        print(f"{name}: NOT FOUND")
